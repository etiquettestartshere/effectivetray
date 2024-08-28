import { MODULE } from "./const.mjs";

export class EffectiveUtils {

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

  /**
   * Apply damage
   * @param {string} id      The id of the actor to apply damage to.
   * @param {object} options The options provided by the tray, primarily the multiplier.
   * @param {array} damage   An array of objects with the damage type and value that also contain Sets with damage properties.
   */
  static async _applyTargetDamage(id, options, damage) {
    const actor = fromUuidSync(id);
    await actor.applyDamage(damage, options);
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

  /**
   * Check targets for ownership when determining which target selection mode to use.
   * @param {Array} targets  Array of objects with target data, including UUID.
   * @returns {boolean}
   */
  static async ownershipCheck(targets) {
    for (const target of targets) {
      const token = await fromUuid(target.uuid);
      if (token?.isOwner) return true;
      else continue;
    };
    return false;
  }

  /**
   * Sort tokens into owned and unowned categories.
   * @param {Set|array} targets The set or array of tokens to be sorted.
   * @returns {array}           An Array of length two whose elements are the partitioned pieces of the original
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