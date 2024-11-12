# Effective Tray (for D&D Fifth Edition)
A module for dnd5e on foundryvtt that allows the effects and damage trays to be used more effectively.

## Effects Tray 
Allows users to use the effect tray as much or as little as wanted by the GM, up to and including transferal to targets they do not own. User ability to transfer effects to and from any target is on by default.
## Damage Tray
Allows users to use the damage tray for selected tokens that they own, and for targeted tokens (either that they own, or ones they don't own with a setting). User ability to use the damage tray is on by default, but unless the relevant setting is selected, they cannot damage targets.

## Settings
- **Transfer to Target**: Allow users to transfer effects to targets they do not own (off by default).
- **Damage Target**: Allow users to damage targets that they don't own with the damage tray (off by default).
- **Delete Instead of Refresh**: Attempting to transfer an effect to an actor that has it already will delete it rather than refreshing its duration (off by default).
- **Filtering** based on actor type, permissions, and token disposition. This prevents users from seeing and interacting with effects of certain origins, depending on GM preference (no filtering is performed by default).
- **Multiple Effects with Concentration**: Allow multiple effects to be applied from spells with concentration (off by default).
- **Use Default Trays**: Adds settings (off by default) to use the default effects and damage trays. Only the features *below* this setting will function if a given tray is in its default mode.
- **Don't Close Trays on Apply**: Don't automatically close trays when hitting submit. Won't work with default effects tray (now off by default).
- **Scroll on Expand**: Scroll chat to bottom when expanding a tray that is at the bottom (experimental, on by default).
- **Remove 'Apply Effect to Actor'**: On the time of creation (i.e. drag & drop, item grant advancement), remove 'Apply Effect to Actor' from effects on items that have a duration to allow for normal use of the timer (on by default).

## Additional Features
- Flags enchantment effects with their spellLevel.

## API
Now includes three helper functions exposed in the global scope under `effectiv`, `effectiv.applyEffect`, `effectiv.applyDamage` and `effective.partitionTargets`. These functions *have not been heavily tested* and are included now in the hopes that, if someone wants to use them, they will also test them for issues.

`applyEffect`, a helper function to allow users to apply effects. It allows users to apply effects via macro (or other module), and can take a variety of types of data when doing so, allowing effect data to be passed as the full ActiveEffect document, an effect Uuid, or an object (note that passing it as an object will not interact with refreshing duration or deleting effects of same origin, as determined by module setting, because creating an effect from an object will have its own unique origin). Similarly, this function allows target data to be passed as an array of Uuids, a single Uuid, an array of Tokens, or a Set, as `game.user.targets`.

This helper also allows the use of the other things the effects tray does, primarily flagging effects with spellLevel, or any other arbitrary flags (via effectData), and making an effect dependent on a concentration effect (so it will be deleted when the concentration effect is). If concentration is used, because it passed as an ID, you must also pass the Uuid or Actor document of the actor the concentration effect is on.

```js
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
async function applyEffect(
  effect, 
  targets, 
  { effectData: null, concentration: null, caster: null } = {}
)
```
```js
/* in use...*/
effectiv.applyEffect(
  effect, 
  targets, 
  { effectData: null, concentration: null, caster: null } = {}
)
```

`applyDamage`, helper function to allow users to apply damage. This function has been tested not at all and is included as a courtesy. Personally I find the way damage information must be structured to respect resistances, etc is too much of a mess to test this even a single time, but if someone really wants to do this over a socket but didn't write their own socket handler for it...here you go. Full, extensive documentation of the array that must be created is in scripts/api.mjs, copied directly from `dnd5e`, with the exception that socket transmission requires the sets to be arrays. Unlike `applyEffect`, this applies no damage via the requesting client, and so is basically only meant for damaging unowned targets. Users wishing to apply damage to owned targets should simply use the system's `Actor#applyDamage`.
```js
/**
 * The below documentation is from the system's damage application method, except all Sets are arrays.
 * Please see the system's documentation for a complete understanding of this method, as this helper is only
 * provided as a courtesy.
 * 
 * Description of a source of damage. 
 *
 * @typedef {object} DamageDescription
 * @property {number} value              Amount of damage.
 * @property {string} type               Type of damage.
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
 *                                                step? A Array of damage types to be downgraded or `true` to downgrade
 *                                                all damage types.
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
 * Helper function to allow for macros or other applications to apply damage via socket request.
 * @param {Array} damage Array of damage objects; see above.
 * @param {Array} opts   Object of options (which may inlude arrays); see above.
 * @param {string} id    Uuid of the target.
 */
async function applyDamage(damage = [], opts = {}, id)
```
```js  
/* in use...*/
effectiv.applyDamage(damage = [], opts = {}, id)
```

`partitionTargets`, a function similar to foundry's `Array#partition` but specifically designed to handle `game.user.targets`, a set, or an array of tokens. It sorts them into two arrays, the first array containing tokens that the user owns, and the second array containing those token's `document.uuid`s. This can be useful for determining what information needs to be sent over sockets. I have no idea why anyone would use this function, but here it is.
```js
/**
 * Sort tokens into owned and unowned categories.
 * @param {Set|Token[]} targets The set or array of tokens to be sorted.
 * @returns {Array}           An Array of length two, the elements of which are the partitioned pieces of the original.
 */
function partitionTargets(targets)
```
```js
/* in use...*/
effectiv.partitionTargets(targets)
```

## Hooks
Now includes two hooks, `effectiv.preApplyEffect` and `effectiv.applyEffect`. The former allows the data of the first parameter to be modified and explicitly returning `false` will prevent the effect from being applied. The later passes the same information in its final state upon application. 

These hooks have not been extensively tested.
```js
/**
 * Hook called before the effect is completed and applied.  
 * @param {object} effectData            The effect data object before application. This object can be mutated.
 * @param {Actor5e} actor                The actor to create the effect on.
 * @param {ActiveEffect5e} concentration The concentration effect on which the effect will be dependent, if it requires concentration.
 */
Hooks.call("effectiv.preApplyEffect", effectData, actor, concentration);
```
```js
/**
 * Hook called before the effect is completed and applied. Same as above except for effectData.
 * @param {object} effectData            The effect data object.
 * @param {Actor5e} actor                The actor to create the effect on.
 * @param {ActiveEffect5e} concentration The concentration effect on which the effect will be dependent, if it requires concentration.
 */
Hooks.callAll("effectiv.applyEffect", effectData, actor, concentration);
```
___
###### **Technical Details**

**Scope:** Replaces the effects tray in chat messages with a similar one that allows all users, not just GMs or the chat message's creator, to apply active effects to tokens they control (and have selected) by looping over all messages in the "dnd5e.renderChatMessage" hook. Extends the system's damage application element class to allow users who are not GMs to use the damage tray. Additionally, transmits target target and change data via sockets to allow an active GM client to apply effects (or damage) to a non GM user's targets.

**License:** MIT License.

**Additional Info:** Thanks to Zhell for help with adding actors to a set and lots of other stuff (and for the github action), and to Flix for much encouragement. Thanks also to ChaosOS for help with sockets, and DrentalBot for help with suppressing the system's context menu.

Some code has been adapted from [dnd5e](https://github.com/foundryvtt/dnd5e), particularly the extension of the tray custom html elements, and unifying module and system logic for collapsing or expanding trays.