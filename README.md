# Effective Tray (for D&D Fifth Edition)
A module for dnd5e on foundryvtt that allows the effects and damage trays to be used more effectively.

## Effects Tray 
Allows users to use the effect tray as much or as little as wanted by the GM, up to and including transferal to targets they do not own. If using this feature (which is on by default), left click to apply effects to selected tokens that the user owns (as the system's default behavior), or right click to apply effects to tokens that the user does not own.
## Damage Tray
Allows users to use the damage tray for selected tokens that they own, and for targeted tokens (either that they own, or ones they don't own with a setting) User ability to use the damage tray is on by default, but unless the relevant setting is selected, they cannot damage targets.

## Settings
- Adds a setting (on by default) that allows users to apply effects to targeted tokens by right clicking the apply button.
- Adds a setting (off by default) that allows users to damage tokens they do not own.
- Adds a setting (off by default) that deletes an effect rather than toggling it if a user attempts to transfer a duplicate effect.
- Adds a setting (off by default) to flag active effects generated from the chat messages of spells which contains the spell's level (for use with macros or other modules) with the scope `ActiveEffect#flags.effectivetray.spellLevel`.
- Allows filtering based on actor type, permissions, and token disposition. This prevents users from seeing and interacting with effects of certain origins, depending on GM preference (no filtering is performed by default).
- Adds a setting (off by default) to use the default damage tray (in case only the settings below this one are desired).
- Adds a setting (off by default) to use the default damage tray.
- Adds settings (on by default) that starts the effects and damage trays in their expanded position.
- Adds a setting (on by default) that keeps the trays open after applying an effect or damage.
- Adds an experimental setting (on by default) to scroll the chat to bottom when expanding a tray, if it is already at bottom at the time of expanding.
- Adds a setting (on by default) that removes 'Apply Effect to Actor' from any effect with a duration when any item with an effect is created (dragged & droppped).
___
###### **Technical Details**

**Scope:** Replaces the effects tray in chat messages with a similar one that allows all users, not just GMs or the chat message's creator, to apply active effects to tokens they control (and have selected) by looping over all messages in the "dnd5e.renderChatMessage" hook. Extends the system's damage application element class to allow users who are not GMs to use the damage tray. Additionally, transmits target target and change data via sockets to allow an active GM client to apply effects (or damage) to a non GM user's targets.

**License:** MIT License.

**Additional Info:** Thanks to Zhell for help with adding actors to a set and lots of other stuff (and for the github action), and to Flix for much encouragement. Thanks also to ChaosOS for help with sockets, and DrentalBot for help with suppressing the system's context menu.
