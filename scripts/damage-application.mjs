import { MODULE, socketID } from "./const.mjs";

/* -------------------------------------------- */
/*  Functions                                   */
/* -------------------------------------------- */

/**
 * Check targets for ownership when determining which target selection mode to use.
 * @param {Array} targets  Array of objects with target data, including UUID.
 * @returns {boolean}
 */
async function ownershipCheck(targets) {
  for (const target of targets) {
    const token = await fromUuid(target.uuid);
    if (token?.isOwner) return true;
    else continue;
  };
  return false;
}

/* -------------------------------------------- */
/*  Damage Application Extension (from dnd5e)   */
/*  Refer to dnd5e for full documentation       */
/* -------------------------------------------- */

const MULTIPLIERS = [[-1, "-1"], [0, "0"], [.25, "¼"], [.5, "½"], [1, "1"], [2, "2"]];

export default class EffectiveDAE extends dnd5e.applications.components.DamageApplicationElement {

  /**
   * Determine which target selection mode to use based on damageTarget setting state.
   */
  /** @override */
  async connectedCallback() {
    // Fetch the associated chat message
    const messageId = this.closest("[data-message-id]")?.dataset.messageId;
    this.chatMessage = game.messages.get(messageId);
    if (!this.chatMessage) return;

    // Build the frame HTML only once
    if (!this.targetList) {
      const div = document.createElement("div");
      div.classList.add("card-tray", "damage-tray", "collapsible");
      if (!this.open) div.classList.add("collapsed");
      div.innerHTML = `
        <label class="roboto-upper">
          <i class="fa-solid fa-heart-crack"></i>
          <span>${game.i18n.localize("DND5E.Apply")}</span>
          <i class="fa-solid fa-caret-down"></i>
        </label>
        <div class="collapsible-content">
          <div class="wrapper">
            <div class="target-source-control">
              <button type="button" class="unbutton" data-mode="targeted" aria-pressed="false">
                <i class="fa-solid fa-bullseye" inert></i> ${game.i18n.localize("DND5E.Tokens.Targeted")}
              </button>
              <button type="button" class="unbutton" data-mode="selected" aria-pressed="false">
                <i class="fa-solid fa-expand" inert></i> ${game.i18n.localize("DND5E.Tokens.Selected")}
              </button>
            </div>
            <ul class="targets unlist"></ul>
            <button class="apply-damage" type="button" data-action="applyDamage">
              <i class="fa-solid fa-reply-all fa-flip-horizontal" inert></i>
              ${game.i18n.localize("DND5E.Apply")}
            </button>
          </div>
        </div>
      `;
      this.replaceChildren(div);
      this.applyButton = div.querySelector(".apply-damage");
      this.applyButton.addEventListener("click", this._onApplyDamage.bind(this));
      this.targetList = div.querySelector(".targets");
      this.targetSourceControl = this.querySelector(".target-source-control");
      this.targetSourceControl.querySelectorAll("button").forEach(b =>
        b.addEventListener("click", this._onChangeTargetMode.bind(this))
      );
      if (!this.chatMessage.getFlag("dnd5e", "targets")?.length) this.targetSourceControl.hidden = true;
      if (!game.settings.get(MODULE, "damageTarget")) {
        const targets = this.chatMessage.getFlag("dnd5e", "targets");
        if (!await ownershipCheck(targets)) this.targetSourceControl.hidden = true;
      };
      div.addEventListener("click", this._handleClickHeader.bind(this));
    }

    this.targetingMode = this.targetSourceControl.hidden ? "selected" : "targeted";
  }

  /**
   * Create a list entry for a single target.
   * @param {string} uuid  UUID of the token represented by this entry.
   * Extends this method to remove checking for token owner.
   */
  /** @override */
  buildTargetListEntry(uuid) {
    const token = fromUuidSync(uuid);

    // Calculate damage to apply
    const targetOptions = this.getTargetOptions(uuid);
    const { temp, total, active } = this.calculateDamage(token, targetOptions);

    const types = [];
    for (const [change, values] of Object.entries(active)) {
      for (const type of values) {
        const config = CONFIG.DND5E.damageTypes[type] ?? CONFIG.DND5E.healingTypes[type];
        if (!config) continue;
        const data = { type, change, icon: config.icon };
        types.push(data);
      }
    }
    const changeSources = types.reduce((acc, { type, change, icon }) => {
      const { label, pressed } = this.getChangeSourceOptions(type, change, targetOptions);
      acc += `
        <button class="change-source unbutton" type="button" data-type="${type}" data-change="${change}"
                data-tooltip="${label}" aria-label="${label}" aria-pressed="${pressed}">
          <dnd5e-icon src="${icon}" inert></dnd5e-icon>
          <i class="fa-solid fa-slash" inert></i>
          <i class="fa-solid fa-arrow-turn-down" inert></i>
        </button>
      `;
      return acc;
    }, "");

    const li = document.createElement("li");
    li.classList.add("target");
    li.dataset.targetUuid = uuid;
    li.innerHTML = `
      <img class="gold-icon" alt="${token.name}" src="${token.img}">
      <div class="name-stacked">
        <span class="title">${token.name}</span>
        ${changeSources ? `<span class="subtitle">${changeSources}</span>` : ""}
      </div>
      <div class="calculated damage">
        ${total}
      </div>
      <div class="calculated temp" data-tooltip="DND5E.HitPointsTemp">
        ${temp}
      </div>
      <menu class="damage-multipliers unlist"></menu>
    `;

    const menu = li.querySelector("menu");
    for (const [value, display] of MULTIPLIERS) {
      const entry = document.createElement("li");
      entry.innerHTML = `
        <button class="multiplier-button" type="button" value="${value}">
          <span>${display}</span>
        </button>
      `;
      menu.append(entry);
    }

    this.refreshListEntry(token, li, targetOptions);
    li.addEventListener("click", this._onChangeOptions.bind(this));

    return li;
  }

  /**
   * Handle clicking the apply damage button.
   * @param {PointerEvent} event  Triggering click event.
   * Extends this method to emit a request for the active GM client to damage a non-owned actor.
   * Special handling is required for the Set `this.damages.properties`.
   */
  /** @override */
  async _onApplyDamage(event) {
    event.preventDefault();
    for (const target of this.targetList.querySelectorAll("[data-target-uuid]")) {
      const id = target.dataset.targetUuid;
      const token = fromUuidSync(id);
      const options = this.getTargetOptions(id);
      if (token?.isOwner) {
        await token?.applyDamage(this.damages, options);
      }
      else {

        // Convert damage properties to an Array for socket emission
        if (!game.users.activeGM) return ui.notifications.warn(game.i18n.localize("EFFECTIVETRAY.NOTIFICATION.NoActiveGMDamage"));
        const damage = [];
        foundry.utils.deepClone(this.damages).forEach(d => {
          foundry.utils.mergeObject(d, { properties: Array.from(d.properties) });
          damage.push(d);
        });
        const opts = foundry.utils.deepClone(options);
        if (opts?.downgrade) foundry.utils.mergeObject(opts, { downgrade: Array.from(opts.downgrade) });
        if (opts?.ignore?.immunity) foundry.utils.mergeObject(opts, { "ignore.immunity": Array.from(opts.ignore.immunity) });
        if (opts?.ignore?.resistance) foundry.utils.mergeObject(opts, { "ignore.resistance": Array.from(opts.ignore.resistance) });
        if (opts?.ignore?.vulnerability) foundry.utils.mergeObject(opts, { "ignore.vulnerability": Array.from(opts.ignore.vulnerability) });
        if (opts?.ignore?.modification) foundry.utils.mergeObject(opts, { "ignore.modification": Array.from(opts.ignore.modification) });
        await game.socket.emit(socketID, { type: "damage", data: { id, opts, damage } });
      };
    }
    this.open = false;
  }
}