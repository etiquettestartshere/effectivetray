import { moduleSettings } from "./scripts/settings.mjs";
import { effectiveSocket, effectiveTray } from "./scripts/effective-tray.mjs";

Hooks.once("init", effectiveSocket.init);
Hooks.once("init", moduleSettings.init);
Hooks.once("init", effectiveTray.init);