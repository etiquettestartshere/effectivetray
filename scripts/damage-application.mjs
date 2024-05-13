import { socketID } from "./const.mjs";

  /* -------------------------------------------- */
  /*  Damage Application Extension (from dnd5e)   */
  /*  Refer to dnd5e for full documentation             */
  /* -------------------------------------------- */

const MULTIPLIERS = [[-1, "-1"], [0, "0"], [.25, "¼"], [.5, "½"], [1, "1"], [2, "2"]];

export default class EffectiveDAE extends dnd5e.applications.components.DamageApplicationElement {

  /**
  * Create a list entry for a single target.
  * @param {string} uuid  UUID of the token represented by this entry.
  * Extends this method to remove checking for token owner.
  */
  buildTargetListEntry(uuid) {
    const token = fromUuidSync(uuid);

    // Calculate damage to apply
    const targetOptions = this.getTargetOptions(uuid);
    const { temp, total, active } = this.calculateDamage(token, targetOptions);

    const types = [];
    for ( const [change, values] of Object.entries(active) ) {
      for ( const type of values ) {
        const config = CONFIG.DND5E.damageTypes[type] ?? CONFIG.DND5E.healingTypes[type];
        if ( !config ) continue;
        const data = { type, change, icon: config.icon };
        types.push(data);
      }
    }
    const changeSources = types.reduce((acc, {type, change, icon}) => {
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
    for ( const [value, display] of MULTIPLIERS ) {
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
        const damage = [];

        // Convert damage properties to an Array for socket emission
        this.damages.forEach(d => {
          foundry.utils.mergeObject(d, { properties: Array.from(d.properties) });
          damage.push(d);
        });
        if (!game.users.activeGM) return ui.notifications.warn(game.i18n.localize("EFFECTIVETRAY.NOTIFICATION.NoActiveGMDamage"));
        await game.socket.emit(socketID, { type: "damage", data: { id, options, damage } });
      };
    }
    this.open = false;
  }
};