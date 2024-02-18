import { MODULE } from "./const.mjs";

export class effectiveTray {
  static init () {
    Hooks.on("dnd5e.renderChatMessage", effectiveTray._expandEffect);
    Hooks.on("preCreateItem", effectiveTray._removeTransfer);
    if (!game.settings.get(MODULE, "systemDefault")) Hooks.on("dnd5e.renderChatMessage", effectiveTray._effectButton);
  };

  // Expand effects tray on chat messages
  static _expandEffect(message, html) {
    if (!game.settings.get(MODULE, "expandEffect")) return;
    const tray = html.querySelector('.effects-tray');
    if (!tray) return;
    tray.classList.remove("collapsed");
    html.querySelector('ul[class="effects collapsible-content unlist"]').setAttribute("style", "height: auto;");
  };

  // Remove transfer from all effects with duration
  static async _removeTransfer(item) {
    if (!game.settings.get(MODULE, "removeTransfer")) return;
    const effects = item.effects.contents;
    if (!effects) return;
    for (const effect of effects) {
      const transfer = effect.transfer;
      const duration = effect.duration;
      if (transfer && (duration.seconds || duration.turns || duration.rounds)) {
        await effect.updateSource({"transfer": false});
      };
    };
  };

  // Make the tray effective
  static async _effectButton(message, html) {
    const tray = html.querySelector('.effects-tray');
    if (!tray) return;
    const actor = game.actors?.get(message.speaker?.actor);
    const actorOwner = actor?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
    if (game.settings.get(MODULE, "ignoreNPC") && actor?.type === "npc" && !actorOwner) return;
    const filterDis = game.settings.get(MODULE, "filterDisposition")
    const token = game.scenes?.get(message.speaker?.scene)?.tokens?.get(message.speaker?.token);
    const tokenOwner = token?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
    if (token && filterDis === 1 && token.disposition <= -2 && !tokenOwner) return;
    if (token && filterDis === 2 && token.disposition <= -1 && !tokenOwner) return;
    if (token && filterDis === 3 && token.disposition <= 0 && !tokenOwner) return;
    const filterPer = game.settings.get(MODULE, "filterPermission");
    if (filterPer === 2 && !actor?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)) return;
    if (filterPer === 1 && !actor?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)) return;
    const old = html.querySelectorAll('.effects-tray .effect:not(:has(> ul:empty))');
    if (old) for (const oldEffect of old) oldEffect.remove();
    const uuid = message.flags.dnd5e?.use?.itemUuid;
    const item = await fromUuid(uuid);
    if (!item) return;
    const effects = item.effects.contents;
    if (!effects) return;
    for (const effect of effects) {
      let label;
      effect.duration.duration ? label = effect.duration.label : label = "";
      const contents = `
        <li class="effect" data-uuid=${uuid}.ActiveEffect.${effect._id} data-transferred=${effect.transfer}>
          <img class="gold-icon" alt=${effect.name} src=${effect.icon}>
          <div class="name-stacked">
            <span class="title">${effect.name}</span>
            <span class="subtitle">${label}</span>
          </div>
          <button type="button" class="apply-${effect.name.slugify().toLowerCase()}" data-tooltip="DND5E.EffectsApplyTokens" aria-label="Apply to selected tokens">
            <i class="fas fa-reply-all fa-flip-horizontal"></i>
          </button>
        </li>
      `;
      tray.querySelector('ul[class="effects collapsible-content unlist"]').insertAdjacentHTML("beforeend", contents);
      tray.querySelector(`button[class="apply-${effect.name.slugify().toLowerCase()}"]`).addEventListener('click', () => {
        const actors = new Set();
        for (const token of canvas.tokens.controlled) if (token.actor) actors.add(token.actor);
        for (const actor of actors) {
          const existingEffect = actor.effects.find(e => e.origin === effect.uuid);
          if (existingEffect) {
            existingEffect.update({ disabled: !existingEffect.disabled });
          } else {
            const effectData = foundry.utils.mergeObject(effect.toObject(), {
              disabled: false,
              transfer: false,
              origin: effect.uuid
            });
            ActiveEffect.implementation.create(effectData, {parent: actor});
          }
        };
      });
    };
  };
};