import { MODULE, SOCKET_ID } from "./const.mjs";
import { EffectiveTray } from "./effective-tray.mjs";

/* -------------------------------------------- */
/*  Effect Application Extension (from dnd5e)   */
/*  Refer to dnd5e for full documentation       */
/* -------------------------------------------- */

export default class EffectiveEAE extends dnd5e.applications.components.EffectApplicationElement {

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
    if (!this.effectsList || !this.targetList) {
      const div = document.createElement("div");
      div.classList.add("card-tray", "effects-tray", "collapsible");
      if (!this.open) div.classList.add("collapsed");
      div.innerHTML = `
        <label class="roboto-upper">
          <i class="fa-solid fa-bolt"></i>
          <span>${game.i18n.localize("DND5E.Effects")}</span>
          <i class="fa-solid fa-caret-down"></i>
        </label>
        <div class="collapsible-content">
          <div class="wrapper">
            <hr>
            <menu class="effects unlist"></menu>
          </div>
        </div>
      `;
      this.replaceChildren(div);
      this.effectsList = div.querySelector(".effects");
      this.buildEffectsList();
      div.querySelector(".wrapper").prepend(...this.buildTargetContainer());
      this.targetList.addEventListener("change", this._onCheckTarget.bind(this));
      div.addEventListener("click", this._handleClickHeader.bind(this));

      // Override to hide target selection if there are no targets
      if (!game.settings.get(MODULE, "allowTarget") && !game.user.isGM) {
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

  /* -------------------------------------------- */

  /** @override */
  buildTargetListEntry({ uuid, name }) {

    // Override checking isOwner
    const actor = fromUuidSync(uuid);
    if (!game.settings.get(MODULE, "allowTarget") && !actor?.isOwner) return;

    const disabled = this.targetingMode === "selected" ? " disabled" : "";
    const checked = this.targetChecked(uuid) ? " checked" : "";

    const li = document.createElement("li");
    li.classList.add("target");
    li.dataset.targetUuid = uuid;
    li.innerHTML = `
      <img class="gold-icon" alt="${name}" src="${actor.img}">
      <div class="name-stacked">
        <span class="title">${name}</span>
      </div>
      <div class="checkbox">
        <dnd5e-checkbox name="${uuid}"${checked}${disabled}></dnd5e-checkbox>
      </div>
    `;

    return li;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Handle applying an Active Effect to a Token.
   * @param {ActiveEffect5e} effect      The effect to apply.
   * @param {Actor5e} actor              The actor.
   * @returns {Promise<ActiveEffect5e>}  The created effect.
   * @protected
   */
  /** @override */
  async _applyEffectToActor(effect, actor, { effectData, concentration }) {
    const applied = EffectiveTray.applyEffectToActor(effect, actor, {effectData, concentration });
    return applied;
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking the apply effect button.
   * @param {PointerEvent} event  Triggering click event.
   * @throws {Error}              If the effect could not be applied.
   */
  /** @override */
  async _onApplyEffect(event) {
    event.preventDefault();
    const effect = this.chatMessage.getAssociatedItem()?.effects.get(event.target.closest("[data-id]")?.dataset.id);
    if (!effect) return;
    
    // Override to handle tray collapse behavior
    const tray = event.target.closest('.effects-tray');
    EffectiveTray._checkTray(tray);

    // Override to accomodate helper params
    let effectData, concentration = null;
    effectData = {
      flags: {
        dnd5e: {
          scaling: this.chatMessage.getFlag("dnd5e", "scaling"),
          spellLevel: this.chatMessage.getFlag("dnd5e", "use.spellLevel")
        }
      }
    };
    concentration = this.chatMessage.getAssociatedActor()?.effects
      .get(this.chatMessage.getFlag("dnd5e", "use.concentrationId"));

    const unownedTargets = [];
    for (const target of this.targetList.querySelectorAll("[data-target-uuid]")) {
      const actor = fromUuidSync(target.dataset.targetUuid);
      if (!actor || !target.querySelector("dnd5e-checkbox")?.checked) continue;
      try {
        if (actor.isOwner) await this._applyEffectToActor(effect, actor, { effectData, concentration });
        else {
         if (game.settings.get(MODULE, 'allowTarget')) unownedTargets.push(target.dataset.targetUuid);
        }
      } catch (err) {
        Hooks.onError("EffectApplicationElement._applyEffectToToken", err, { notify: "warn", log: "warn" });
      }
    }

    this.querySelector(".collapsible").dispatchEvent(new PointerEvent("click", { bubbles: true, cancelable: true }));

    // Unowned targets handling
    if (!game.settings.get(MODULE, 'allowTarget')) return;
    if (!game.users.activeGM) return ui.notifications.warn(game.i18n.localize("EFFECTIVETRAY.NOTIFICATION.NoActiveGMEffect"));
    const source = effect.uuid;
    const con = concentration?.id;
    const caster = this.chatMessage.getAssociatedActor().uuid;
    await game.socket.emit(SOCKET_ID, { type: "effect", data: { source, targets: unownedTargets, effectData, con, caster } });
  }
}