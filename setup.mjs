import { moduleSettings } from "./scripts/settings.mjs";
import { effectiveTray } from "./scripts/effective-tray.mjs";

Hooks.once("init", moduleSettings.init);
Hooks.once("init", effectiveTray.init);