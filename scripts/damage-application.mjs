import { socketID } from "./const.mjs";

  /* -------------------------------------------- */
  /*  Damage Application Extension (from dnd5e)   */
  /* -------------------------------------------- */

const MULTIPLIERS = [[-1, "-1"], [0, "0"], [.25, "¼"], [.5, "½"], [1, "1"], [2, "2"]];

export default class EffectiveDAE extends dnd5e.applications.components.DamageApplicationElement {

  buildTargetListEntry(uuid) {
    const token = fromUuidSync(uuid);

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
    event.preventDefault();
    for (const target of this.targetList.querySelectorAll("[data-target-uuid]")) {
      const token = fromUuidSync(target.dataset.targetUuid);
      const options = this.getTargetOptions(target.dataset.targetUuid);
      if (token?.isOwner) {
        await token?.applyDamage(this.damages, options);
      }
      else {
        const damageData = []
        for (const d of this.damages) {
          const damage = {}
          foundry.utils.mergeObject(damage, {
            properties: Array.from(d.properties),
            type: d.type,
            value: d.value
          });
          damageData.push(damage);
        };
        const id = target.dataset.targetUuid;
        game.socket.emit(socketID, { type: "damage", data: { id, options, damageData } });
      };
    }
    this.querySelector(".collapsible").dispatchEvent(new PointerEvent("click", { bubbles: true, cancelable: true }));
  }
};