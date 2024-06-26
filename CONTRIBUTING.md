# Contributing to Effective Tray
- If you want to contribute, if your fix or suggestion is short and easy to understand, you can just make a PR. For anything more complicated, please make an issue first. 
- Any style is fine, any kind of suggestion is fine. PRs that touch more than one issue or idea are also fine as long as they come with an explanation. 
- Bear in mind my skill is limited and that will change what might get implemented. 
※ *Please do not change anything to typescript.*

## Branches to Target
- For small fixes, target the branch with the version the smallest increment up from the current release (generally **N.N.X**).
- For fixes in line with a major system release, target the next major release (generally **N.X.N**).
- Generally speaking, make your PR targets branches with current milestones.
※ *If the above information becomes inapplicable, perhaps because I forgot to update it or development of a new branch has not yet started, just target the main branch.*

## Translation
- As of 1.1.4, the module should be fully localized. If you would like to make a translation, please make a PR with `effectivetray/lang/<lang>.json` that has localized keys, referring to `en.json` as your template. I believe partial translations should be fine, as it will default to `en` in cases where a translation key is lacking. If you are uncomfortable making a PR but want to contribute a translation anyway, contact me on discord or make an issue.