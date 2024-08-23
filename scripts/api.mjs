import { socketID } from "./const.mjs";
import { _applyEffects, partitionTargets} from "./effective-tray.mjs";
import { _scroll } from "./effective-tray.mjs";

export class API {

  static init() {
    globalThis.effectiv = {
      applyEffect: API.applyEffect,
      applyDamage: API.applyDamage,
      partitionTargets: partitionTargets,
      scroll: _scroll
    };
  }

  /* -------------------------------------------- */
  /*  Effect Application Helper                   */
  /* -------------------------------------------- */

  /**
   * Helper function to allow for macros or other applications to apply effects to owned and unowned targets.
   * @param {string|object|ActiveEffect5e} effect            The effect to apply.
   * @param {Set<Token5e>|Token5e[]|string[]|string} targets Targeted tokens.
   * @param {object} [options]
   * @param {object} [options.effectData]                    A generic data object, which typically handles the level the originating spell was cast at, 
   *                                                         if it originated from a spell, if any. Use flags like { "flags.dnd5e.spellLevel": 1 }.
   * @param {string} [options.concentration]                 The ID (not Uuid) of the concentration effect this effect is dependent on, if any.
   * @param {string|Actor5e} [options.caster]                The Uuid or Actor5e document of the actor that cast the spell that requires concentration, if any.
   */
  static async applyEffect(effect, targets, {effectData = null, concentration = null, caster = null} = {}) {

    // Effect handling
    let toApply;
    const effectType = foundry.utils.getType(effect);
    if (effect instanceof ActiveEffect) {
      toApply = effect.uuid;
    }  
    else if (effectType === "string") {
      toApply = effect;
      effect = await fromUuid(effect);
    } 
    else if (effectType === "Object") {
      toApply = effect;
    }

    // Target handling

    // Handle `game.user.targets`
    let owned;
    let toTarget;
    if (targets instanceof Set) {
      [owned, toTarget] = partitionTargets(Array.from(targets));
    }

    // Handle a single Uuid
    else if (foundry.utils.getType(targets) === "string") {
      const t = await fromUuid(targets);
      t.isOwner ? owned = [t] : toTarget = [t.uuid];
    }

    // Handle an array of Tokens
    else if (targets.at(0) instanceof Token) {
      [owned, toTarget] = partitionTargets(targets);
    } 
    else {

      // Handle an array of Uuids
      owned = [];
      toTarget = [];
      for (const target of targets) {
        const t = await fromUuid(target);
        if (t.isOwned) owned.push(t);
        else toTarget.push(target);
      };
    }  

    // Caster handling
    let spellCaster;
    if (caster instanceof Actor) spellCaster = caster?.uuid;
    else if (foundry.utils.getType(caster) === "string") spellCaster = caster;


    // Apply what effects you can apply yourself
    if (!foundry.utils.isEmpty(owned)) {
      const actors = new Set();
      for (const token of owned) if (token.actor ?? token) actors.add(token.actor ?? token);
      for (const actor of actors) await _applyEffects(actor, effect, {effectData, concentration});
    };

    // Ask the GM client to apply the rest
    if (foundry.utils.isEmpty(toTarget)) return;
    if (!game.users.activeGM) return ui.notifications.warn(game.i18n.localize("EFFECTIVETRAY.NOTIFICATION.NoActiveGMEffect"));

    await game.socket.emit(socketID, { 
      type: "effect",
      data: { 
        origin: toApply,
        targets: toTarget,
        effectData: effectData,
        con: concentration,
        caster: spellCaster
      }
    });
  }

  /* -------------------------------------------- */
  /*  Damage Application Helper                   */
  /*    see README and the system's damage        */
  /*    application method for documentation      */
  /* -------------------------------------------- */

  static async applyDamage(damage = [], opts = {}, id) {
    if (!game.users.activeGM) return ui.notifications.warn(game.i18n.localize("EFFECTIVETRAY.NOTIFICATION.NoActiveGMDamage"));
    await game.socket.emit(socketID, { type: "damage", data: { id, opts, damage } });
  }
}