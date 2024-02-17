# Effective Tray (for D&D Fifth Edition)
A module for dnd5e on foundryvtt that allows the effects tray to be used more effectively.

## What it does 
Allows users to apply active effects to selected tokens from chat cards even if they do not own the actor that made the chat card.
- Adds a setting (on by default) that starts the effects tray in its expanded position.
- Adds a setting (on by default) that removes 'Apply Effect to Actor' from any effect with a duration when any item with an effect is created (dragged & droppped).
- Allows filtering based on actor type, permissions, and token disposition. This prevents users from interacting with effects of certain origin, depending on GM preference.
- Adds a setting (off by default) to disable the main function of the module, in order to just use the additional features.

## What it doesn't do
Allow users to apply active effects to targets, or to tokens they do not own.

___
###### **Technical Details**

**Scope:** Replaces the effects tray in chat messages with a similar one that allows all users, not just GMs or the chat message's creator, to apply active effects to tokens they control (and have selected) by looping over all messages in the "dnd5e.renderChatMessage" hook.

**License:** MIT License.

**Additional Info:** Thanks to Zhell for help with adding actors to a set, and to Flix for encouragement.
