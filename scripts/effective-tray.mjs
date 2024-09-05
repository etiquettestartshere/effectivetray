import { MODULE } from "./const.mjs";

export class EffectiveTray {
  static init() {

    // Modify the effects tray
    if (!game.settings.get(MODULE, "systemDefault")) {
      EffectiveTray._effectTrayOverride();
    };

    // Add dependent effect to a concentration effect.
    Hooks.on("createActiveEffect", EffectiveTray.#addDependent);

    // Modify the damage tray
    if (!game.settings.get(MODULE, "damageDefault")) {
      Hooks.on("dnd5e.renderChatMessage", EffectiveTray._damageTray);
    };

    // Handle expand/collapse/scroll
    Hooks.on("dnd5e.renderChatMessage", EffectiveTray._collapseHandler);

    // Handle the system's expand/collapse logic
    Hooks.on("dnd5e.renderChatMessage", EffectiveTray._collapseTrays);
    const collapseSetting = game.settings.get("dnd5e", "autoCollapseChatTrays")
    if (collapseSetting === "older" || collapseSetting === "never") {
      Hooks.on("ready", EffectiveTray._readyScroll);
    };

    // Misc
    Hooks.on("preCreateItem", EffectiveTray._removeTransfer);
    Hooks.on("preCreateActiveEffect", EffectiveTray._enchantmentSpellLevel);
  }

  /* -------------------------------------------- */
  /*  Tray Handling                               */
  /* -------------------------------------------- */

  static _effectTrayOverride() {
    const cls = dnd5e.documents.ChatMessage5e;
    class enricher extends cls {

      /**
       * Override the display of the effects tray with effects the user can apply.
       * Refer to dnd5e for full documentation.
       * @param {HTMLLiElement} html  The chat card.
       * @protected
       */
      /** @override */
      _enrichUsageEffects(html) {
        const message = this;
        const item = message.getAssociatedItem();
        if (!item) return;
        let effects;
        if (message.getFlag("dnd5e", "messageType") === "usage") {
          effects = message?.getFlag("dnd5e", "use.effects")?.map(id => item?.effects.get(id))
        } else {
          effects = item?.effects.filter(e => (e.type !== "enchantment") && !e.getFlag("dnd5e", "rider"));
        }
        effects = effects?.filter(e => !e.transfer);
        if (!effects?.length || foundry.utils.isEmpty(effects)) return;
        if (!effects.some(e => e.flags?.dnd5e?.type !== "enchantment")) return;
        const actor = message.getAssociatedActor();

        // Handle filtering
        if (game.settings.get(MODULE, "ignoreNPC") && actor?.type === "npc" && !actor?.isOwner) return;
        const filterDis = game.settings.get(MODULE, "filterDisposition");
        if (filterDis) {
          const token = game.scenes?.get(message.speaker?.scene)?.tokens?.get(message.speaker?.token);
          if (token && filterDis === 3 && token.disposition <= CONST.TOKEN_DISPOSITIONS.NEUTRAL && !token?.isOwner) return;
          else if (token && filterDis === 2 && token.disposition <= CONST.TOKEN_DISPOSITIONS.HOSTILE && !token?.isOwner) return;
          else if (token && filterDis === 1 && token.disposition <= CONST.TOKEN_DISPOSITIONS.SECRET && !token?.isOwner) return;
        }
        const filterPer = game.settings.get(MODULE, "filterPermission");
        if (filterPer) {
          if (filterPer === 1 && !actor?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)) return;
          else if (filterPer === 2 && !actor?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)) return;
          else if (filterPer === 3 && !actor?.isOwner) return;
          else if (filterPer === 4 && !game.user.isGM) return;
        }

        // Replace the effects tray
        const effectApplication = document.createElement("effective-effect-application");
        effectApplication.classList.add("dnd5e2");
        effectApplication.effects = effects;
        return html.querySelector(".message-content").appendChild(effectApplication);
      }
    }
    cls.prototype._enrichUsageEffects = enricher.prototype._enrichUsageEffects;
  }

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
   * Add the damage tray for players.
   * @param {ChatMessage5e} message The message on which the tray resides.
   * @param {HTMLElement} html      HTML contents of the message.
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
   * Handle expand/collapse/scroll.
   * @param {ChatMessage5e} message The message on which the tray resides.
   * @param {HTMLElement} html      HTML contents of the message.
   */
  static async _collapseHandler(message, html) {
    await new Promise(r => setTimeout(r, 10));

    // Handle tray collapse behavior
    const tray = html.querySelector('.card-tray');
    if (!tray) return;
    const button = tray.querySelector("button.apply-damage") || tray.querySelector("button.apply-effect");
    if (button) button.addEventListener('click', (event) => {
      if (game.settings.get(MODULE, "dontCloseOnPress")) {
        event.preventDefault();
        tray.classList.remove("collapsed");
        tray.classList.add("et-uncollapsed");
      } else {
        if (html.querySelector(".card-tray.et-uncollapsed")) tray.classList.toggle("et-uncollapsed");
      };
    });
    const upper = tray?.querySelector(".roboto-upper");
    const el = html.querySelector('effective-damage-application, damage-application, effective-effect-application, effect-application');
    upper.addEventListener('click', () => {
      if (html.querySelector(".et-uncollapsed")) {
        tray.classList.toggle("et-uncollapsed");
        tray.classList.remove("collapsed");
        el.toggleAttribute("open");
      };
    });

    // Check and see if the damage tray needs to be scrolled
    if (!game.settings.get(MODULE, "scrollOnExpand")) return;
    if (upper) {
      const mid = message.id;
      upper.addEventListener('click', () => {
        if (html.querySelector(".card-tray.collapsed")) EffectiveTray._scroll(mid);
      });
    };
  }

  /**
   * Adapted from dnd5e
   * Handle collapsing or expanding trays depending on user settings.
   * @param {HTMLElement} html  Rendered contents of the message.
   */
  static async _collapseTrays(message, html) {
    await new Promise(r => setTimeout(r, 10));
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

  // Scroll chat to bottom on ready if any trays have been expanded
  static async _readyScroll() {
    await new Promise(r => setTimeout(r, 108));
    window.ui.chat.scrollBottom({ popout: true });
  }

  /**
   * Scroll tray to bottom if at bottom
   * @param {string} mid The message id.
   */
  static async _scroll(mid) {
    if (mid !== game.messages.contents.at(-1).id) return;
    if (window.ui.chat.isAtBottom) {
      await new Promise(r => setTimeout(r, 256));
      window.ui.chat.scrollBottom({ popout: false });
    };
    if (window.ui.sidebar.popouts.chat && window.ui.sidebar.popouts.chat.isAtBottom) {
      await new Promise(r => setTimeout(r, 256));
      window.ui.sidebar.popouts.chat.scrollBottom();
    };
  }

  /**
   * Sort tokens into owned and unowned categories.
   * @param {HTMLElement} tray The tray to be collapsed or not collapsed
   */
  static _checkTray(tray) {
    if (!game.settings.get(MODULE, "dontCloseOnPress")) {
      tray.classList.add("collapsed");
      tray.classList.remove("et-uncollapsed");
    };
  }

  /* -------------------------------------------- */
  /*  Effect Handling                             */
  /* -------------------------------------------- */

/**
 * Apply effect, or refresh its duration (and level) if it exists
 * @param {Actor5e} actor                          The actor to create the effect on.
 * @param {ActiveEffect5e} effect                  The effect to create.
 * @param {object} [options]                       Additional data that may be included with the effect.
 * @param {object} [options.effectData]            A generic data object that contains spellLevel in a `dnd5e` scoped flag, and whatever else.
 * @param {ActiveEffect5e} [options.concentration] The concentration effect on which `effect` is dependent, if it requires concentration.
 */
  static async applyEffectToActor(effect, actor, { effectData, concentration }) {
    const origin = game.settings.get(MODULE, "multipleConcentrationEffects") ? effect : concentration ?? effect;

    // Call the pre effect hook; returning `false` will terminate the function
    const preCallback = Hooks.call("effectiv.preApplyEffect", actor, effect, { effectData, concentration });
    if (!preCallback) return;

    // Enable an existing effect on the target if it originated from this effect
    const existingEffect = game.settings.get(MODULE, "multipleConcentrationEffects") ?
      actor.effects.find(e => e.origin === effect.uuid) :
      actor.effects.find(e => e.origin === origin.uuid);

    if (existingEffect) {
      if (!game.settings.get(MODULE, "deleteInstead")) {
        return existingEffect.update(foundry.utils.mergeObject({
          ...effect.constructor.getInitialDuration(),
          disabled: false
        }, effectData));

        // Or delete it instead
      } else existingEffect.delete();
    } else {

      // Otherwise, create a new effect on the target
      effect instanceof ActiveEffect ? effect = effect.toObject() : effect;
      effectData = foundry.utils.mergeObject({
        ...effect,
        disabled: false,
        transfer: false,
        origin: origin.uuid
      }, effectData);

      // Find an owner of the concentration effect and request that they add the dependent effect.
      const context = { parent: actor };
      if (concentration && !concentration.isOwner) {
        const userId = game.users.find(u => u.active && concentration.testUserPermission(u, "OWNER"))?.id;
        if (userId) context.effectiv = { userId: userId, concentrationUuid: concentration.uuid };
      }
      const applied = await ActiveEffect.implementation.create(effectData, context);
      if (concentration && concentration.isOwner) await concentration.addDependent(applied);

      // Call the effect hook
      Hooks.callAll("effectiv.applyEffect", actor, effect, { effectData, concentration });

      return applied;
    };
  }

  /* -------------------------------------------- */
  /*  Damage Handling                             */
  /* -------------------------------------------- */

/**
 * Apply damage
 * @param {string} id       The id of the actor to apply damage to.
 * @param {object} options  The options provided by the tray, primarily the multiplier.
 * @param {Array<Record<string, unknown>|Set<unknown>>} damage An array of objects with the damage type and 
 *                                                             value that also contain Sets with damage properties.
 */
  static async applyTargetDamage(id, options, damage) {
    const actor = fromUuidSync(id);
    await actor.applyDamage(damage, options);
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
   * @param {ActiveEffect5e} effect           The effect that will be created.
   * @param {object} data                     The initial data object provided to the request.
   * @param {DatabaseCreateOperation} options Additional options which modify the creation request.
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

  /**
   * Check targets for ownership when determining which target selection mode to use.
   * @param {Array} targets  Array of objects with target data, including UUID.
   * @returns {boolean}
   */
  static ownershipCheck(targets) {
    for (const target of targets) {
      const actor = fromUuidSync(target.uuid);
      if (actor?.isOwner) return true;
      else continue;
    };
    return false;
  }

  /**
   * Sort tokens into owned and unowned categories.
   * @param {Set|Token[]} targets The set or array of tokens to be sorted.
   * @returns {Array}             An Array of length two whose elements are the partitioned pieces of the original
   */
  static partitionTargets(targets) {
    const result = targets.reduce((acc, t) => {
      if (t.isOwner) acc[0].push(t);
      else acc[1].push(t.document.uuid);
      return acc;
    }, [[], []]);
    return result;
  }
}