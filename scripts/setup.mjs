import { ModuleSettings } from "./settings.mjs";
import { EffectiveTray } from "./effective-tray.mjs";
import { EffectiveSocket } from "./effective-socket.mjs";
import EffectiveEAE from "./effect-application.mjs";
import EffectiveDAE from "./damage-application.mjs";
import { API } from "./api.mjs";

window.customElements.define("effective-effect-application", EffectiveEAE);
window.customElements.define("effective-damage-application", EffectiveDAE);

Hooks.once("init", EffectiveSocket.init);
Hooks.once("init", ModuleSettings.init);
Hooks.once("init", EffectiveTray.init);
Hooks.once("init", API.init);