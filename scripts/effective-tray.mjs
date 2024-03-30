import { MODULE, socketID } from "./const.mjs";

  /* -------------------------------------------- */
  /*  Effects Handling                            */
  /* -------------------------------------------- */
export class effectiveTray {
  static init() {
    Hooks.on("dnd5e.renderChatMessage", effectiveTray._expandEffect);
    Hooks.on("dnd5e.renderChatMessage", effectiveTray._scrollEffectsTray);
    Hooks.on("preCreateItem", effectiveTray._removeTransfer);
    if (!game.settings.get(MODULE, "systemDefault")) {
      Hooks.on("dnd5e.renderChatMessage", effectiveTray._effectButton);
    };
    if (game.settings.get(MODULE, "dontCloseOnPress") && game.settings.get(MODULE, "systemDefault")) {
      Hooks.on("dnd5e.renderChatMessage", effectiveTray._effectCollapse);
    };  
  };

  // Remove transfer from all effects with duration
  static _removeTransfer(item) {
    if (!game.settings.get(MODULE, "removeTransfer")) return;
    const effects = item.effects.contents;
    if (!effects) return;
    for (const effect of effects) {
      const transfer = effect.transfer;
      const duration = effect.duration;
      if (transfer && (duration.seconds || duration.turns || duration.rounds)) {
        effect.updateSource({"transfer": false});
      };
    };
  };

  // Make the tray effective
  static async _effectButton(message, html) {
    const tray = html.querySelector('.effects-tray');
    if (!tray) return;
    const uuid = message.flags?.dnd5e?.use?.itemUuid;
    if (!uuid) return;
    const item = await fromUuid(uuid);
    const effects = item?.effects?.contents;
    if (!effects) return;
    const actor = game.actors?.get(message.speaker?.actor);

    // Handle filtering
    if (game.settings.get(MODULE, "ignoreNPC") && actor?.type === "npc" && !actor?.isOwner) return;
    const filterDis = game.settings.get(MODULE, "filterDisposition");
    if (filterDis) {
      const token = game.scenes?.get(message.speaker?.scene)?.tokens?.get(message.speaker?.token);
      if (token && filterDis === 3 && token.disposition <= 0 && !token?.isOwner) return;
      else if (token && filterDis === 2 && token.disposition <= -1 && !token?.isOwner) return;
      else if (token && filterDis === 1 && token.disposition <= -2 && !token?.isOwner) return;
    };
    const filterPer = game.settings.get(MODULE, "filterPermission");
    if (filterPer) {
      if (filterPer === 1 && !actor?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)) return;
      else if (filterPer === 2 && !actor?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)) return;
    };

    // Replace the effects in the tray
    const old = html.querySelectorAll('.effects-tray .effect:not(:has(> ul:empty))');
    if (old) for (const oldEffect of old) oldEffect.remove();
    const tooltip = (game.settings.get(MODULE, "allowTarget")) ? "EFFECTIVETRAY.EffectsApplyTokens" : "DND5E.EffectsApplyTokens";
    const lvl = message.flags?.dnd5e?.use?.spellLevel;
    for (const effect of effects) {
      const label = effect.duration.duration ? effect.duration.label : "";
      const contents = `
        <li class="effect" data-uuid=${uuid}.ActiveEffect.${effect._id} data-transferred=${effect.transfer}>
          <img class="gold-icon" alt=${effect.name} src=${effect.icon}>
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
      tray.querySelector(`li[data-uuid="${uuid}.ActiveEffect.${effect._id}"]`)?.querySelector("button").addEventListener('click', () => {
        if (game.settings.get(MODULE, "allowTarget") && !canvas.tokens.controlled.length) return ui.notifications.info("Select a token, or right click to apply effect to targets.")
        const actors = new Set();
        for (const token of canvas.tokens.controlled) if (token.actor) actors.add(token.actor);
        for (const actor of actors) {
          _applyEffects(actor, effect, lvl);
        };
      });
      if (game.settings.get(MODULE, "dontCloseOnPress")) {
        const buttons = tray.querySelectorAll("button");
        for (const button of buttons) {
          button.addEventListener('click', event => {
            event.stopPropagation();
            event.preventDefault();
            tray.classList.add("et-uncollapsed");
          });
        };
      };
      if (!game.settings.get(MODULE, "allowTarget")) return;

      // Handle applying effects to targets: handle it if you can handle it, else emit a socket
      tray.querySelector(`button[class="apply-${effect.name.slugify().toLowerCase()}"]`).addEventListener('contextmenu', event => {
        event.stopPropagation();
        event.preventDefault();
      });
      tray.querySelector(`button[class="apply-${effect.name.slugify().toLowerCase()}"]`).addEventListener('contextmenu', () => {
        if (!game.user.targets.size) return ui.notifications.info("You don't have a target.");
        const targets = Array.from(game.user.targets).map(i=>i.document.uuid)
        if (game.user.isGM) {
          const actors = new Set();
          for (const token of game.user.targets) if (token.actor) actors.add(token.actor);
          for (const actor of actors) {
            _applyEffects(actor, effect, lvl);
          }
        } else {
          const origin = effect.uuid;
          game.socket.emit(socketID, {type: "firstCase", data: {origin, targets, lvl}});
        };
      });
    };
  };

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
  };

  // Expand effects tray on chat messages
  static async _expandEffect(message, html) {
    if (!game.settings.get(MODULE, "expandEffect")) return;
    const tray = html.querySelector('.effects-tray');
    if (!tray) return;
    if (game.settings.get(MODULE, "systemDefault")) await new Promise(r => setTimeout(r, 100));
    tray.classList.remove("collapsed");
    if (game.settings.get(MODULE, "systemDefault")) return;
    tray.classList.add("et-uncollapsed");
    tray.addEventListener('click', event => {
      event.stopPropagation();
      event.preventDefault();
      tray.classList.toggle("et-uncollapsed");
    });
  };

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
};

  /* -------------------------------------------- */
  /*  Damage Handling                             */
  /* -------------------------------------------- */
export class effectiveDamage {
  static init() {
    Hooks.on("dnd5e.renderChatMessage", effectiveDamage._expandDamage);
    Hooks.on("dnd5e.renderChatMessage", effectiveDamage._damageCollapse);
    Hooks.on("dnd5e.renderChatMessage", effectiveDamage._scrollDamageTray);
    if (!game.settings.get(MODULE, "damageDefault")) {
      Hooks.on("dnd5e.renderChatMessage", effectiveDamage._damageTray);
    };
  };

  // Make the damage tray effective
  static _damageTray(message, html) {
    if (message.flags?.dnd5e?.roll?.type === "damage") {
      if (!game.user.isGM) {
        const damageApplication = game.settings.get(MODULE, "damageTarget") ?
          document.createElement("effective-damage-application") :
          document.createElement("damage-application");
        damageApplication.classList.add("dnd5e2");
        damageApplication.damages = dnd5e.dice.aggregateDamageRolls(message.rolls, { respectProperties: true }).map(roll => ({
          value: roll.total,
          type: roll.options.type,
          properties: new Set(roll.options.properties ?? [])
        }));
        html.querySelector(".message-content").appendChild(damageApplication);
      };
    };
  };

  // Expand the damage tray
  static async _expandDamage(message, html) {
    if (!game.settings.get(MODULE, "expandDamage")) return;
    await new Promise(r => setTimeout(r, 100));
    const tray = html.querySelector('.damage-tray');
    if (!tray) return;
    tray.classList.remove("collapsed");
    tray.classList.add("et-uncollapsed");
    const mid = message.id;
    if (game.settings.get(MODULE, "scrollOnExpand")) _scroll(mid);
    const upper = tray.querySelector(".roboto-upper");
    upper.addEventListener('click', event => {
      event.stopPropagation();
      event.preventDefault();
      if (html.querySelector(".damage-tray.et-uncollapsed")) {
        if (!html.querySelector(".damage-tray.collapsed")) tray.classList.add("collapsed");
        tray.classList.toggle("et-uncollapsed");
      } else {
        if (html.querySelector(".damage-tray.collapsed")) tray.classList.remove("collapsed");
        tray.classList.add("et-uncollapsed");
        if (game.settings.get(MODULE, "scrollOnExpand")) _scroll(mid);
      };
    });
  };

  // Handle damage tray collapse behavior
  static async _damageCollapse(message, html) {
    await new Promise(r => setTimeout(r, 108));
    const tray = html.querySelector('.damage-tray');
    if (!tray) return;
    const button = tray.querySelector("button.apply-damage");
    button.addEventListener('click', event => {
      if (game.settings.get(MODULE, "dontCloseOnPress")) {
        event.preventDefault();
        event.stopPropagation();
        tray.classList.remove("collapsed");
        tray.classList.add("et-uncollapsed");
      } else {
        if (html.querySelector(".damage-tray.et-uncollapsed")) tray.classList.toggle("et-uncollapsed");
      };
    });
  };

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
  };
};

  /* -------------------------------------------- */
  /*  Socket Handling                             */
  /* -------------------------------------------- */

// Make the GM client apply effects to the socket emitter's targets
async function _effectSocket(data) {
  if (game.user !== game.users.activeGM) return;
  const targets = data.data.targets;
  const effect = await fromUuid(data.data.origin);
  const lvl = data.data.lvl;
  const actors = new Set();
  for (const target of targets) {
    const token = await fromUuid(target);
    const targetActor = token.actor;
    if (target) actors.add(targetActor);
  };
  for (const actor of actors) {
    _applyEffects(actor, effect, lvl);
  };
};

// Make the GM client apply damage to the socket emitter's targets
async function _damageSocket(data) {
  if (game.user !== game.users.activeGM) return;
  const id = data.data.id;
  const options = data.data.options;
  const dmg = data.data.dmg;
  _applyTargetDamage(id, options, dmg);
};

// Register the socket
export class effectiveSocket {
  static init() {
    game.socket.on(socketID, (data) => {
      switch (data.type) {
        case "firstCase":
          _effectSocket(data);
          break;
        case "secondCase":
          _damageSocket(data);  
      };
    });
  };
};

  /* -------------------------------------------- */
  /*  Functions                                   */
  /* -------------------------------------------- */

// Apply effect, or refresh its duration (and level) if it exists
async function _applyEffects(actor, effect, lvl) {
  const existingEffect = actor.effects.find(e => e.origin === effect.uuid);
  let flags;
  if (game.settings.get(MODULE, "flagLevel") && effect?.parent?.type === "spell") {
    flags = foundry.utils.deepClone(effect.flags);
    foundry.utils.mergeObject(flags, {
      effectivetray: {
        spellLevel: lvl
      }
    });
  } else flags = effect.flags;
  if (existingEffect) {
    if (!game.settings.get(MODULE, "deleteInstead")) {
      return existingEffect.update({
        ...effect.constructor.getInitialDuration(),
        disabled: false,
        flags: flags
      });
    } else existingEffect.delete();
  } else {
    const effectData = foundry.utils.mergeObject(effect.toObject(), {
      disabled: false,
      transfer: false,
      origin: effect.uuid,
      flags: flags
    });
    const applied = await ActiveEffect.implementation.create(effectData, {parent: actor});
    return applied;
  };
};

// Apply damage
async function _applyTargetDamage(id, options, dmg) {
  const actor = fromUuidSync(id);
  await actor.applyDamage(dmg, options);
};

// Scroll tray to bottom if at bottom
async function _scroll(mid) {
  if (mid !== game.messages.contents.at(-1).id) return;
  if (window.ui.chat.isAtBottom) {
    await new Promise(r => setTimeout(r, 256));
    await window.ui.chat.scrollBottom({ popout: false });
  };  
  if (window.ui.sidebar.popouts.chat && window.ui.sidebar.popouts.chat.isAtBottom) {
    await new Promise(r => setTimeout(r, 256));
    await window.ui.sidebar.popouts.chat.scrollBottom();
  };
};