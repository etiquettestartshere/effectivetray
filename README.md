# Effective Tray (for D&D Fifth Edition)
A module for dnd5e on foundryvtt that allows the effects tray to be used more effectively.

## What it does 
#### TLDR: Left click to apply to selected tokens, right click to apply to targeted tokens.
Allows users to apply active effects to tokens from chat cards even if they do not own the actor that made the chat card.
- Adds a setting (on by default) that allows users to *apply effects to targeted tokens* by right clicking the apply button.
- Adds a setting (on by default) that starts the effects tray in its expanded position.
- Adds a setting (on by default) that removes 'Apply Effect to Actor' from any effect with a duration when any item with an effect is created (dragged & droppped).
- Allows filtering based on actor type, permissions, and token disposition. This prevents users from interacting with effects of certain origins, depending on GM preference (no filtering is performed by default).
- Adds a setting (off by default) that deletes an effect rather than toggling it if a user attempts to transfer a duplicate effect.
- Adds a setting (off by default) to disable the main function of the module, in order to just use the additional features.

___
###### **Technical Details**

**Scope:** Replaces the effects tray in chat messages with a similar one that allows all users, not just GMs or the chat message's creator, to apply active effects to tokens they control (and have selected) by looping over all messages in the "dnd5e.renderChatMessage" hook. Additionally, transmits effect and target data via sockets to allow an active GM client to apply effects to a non GM user's targets.

**License:** MIT License.

**Additional Info:** Thanks to Zhell for help with adding actors to a set, and to Flix for encouragement.
