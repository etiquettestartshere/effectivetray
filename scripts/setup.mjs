import { moduleSettings } from "./settings.mjs";
import { effectiveSocket, effectiveTray, effectiveDamage } from "./effective-tray.mjs";

Hooks.once("init", effectiveSocket.init);
Hooks.once("init", moduleSettings.init);
Hooks.once("init", effectiveTray.init);
Hooks.once("init", effectiveDamage.init);