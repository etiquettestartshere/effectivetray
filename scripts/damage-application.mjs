import { socketID } from "./const.mjs";

/**
 * List of multiplier options as tuples containing their numeric value and rendered text.
 * @type {[number, string][]}
 */
const MULTIPLIERS = [[-1, "-1"], [0, "0"], [.25, "¼"], [.5, "½"], [1, "1"], [2, "2"]];

/**
 * Application to handle applying damage from a chat card.
 */

export default class EffectiveDAE extends dnd5e.applications.components.DamageApplicationElement {
  /**
 * Create a list entry for a single target.
 * @param {string} uuid  UUID of the token represented by this entry.
 * @returns {HTMLLIElement|void}
 */
  buildTargetListEntry(uuid) {
    const token = fromUuidSync(uuid);

    // Calculate damage to apply
    const targetOptions = this.getTargetOptions(uuid);
    const { total, active } = this.calculateDamage(token, targetOptions);

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
        <div class="calculated-damage">
          ${total}
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

  async _onApplyDamage(event) {
    console.warn("hello2323");
    event.preventDefault();
    for (const target of this.targetList.querySelectorAll("[data-target-uuid]")) {
      const token = fromUuidSync(target.dataset.targetUuid);
      const options = this.getTargetOptions(target.dataset.targetUuid);
      if (token?.isOwner) {
        await token?.applyDamage(this.damages, options);
      }
      else {
        const dmg = this.damages
        const id = target.dataset.targetUuid
        game.socket.emit(socketID, { type: "secondCase", data: { id, options, dmg } });
      };
    }
    this.querySelector(".collapsible").dispatchEvent(new PointerEvent("click", { bubbles: true, cancelable: true }));
  }
};