import { MODULE, socketID } from "./const.mjs";
import { _applyEffects, partitionTargets} from "./effective-tray.mjs";

export class API {

  static init() {
    globalThis.effectiv = {
      applyEffect: API.applyEffect,
      applyDamage: API.applyDamage
    };
  };

  /* -------------------------------------------- */
  /*  Effect Application Helper                   */
  /* -------------------------------------------- */

  /**
   * Helper function to allow for macros or other applications to make a socket request to apply damage.
   * @param {string|object|ActiveEffect} effect The effect to apply. Can handle Uuid, effect data as an object, or an ActiveEffect proper.
   * @param {set|array|string} targets Targeted tokens. Handles `game.user.targets`, or any generic array of token placeables.
   * @param {number|void} effectData A generic data object, which typically handles the level the originating spell was cast at, 
   *                                 if it originated from a spell, if any. Use flags like { "flags.dnd5e.spellLevel": 1 }.
   * @param {string|void} concentration The ID (not Uuid) of the concentration effect this effect is dependent on, if any.
   * @param {string|Actor5e|void} caster The Uuid or Actor5e document of the actor that cast the spell that requires concentration, if any.
   */
  static async applyEffect(effect, targets, data = {effectData: null, concentration: null, caster: null}) {

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
    let owned;
    let toTarget;
    if (targets instanceof Set) {
      [owned, toTarget] = partitionTargets(Array.from(targets));
    }
    else if (foundry.utils.getType(targets) === "string") {
      const t = await fromUuid(targets);
      t.document.isOwner ? owned = t : toTarget = Array.from(t);
    }
    else if (targets.at(0) instanceof Token) {
      partitionTargets(targets);
    } 
    else {
      owned = [];
      toTarget = [];
      for (const target of targets) {
        const t = await fromUuid(target);
        if (t.isOwned) owned.push(t);
        else toTarget.push(t);
      };
    }  

    // Caster handling
    let spellCaster;
    if (data?.caster instanceof Actor) spellCaster = data?.caster.uuid;
    else if (foundry.utils.getType(data?.caster) === "string") spellCaster = data?.caster;


    // Apply what effects you can apply yourself
    const actors = new Set();
    for (const token of owned) if (token.actor) actors.add(token.actor);
    for (const actor of actors) await _applyEffects(actor, effect, {effectData: data?.effectData, concentration: data?.concentration});

    // Ask the GM client to apply the rest
    if (!game.users.activeGM) return ui.notifications.warn(game.i18n.localize("EFFECTIVETRAY.NOTIFICATION.NoActiveGMEffect"));

    await game.socket.emit(socketID, { 
      type: "effect",
      data: { 
        origin: toApply,
        targets: toTarget,
        effectData: data?.effectData,
        con: data?.concentration,
        caster: spellCaster
      }
    });
  };

  /* -------------------------------------------- */
  /*  Damage Application Helper                   */
  /*                                              */
  /*    below is documentation for the system's   */
  /*    applyDamage() function which this calls,  */
  /*    with the change that all Sets are Arrays  */
  /* -------------------------------------------- */

  /**
   * Description of a source of damage. 
   *
   * @typedef {object} DamageDescription
   * @property {number} value            Amount of damage.
   * @property {string} type             Type of damage.
   * @property {Array<string>} properties  Physical properties that affect damage application.
   * @property {object} [active]
   * @property {number} [active.multiplier]      Final calculated multiplier.
   * @property {boolean} [active.modifications]  Did modification affect this description?
   * @property {boolean} [active.resistance]     Did resistance affect this description?
   * @property {boolean} [active.vulnerability]  Did vulnerability affect this description?
   * @property {boolean} [active.immunity]       Did immunity affect this description?
   */

  /**
   * Options for damage application.
   *
   * @typedef {object} DamageApplicationOptions
   * @property {boolean|Array<string>} [downgrade]  Should this actor's resistances and immunities be downgraded by one
   *                                              step? A Array of damage types to be downgraded or `true` to downgrade
   *                                              all damage types.
   * @property {number} [multiplier=1]         Amount by which to multiply all damage.
   * @property {object|boolean} [ignore]       Array to `true` to ignore all damage modifiers. If Array to an object, then
   *                                           values can either be `true` to indicate that the all modifications of
   *                                           that type should be ignored, or a Array of specific damage types for which
   *                                           it should be ignored.
   * @property {boolean|Array<string>} [ignore.immunity]       Should this actor's damage immunity be ignored?
   * @property {boolean|Array<string>} [ignore.resistance]     Should this actor's damage resistance be ignored?
   * @property {boolean|Array<string>} [ignore.vulnerability]  Should this actor's damage vulnerability be ignored?
   * @property {boolean|Array<string>} [ignore.modification]   Should this actor's damage modification be ignored?
   * @property {boolean} [invertHealing=true]  Automatically invert healing types to it heals, rather than damages.
   * @property {"damage"|"healing"} [only]     Apply only damage or healing parts. Untyped rolls will always be applied.
   */

  /**
   * Apply a certain amount of damage or healing to the health pool for Actor
   * @param {DamageDescription[]|number} damages     Damages to apply.
   * @param {DamageApplicationOptions} [options={}]  Damage application options.
   * @returns {Promise<Actor5e>}                     A Promise which resolves once the damage has been applied.
   */

  /**
   * Helper function to allow for macros or other applications to 
   * make a socket request to apply damage.
   * @param {array} damage Array of damage objects; see above.
   * @param {array} opts Object of options (which may inlude arrays); see above.
   * @param {string} id Uuid of the target.
   */
  static async applyDamage(damage=[], opts={}, id) {
    if (!game.users.activeGM) return ui.notifications.warn(game.i18n.localize("EFFECTIVETRAY.NOTIFICATION.NoActiveGMDamage"));
    await game.socket.emit(socketID, { type: "damage", data: { id, opts, damage } });
  };

};