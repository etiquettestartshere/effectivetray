import { MODULE, socketID } from "./const.mjs";

/* -------------------------------------------- */
/*  Effects Handling                            */
/* -------------------------------------------- */
export class effectiveTray {
  static init() {
    Hooks.on("dnd5e.renderChatMessage", effectiveTray._scrollEffectsTray);
    Hooks.on("preCreateItem", effectiveTray._removeTransfer);
    if (!game.settings.get(MODULE, "systemDefault")) {
      Hooks.on("dnd5e.renderChatMessage", effectiveTray._effectTray);
      Hooks.on("preCreateActiveEffect", effectiveTray._enchantmentSpellLevel);
    };
    if (game.settings.get(MODULE, "dontCloseOnPress") && game.settings.get(MODULE, "systemDefault")) {
      Hooks.on("dnd5e.renderChatMessage", effectiveTray._effectCollapse);
    };
    const collapseSetting = game.settings.get("dnd5e", "autoCollapseChatTrays")
    if (collapseSetting === "older" || collapseSetting === "never") {
      Hooks.on("ready", effectiveTray._readyScroll);
    };

    // Add dependent effect to a concentration effect.
    Hooks.on("createActiveEffect", effectiveTray.#addDependent);
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

  // Scroll chat to bottom on ready if any trays have been expanded
  static async _readyScroll() {
    await new Promise(r => setTimeout(r, 108));
    window.ui.chat.scrollBottom({ popout: true });
  }

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

  /**
   * Make the effects tray effective
   * @param {ChatMessage5e} message The message on which the tray resides.
   * @param {HTMLElement} html      HTML contents of the message.
   * Methods lacking documentation below share these parameters.
   */
  static async _effectTray(message, html) {
    const tray = html.querySelector('.effects-tray');
    if (!tray) return;
    const uuid = foundry.utils.getProperty(message, "flags.dnd5e.use.itemUuid");
    if (!uuid) return;
    const item = await fromUuid(uuid);
    const effects = item?.effects?.contents;
    if (foundry.utils.isEmpty(effects)) return;
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

    // Replace the effects in the tray
    const old = html.querySelectorAll('.effects-tray .effect:not(:has(> ul:empty))');
    if (old) for (const oldEffect of old) oldEffect.remove();
    const tooltip = (game.settings.get(MODULE, "allowTarget")) ? (
      game.settings.get(MODULE, "contextTarget") ?
        "EFFECTIVETRAY.TOOLTIP.EffectsApplyTokensLegacy" :
        "EFFECTIVETRAY.TOOLTIP.EffectsApplyTokens"
    ) : "DND5E.EffectsApplyTokens";
    let spellLevel;
    if (item.system.level === 0) spellLevel = 0;
    else spellLevel = parseInt(html.querySelector('.item-card').dataset.spellLevel) || null;
    const effectData = { "flags.dnd5e.spellLevel": spellLevel };
    const concentration = actor.effects.get(message.getFlag("dnd5e", "use.concentrationId"));
    const caster = actor.uuid;
    for (const effect of effects) {
      if (effect.flags?.dnd5e?.type === "enchantment" || effect.flags?.dnd5e?.rider) continue;
      if (effect.transfer === true) continue;
      const label = effect.duration.duration ? effect.duration.label : "";
      const contents = `
        <li class="effect" data-uuid=${uuid}.ActiveEffect.${effect.id} data-transferred=${effect.transfer}>
          <img class="gold-icon" alt=${effect.name} src=${effect.img}>
          <div class="name-stacked">
            <span class="title">${effect.name}</span>
            <span class="subtitle">${label}</span>
          </div>
          <button type="button" class="apply-${effect.name.slugify().toLowerCase()}" data-tooltip="${tooltip}" aria-label="Apply to selected tokens">
            <i class="fas fa-reply-all fa-flip-horizontal"></i>
          </button>
        </li>
      `;
      tray.querySelector('ul.effects.unlist').insertAdjacentHTML("beforeend", contents);

      // Handle click events
      tray.querySelector(`li[data-uuid="${uuid}.ActiveEffect.${effect.id}"]`)?.querySelector("button").addEventListener('click', async () => {
        const mode = tray.querySelector(`[aria-pressed="true"]`)?.dataset?.mode;
        if (!mode || mode === "selected") {
          const actors = new Set();
          for (const token of canvas.tokens.controlled) if (token.actor) actors.add(token.actor);
          _checkTray(tray);
          for (const actor of actors) {
            await _applyEffects(actor, effect, { effectData, concentration });
          };
        } else {
          _effectApplicationHandler(tray, effect, { effectData, concentration, caster });
        };
      });

      // Handle legacy targeting mode
      if (game.settings.get(MODULE, "allowTarget") && game.settings.get(MODULE, "contextTarget")) {
        tray.querySelector(`li[data-uuid="${uuid}.ActiveEffect.${effect.id}"]`)?.querySelector("button").addEventListener('contextmenu', async function (event) {
          event.stopPropagation();
          event.preventDefault();
          _effectApplicationHandler(tray, effect, { effectData, concentration, caster });
        });
      };
    };

    // Handle expanding and collapsing the tray
    // No longer adhering to the system's deranged behavior of closing it if you click anywhere that isn't a button
    tray.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
    });
    const mid = message.id;
    const upper = tray.querySelector(".roboto-upper");
    upper.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (html.querySelector(".et-uncollapsed")) {
        tray.classList.remove("et-uncollapsed");
      };
      if (!html.querySelector(".effects-tray.collapsed")) {
        tray.classList.add("collapsed");
      } else if (html.querySelector(".effects-tray.collapsed")) tray.classList.remove("collapsed");
      if (game.settings.get(MODULE, "scrollOnExpand")) _scroll(mid);
    });

    // Handle the target source control
    if (!game.settings.get(MODULE, "contextTarget")) {
      const tsc = `
        <div class="target-source-control">
          <button type="button" class="unbutton" data-mode="targeted" aria-pressed="false">
            <i class="fa-solid fa-bullseye" inert=""></i> Targeted
          </button>
          <button type="button" class="unbutton" data-mode="selected" aria-pressed="false">
            <i class="fa-solid fa-expand" inert=""></i> Selected
          </button>
        </div>
        `
      tray.querySelector('ul.effects.unlist').insertAdjacentHTML("afterbegin", tsc);
      const source = tray.querySelector('.target-source-control');
      if (!game.settings.get(MODULE, "allowTarget")) source.remove();
      const toPress = source.querySelector(`[data-mode="selected"]`);
      toPress.ariaPressed = true;
      for (const mode of source.querySelectorAll(`[data-mode]`)) {
        mode.addEventListener('click', () => {
          source.querySelector(`[aria-pressed="true"]`).ariaPressed = false;
          source.querySelector(`[data-mode="${mode.dataset.mode}"]`).ariaPressed = true;
        });
      };
    };

    // Handle 'Don't Close on Apply'
    if (game.settings.get(MODULE, "dontCloseOnPress")) {
      const buttons = tray.querySelectorAll("button");
      for (const button of buttons) {
        button.addEventListener('click', async () => {
          if (!tray.querySelector(".et-uncollapsed")) {
            await tray.classList.add("et-uncollapsed");
            await tray.classList.remove("collapsed");
          };
        });
      };
    };
  }

  // Handle effects tray collapse behavior for default trays with don't close on submit
  static _effectCollapse(message, html) {
    const tray = html.querySelector('.effects-tray');
    if (!tray) return;
    const buttons = tray.querySelectorAll("button");
    tray.addEventListener('click', () => {
      if (html.querySelector(".effects-tray.collapsed")) tray.classList.add("et-uncollapsed");
      else tray.classList.remove("et-uncollapsed");
    });
    for (const button of buttons) {
      button.addEventListener('click', () => {
        tray.classList.add("collapsed");
        tray.classList.remove("et-uncollapsed");
      });
    };
  }

  // Check and see if the effects tray needs to be scrolled
  static _scrollEffectsTray(message, html) {
    if (!game.settings.get(MODULE, "scrollOnExpand")) return;
    const tray = html.querySelector('.effects-tray');
    if (tray) {
      const mid = message.id;
      tray.addEventListener('click', () => {
        if (html.querySelector(".effects-tray.collapsed")) _scroll(mid);
      });
    };
  };
}

/* -------------------------------------------- */
/*  Damage Handling                             */
/* -------------------------------------------- */
export class effectiveDamage {
  static init() {
    Hooks.on("dnd5e.renderChatMessage", effectiveDamage._damageCollapse);
    Hooks.on("dnd5e.renderChatMessage", effectiveDamage._scrollDamageTray);
    if (!game.settings.get(MODULE, "damageDefault")) {
      Hooks.on("dnd5e.renderChatMessage", effectiveDamage._damageTray);
    };
    Hooks.on("dnd5e.renderChatMessage", effectiveDamage._collapseTrays);
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
    for (const element of html.querySelectorAll("effective-damage-application")) {
      element.toggleAttribute("open", !collapse);
    };
  }

  // Handle damage tray collapse behavior
  static async _damageCollapse(message, html) {
    await new Promise(r => setTimeout(r, 108));
    const tray = html.querySelector('.damage-tray');
    if (!tray) return;
    const button = tray.querySelector("button.apply-damage");
    button.addEventListener('click', (event) => {
      if (game.settings.get(MODULE, "dontCloseOnPress")) {
        event.preventDefault();
        event.stopPropagation();
        tray.classList.remove("collapsed");
        tray.classList.add("et-uncollapsed");
      } else {
        if (html.querySelector(".damage-tray.et-uncollapsed")) tray.classList.toggle("et-uncollapsed");
      };
    });
    const upper = html.querySelector('.damage-tray')?.querySelector(".roboto-upper");
    upper.addEventListener('click', () => {
      if (html.querySelector(".damage-tray.et-uncollapsed")) {
        tray.classList.toggle("et-uncollapsed");
        tray.classList.remove("collapsed");
      };
    });
  }

  // Check and see if the damage tray needs to be scrolled
  static async _scrollDamageTray(message, html) {
    if (!game.settings.get(MODULE, "scrollOnExpand")) return;
    await new Promise(r => setTimeout(r, 112));
    const upper = html.querySelector('.damage-tray')?.querySelector(".roboto-upper");
    if (upper) {
      const mid = message.id;
      upper.addEventListener('click', () => {
        if (html.querySelector(".damage-tray.collapsed")) _scroll(mid);
      });
    };
  }
}

/* -------------------------------------------- */
/*  Socket Handling                             */
/* -------------------------------------------- */

/**
 * Register the socket
 * @param {object} request The information passed via socket to be handled by the GM client.
 */
export class effectiveSocket {
  static init() {
    game.socket.on(socketID, (request) => {
      switch (request.type) {
        case "effect":
          _effectSocket(request);
          break;
        case "damage":
          _damageSocket(request);
      };
    });
  }
}

// Make the GM client apply effects to the requested targets
async function _effectSocket(request) {
  if (game.user !== game.users.activeGM) return;
  const targets = request.data.targets;
  const origin = request.data.origin;
  const effect = foundry.utils.getType(origin) === "string" ? await fromUuid(origin) : origin;
  const c = await fromUuid(request.data.caster);
  const concentration = c?.effects?.get(request.data.con);
  const effectData = request.data.effectData;
  const actors = new Set();
  for (const target of targets) {
    const token = await fromUuid(target);
    const targetActor = token.actor ?? token;
    if (target) actors.add(targetActor);
  };
  for (const actor of actors) {
    await _applyEffects(actor, effect, { effectData, concentration });
  };
}

// Make the GM client apply damage to the requested targets
async function _damageSocket(request) {
  if (game.user !== game.users.activeGM) return;
  const id = request.data.id;
  const opts = request.data.opts;

  // Convert damage properties back into a Set for damage application
  const damage = [];
  request.data.damage.forEach(d => {
    foundry.utils.mergeObject(d, { properties: new Set(d.properties) });
    damage.push(d);
  });
  if (opts?.downgrade) foundry.utils.mergeObject(opts, { downgrade: new Set(opts.downgrade) });
  if (opts?.ignore?.immunity) foundry.utils.mergeObject(opts, { "ignore.immunity": new Set(opts.ignore.immunity) });
  if (opts?.ignore?.resistance) foundry.utils.mergeObject(opts, { "ignore.resistance": new Set(opts.ignore.resistance) });
  if (opts?.ignore?.vulnerability) foundry.utils.mergeObject(opts, { "ignore.vulnerability": new Set(opts.ignore.vulnerability) });
  if (opts?.ignore?.modification) foundry.utils.mergeObject(opts, { "ignore.modification": new Set(opts.ignore.modification) });
  return await _applyTargetDamage(id, opts, damage);
}

/* -------------------------------------------- */
/*  Functions                                   */
/* -------------------------------------------- */

/**
 * Handle applying effects to targets: handle it if you can handle it, else make a request via socket
 * @param {HTMLElement} tray             HTML element that composes the collapsible tray.
 * @param {ActiveEffect5e} effect        The effect to create.
 * @param {object} effectData            A generic data object that contains spellLevel in a `dnd5e` scoped flag, and whatever else.
 * @param {ActiveEffect5e} concentration The concentration effect on which `effect` is dependent, if it requires concentration.
 * @param {string} caster                The Uuid of the actor which originally cast the spell requiring concentration.
 */
async function _effectApplicationHandler(tray, effect, { effectData, concentration, caster }) {
  if (!game.user.targets.size) return ui.notifications.info(game.i18n.localize("EFFECTIVETRAY.NOTIFICATION.NoTarget"));
  if (game.user.isGM) {
    const actors = new Set();
    for (const token of game.user.targets) if (token.actor) actors.add(token.actor);
    _checkTray(tray);
    for (const actor of actors) {
      await _applyEffects(actor, effect, { effectData, concentration });
    };
  } else {
    const [owned, targets] = partitionTargets(game.user.targets);
    const actors = new Set();
    for (const token of owned) if (token.actor) actors.add(token.actor);
    _checkTray(tray);
    for (const actor of actors) {
      await _applyEffects(actor, effect, { effectData, concentration });
    };
    if (!targets.length) return;
    if (!game.users.activeGM) return ui.notifications.warn(game.i18n.localize("EFFECTIVETRAY.NOTIFICATION.NoActiveGMEffect"));
    const origin = effect.uuid;
    const con = concentration?.id;
    await game.socket.emit(socketID, { type: "effect", data: { origin, targets, effectData, con, caster } });
  };
}

/**
 * Apply effect, or refresh its duration (and level) if it exists
 * @param {Actor5e} actor                The actor to create the effect on.
 * @param {ActiveEffect5e} effect        The effect to create.
 * @param {object} effectData            A generic data object that contains spellLevel in a `dnd5e` scoped flag, and whatever else.
 * @param {ActiveEffect5e} concentration The concentration effect on which `effect` is dependent, if it requires concentration.
 */
export async function _applyEffects(actor, effect, { effectData, concentration }) {

  // Call the pre effect hook; returning `false` will terminate the function
  const preCallback = Hooks.call("effectiv.preApplyEffect", actor, effect, { effectData, concentration });
  if (!preCallback) return;

  // Enable an existing effect on the target if it originated from this effect
  const origin = game.settings.get(MODULE, "multipleConcentrationEffects") ? effect : concentration ?? effect;
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

/**
 * Apply damage
 * @param {string} id      The id of the actor to apply damage to.
 * @param {object} options The options provided by the tray, primarily the multiplier.
 * @param {array} damage   An array of objects with the damage type and value that also contain Sets with damage properties.
 */
async function _applyTargetDamage(id, options, damage) {
  const actor = fromUuidSync(id);
  await actor.applyDamage(damage, options);
}

/**
 * Scroll tray to bottom if at bottom
 * @param {string} mid The message id.
 */
export async function _scroll(mid) {
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
 * @param {Set|array} targets The set or array of tokens to be sorted.
 * @returns {array}           An Array of length two whose elements are the partitioned pieces of the original
 */
export function partitionTargets(targets) {
  const result = targets.reduce((acc, t) => {
    if (t.isOwner) acc[0].push(t);
    else acc[1].push(t.document.uuid);
    return acc;
  }, [[], []]);
  return result;
}

/**
 * Sort tokens into owned and unowned categories.
 * @param {HTMLElement} tray The tray to be collapsed or not collapsed
 */
function _checkTray(tray) {
  if (!game.settings.get(MODULE, "dontCloseOnPress")) {
    tray.classList.add("collapsed");
    tray.classList.remove("et-uncollapsed");
  };
}