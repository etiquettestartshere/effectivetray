import { moduleSettings } from "./settings.mjs";
import { effectiveSocket, effectiveTray, effectiveDamage } from "./effective-tray.mjs";
import EffectiveDAE from "./damage-application.mjs";

window.customElements.define("effective-damage-application", EffectiveDAE);

Hooks.once("init", effectiveSocket.init);
Hooks.once("init", moduleSettings.init);
Hooks.once("init", effectiveTray.init);
Hooks.once("init", effectiveDamage.init);

export { EffectiveDAE };