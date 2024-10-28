import { MODULE, SOCKET_ID } from "./const.mjs";
import { EffectiveTray } from "./effective-tray.mjs";

/* -------------------------------------------- */
/*  Damage Application Extension (from dnd5e)   */
/*  Refer to dnd5e for full documentation       */
/* -------------------------------------------- */

const MULTIPLIERS = [[-1, "-1"], [0, "0"], [.25, "¼"], [.5, "½"], [1, "1"], [2, "2"]];

export default class EffectiveDAE extends dnd5e.applications.components.DamageApplicationElement {

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  connectedCallback() {
    // Fetch the associated chat message
    const messageId = this.closest("[data-message-id]")?.dataset.messageId;
    this.chatMessage = game.messages.get(messageId);
    if (!this.chatMessage) return;

    // Build the frame HTML only once
    if (!this.targetList) {
      const div = document.createElement("div");
      div.classList.add("card-tray", "damage-tray", "collapsible", "effective-tray");
      if (!this.open) div.classList.add("collapsed");
      div.innerHTML = `
        <label class="roboto-upper">
          <i class="fa-solid fa-heart-crack"></i>
          <span>${game.i18n.localize("DND5E.Apply")}</span>
          <i class="fa-solid fa-caret-down"></i>
        </label>
        <div class="collapsible-content">
          <div class="wrapper">
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
      div.querySelector(".wrapper").prepend(...this.buildTargetContainer());
      div.addEventListener("click", this._handleClickHeader.bind(this));

      // Override to hide target selection if there are no targets
      if (!game.settings.get(MODULE, "damageTarget")) {
        const targets = this.chatMessage.getFlag("dnd5e", "targets");
        const ownership = EffectiveTray.ownershipCheck(targets);
        if (!ownership) this.targetSourceControl.hidden = true;
      };
    }

    this.targetingMode = this.targetSourceControl.hidden ? "selected" : "targeted";

    //Handle scrolling
    if (!game.settings.get(MODULE, "scrollOnExpand")) return;
    let delay = true;
    EffectiveTray._scroll(messageId, delay);
  }

  /** @override */
  buildTargetListEntry({ uuid, name }) {

    // Override checking isOwner
    const actor = fromUuidSync(uuid);
    if (!game.settings.get(MODULE, "damageTarget") && !actor?.isOwner) return;

    // Calculate damage to apply
    const targetOptions = this.getTargetOptions(uuid);
    const { temp, total, active } = this.calculateDamage(actor, targetOptions);

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
      <img class="gold-icon" alt="${name}" src="${actor.img}">
      <div class="name-stacked">
        <span class="title">${name}</span>
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

    this.refreshListEntry(actor, li, targetOptions);
    li.addEventListener("click", this._onChangeOptions.bind(this));

    return li;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

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

        // Override to convert damage properties to an Array for socket emission
        if (!game.settings.get(MODULE, 'damageTarget')) return;
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
        await game.socket.emit(SOCKET_ID, { type: "damage", data: { id, opts, damage } });
      };
    }
    this.open = false;
  }
}