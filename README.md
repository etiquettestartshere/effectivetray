# Effective Tray (for D&D Fifth Edition)
A module for dnd5e on foundryvtt that allows the effects and damage trays to be used more effectively.

## Effects Tray 
Allows users to use the effect tray as much or as little as wanted by the GM, up to and including transferal to targets they do not own. If using this feature (which is on by default), left click to apply effects to selected tokens that the user owns (as the system's default behavior), or right click to apply effects to tokens that the user does not own.
## Damage Tray
Allows users to use the damage tray for selected tokens that they own, and for targeted tokens (either that they own, or ones they don't own with a setting) User ability to use the damage tray is on by default, but unless the relevant setting is selected, they cannot damage targets.

## Settings
- **Transfer to Target**: Allow users to transfer effects to targets with right click (on by default).
- **Legacy Targeting for Effects**: Apply effects to target with right click, rather than the target source control (off by default).
- **Damage Target**: Allow users to damage targets (that they don't own) with the damage tray (off by default).
- **Delete Instead of Refresh**: Attempting to transfer an effect to an actor that has it already will delete it rather than refreshing its duration (off by default).
- **Filtering** based on actor type, permissions, and token disposition. This prevents users from seeing and interacting with effects of certain origins, depending on GM preference (no filtering is performed by default).
- **Use Default Trays**: Adds settings (off by default) to use the default effects and damage trays. Only the features *below* this setting will function if a given tray is in its default mode.
- **Expand Effects Tray**: The effect tray on chat messages starts in its expanded position when the message is created (on by default).
- **Expand Damage Tray**: The damage tray on chat messages starts in its expanded position when the message is created (on by default).
- **Don't Close Trays on Apply**: Don't automatically close trays when hitting submit. Won't work with default effects tray (now off by default).
- **Scroll on Expand**: Scroll chat to bottom when expanding a tray that is at the bottom (experimental, on by default).
- **Remove 'Apply Effect to Actor'**: On the time of creation (i.e. drag & drop), remove 'Apply Effect to Actor' from effects on items that have a duration to allow for normal use of the timer (on by default).
- **Multiple Effects with Concentration**: Allow multiple effects to be applied from spells with concentration (off by default).

## API
```js
  /**
   * Helper function to allow for macros or other applications
   * to make a socket request to apply damage.
   * @param {string|object|ActiveEffect} effect The effect to apply. 
   *                                            Can handle Uuid, effect data as an object, 
   *                                            or an ActiveEffect proper.
   * @param {set|array|string} targets          Targeted tokens. 
   *                                            Handles `game.user.targets`, 
   *                                            or any generic array of token placeables.
   * @param {number|void} effectData            A generic data object, which typically handles
   *                                            the level the originating spell was cast at, 
   *                                            if it originated from a spell, if any. 
   *                                            Use flags like { "flags.dnd5e.spellLevel": 1 }.
   * @param {string|void} concentration         The ID (not Uuid) of the concentration 
   *                                            effect this effect is dependent on, 
   *                                            if any.
   * @param {string|Actor5e|void} caster        The Uuid or Actor5e document of the actor 
   *                                            that cast the spell that requires concentration, 
   *                                            if any.
   */
  async function applyEffect(
    effect, 
    targets, 
    data = { 
      effectData: null, 
      concentration: null, 
      caster: null 
    }
  )
```
```js
  /* in use...*/
  effectiv.applyEffect(
    effect, 
    targets, 
    data = { 
      effectData: null, 
      concentration: null, 
      caster: null 
    }
  )
```
 A helper function to allow users to apply effects.

```js
  /**
   * ... Much documentation cut here...see scripts/api.mjs or better yet, dnd5e...
   * Helper function to allow for macros or other applications to 
   * make a socket request to apply damage.
   * @param {array} damage Array of damage objects; see above.
   * @param {array} opts   Object of options (which may inlude arrays); see above.
   * @param {string} id    Uuid of the target.
   */
  async function applyDamage(damage=[], opts={}, id)
```
```js  

  /* in use...*/
  effectiv.applyDamage(damage=[], opts={}, id)
```
A helper function to allow users to apply damage.
See scripts/api.mjs for more information. These helpers are mostly untested and being included before documentation is complete.
___
###### **Technical Details**

**Scope:** Replaces the effects tray in chat messages with a similar one that allows all users, not just GMs or the chat message's creator, to apply active effects to tokens they control (and have selected) by looping over all messages in the "dnd5e.renderChatMessage" hook. Extends the system's damage application element class to allow users who are not GMs to use the damage tray. Additionally, transmits target target and change data via sockets to allow an active GM client to apply effects (or damage) to a non GM user's targets.

**License:** MIT License.

**Additional Info:** Thanks to Zhell for help with adding actors to a set and lots of other stuff (and for the github action), and to Flix for much encouragement. Thanks also to ChaosOS for help with sockets, and DrentalBot for help with suppressing the system's context menu.
