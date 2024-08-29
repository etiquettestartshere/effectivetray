import { MODULE } from "./const.mjs";
import { EffectiveUtils } from "./effective-utilities.mjs";

export class EffectiveTray {
  static init() {

    // Modify the effects tray
    if (!game.settings.get(MODULE, "systemDefault")) {
      Hooks.on("dnd5e.renderChatMessage", EffectiveTray._effectTray);
    };

    // Add dependent effect to a concentration effect.
    Hooks.on("createActiveEffect", EffectiveTray.#addDependent);

    // Modify the damage tray
    if (!game.settings.get(MODULE, "damageDefault")) {
      Hooks.on("dnd5e.renderChatMessage", EffectiveTray._damageTray);
    };

    // Handle expand/collapse/scroll
    Hooks.on("dnd5e.renderChatMessage", EffectiveTray._collapseHandler);
    Hooks.on("dnd5e.renderChatMessage", EffectiveTray._scrollTrays);
    const collapseSetting = game.settings.get("dnd5e", "autoCollapseChatTrays")
    if (collapseSetting === "older" || collapseSetting === "never") {
      Hooks.on("ready", EffectiveTray._readyScroll);
    };

    // Implement the system's expand/collapse logic
    Hooks.on("dnd5e.renderChatMessage", EffectiveTray._collapseTrays);

    // Misc
    Hooks.on("preCreateItem", EffectiveTray._removeTransfer);
    Hooks.on("preCreateActiveEffect", EffectiveTray._enchantmentSpellLevel);
  }

  /* -------------------------------------------- */
  /*  Tray Handling                               */
  /* -------------------------------------------- */

  /**
   * When an effect is created, if a specific user id and concentration uuid is passed,
   * add the created effect as a dependent on the concentration effect.
   * @param {ActiveEffect5e} effect     The effect that was created.
   * @param {object} operation          The creation context.
   */
  static async #addDependent(effect, operation) {
    const { userId, concentrationUuid } = operation.effectiv ?? {};
    if (game.user.id !== userId) return;
    const concentration = await fromUuid(concentrationUuid);
    if (concentration) concentration.addDependent(effect);
  }

  /**
   * Make the effects tray effective
   * @param {ChatMessage5e} message The message on which the tray resides.
   * @param {HTMLElement} html      HTML contents of the message.
   * Methods lacking documentation below share these parameters.
   */
  static async _effectTray(message, html) {
    await new Promise(r => setTimeout(r, 108));
    const item = message.getAssociatedItem();
    if (!item) return;
    let effects;
    if (this.getFlag("dnd5e", "type") === "usage") {
      effects = message?.getFlag("dnd5e", "use.effects")?.map(id => item?.effects.get(id))
    } else {
      effects = item?.effects.filter(e => (e.type !== "enchantment") && !e.getFlag("dnd5e", "rider"));
    } 
    effects = effects?.filter(e => !e.transfer);
    if (!effects?.length || foundry.utils.isEmpty(effects)) return;
    if (!effects.some(e => e.flags?.dnd5e?.type !== "enchantment")) return;
    const actor = item.parent;

    // Handle filtering
    if (game.settings.get(MODULE, "ignoreNPC") && actor?.type === "npc" && !actor?.isOwner) return;
    const filterDis = game.settings.get(MODULE, "filterDisposition");
    if (filterDis) {
      const token = game.scenes?.get(message.speaker?.scene)?.tokens?.get(message.speaker?.token);
      if (token && filterDis === 3 && token.disposition <= 0 && !token?.isOwner) return;
      else if (token && filterDis === 2 && token.disposition <= -1 && !token?.isOwner) return;
      else if (token && filterDis === 1 && token.disposition <= -2 && !token?.isOwner) return;
    }
    const filterPer = game.settings.get(MODULE, "filterPermission");
    if (filterPer) {
      if (filterPer === 1 && !actor?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)) return;
      else if (filterPer === 2 && !actor?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)) return;
    }

    // Replace the effects tray
    const tray = html.querySelector('.effects-tray');
    if (tray) tray.remove();
    const effectApplication = document.createElement("effective-effect-application");
    effectApplication.classList.add("dnd5e2");
    effectApplication.effects = effects;
    html.querySelector(".message-content").appendChild(effectApplication);
  }

  /**
 * Make the damage tray effective
 * @param {ChatMessage5e} message The message on which the tray resides.
 * @param {HTMLElement} html      HTML contents of the message.
 * Methods lacking documentation below share these parameters.
 */
  static _damageTray(message, html) {
    if (message.rolls.some(r => r instanceof CONFIG.Dice.DamageRoll)) {
      if (!game.user.isGM) {
        if (message.whisper.length && !message.whisper.includes(game.user.id)) return;
        const damageApplication = document.createElement("effective-damage-application");
        damageApplication.classList.add("dnd5e2");
        damageApplication.damages = dnd5e.dice.aggregateDamageRolls(message.rolls, { respectProperties: true }).map(roll => ({
          value: roll.total,
          type: roll.options.type,
          properties: new Set(roll.options.properties ?? [])
        }));
        html.querySelector(".message-content").appendChild(damageApplication);
      };
    };
  }

  /**
   * Adapted from dnd5e
   * Handle collapsing or expanding trays depending on user settings.
   * @param {HTMLElement} html  Rendered contents of the message.
   */
  static async _collapseTrays(message, html) {
    await new Promise(r => setTimeout(r, 110));
    let collapse;
    switch (game.settings.get("dnd5e", "autoCollapseChatTrays")) {
      case "always": collapse = true; break;
      case "never": collapse = false; break;
      // Collapse chat message trays older than 5 minutes
      case "older": collapse = message.timestamp < Date.now() - (5 * 60 * 1000); break;
    };
    for (const tray of html.querySelectorAll(".card-tray, .effects-tray")) {
      tray.classList.toggle("collapsed", collapse);
    };
    for (const element of html.querySelectorAll("effective-damage-application, effective-effect-application")) {

      element.toggleAttribute("open", !collapse);
    };
  }

  // Handle damage tray collapse behavior
  static async _collapseHandler(message, html) {
    await new Promise(r => setTimeout(r, 108));
    const tray = html.querySelector('.damage-tray') || html.querySelector('.effects-tray');
    if (!tray) return;
    const button = tray.querySelector("button.apply-damage") || tray.querySelector("button.apply-effect");
    button.addEventListener('click', (event) => {
      if (game.settings.get(MODULE, "dontCloseOnPress")) {
        event.preventDefault();
        tray.classList.remove("collapsed");
        tray.classList.add("et-uncollapsed");
      } else {
        if (html.querySelector(".card-tray.et-uncollapsed")) tray.classList.toggle("et-uncollapsed");
      };
    });
    const upper = tray?.querySelector(".roboto-upper");
    upper.addEventListener('click', () => {
      if (html.querySelector(".et-uncollapsed")) {
        tray.classList.toggle("et-uncollapsed");
        tray.classList.remove("collapsed");
      };
    });
  }

  // Check and see if the damage tray needs to be scrolled
  static async _scrollTrays(message, html) {
    if (!game.settings.get(MODULE, "scrollOnExpand")) return;
    await new Promise(r => setTimeout(r, 112));
    const tray = html.querySelector('.damage-tray') || html.querySelector('.effects-tray');
    const upper = tray?.querySelector(".roboto-upper");
    if (upper) {
      const mid = message.id;
      upper.addEventListener('click', () => {
        if (html.querySelector(".card-tray.collapsed")) EffectiveUtils._scroll(mid);
      });
    };
  }

  // Scroll chat to bottom on ready if any trays have been expanded
  static async _readyScroll() {
    await new Promise(r => setTimeout(r, 108));
    window.ui.chat.scrollBottom({ popout: true });
  }

  /* -------------------------------------------- */
  /*  Misc. Methods                               */
  /* -------------------------------------------- */

  /**
   * Remove transfer from all effects with duration
   * @param {Item} item The item from which to remove "transfer": true.
   */
  static _removeTransfer(item) {
    if (!game.settings.get(MODULE, "removeTransfer")) return;
    const effects = item.effects.contents;
    if (!effects) return;
    for (const effect of effects) {
      const transfer = effect.transfer;
      const duration = effect.duration;
      if (transfer && (duration.seconds || duration.turns || duration.rounds)) {
        effect.updateSource({ "transfer": false });
      };
    };
  }

  /**
   * Before an effect is created, if it is an enchantment from a spell,
   * add a flag indicating the level of the spell.
   * @param {ActiveEffect5e} effect     The effect that will be created.
   */
  static async _enchantmentSpellLevel(effect, data, options) {
    if (!effect.isAppliedEnchantment) return;
    const msg = game.messages.get(options.chatMessageOrigin);
    const lvl = msg.flags?.dnd5e?.use?.spellLevel;
    if (!lvl) return;
    let spellLevel;
    if (lvl === 0) spellLevel = 0;
    else spellLevel = parseInt(lvl) || null;
    const flags = effect.flags.dnd5e;
    const newFlags = foundry.utils.mergeObject(flags, { "spellLevel": spellLevel });
    effect.updateSource({ "flags.dnd5e": newFlags });
  }
}