import { MODULE } from "./const.mjs";

export class moduleSettings {

  static init() {
    moduleSettings._chatSettings();
  };

  static _chatSettings() {
    game.settings.register(MODULE, 'expandEffect', {
      name: "EFFECTIVETRAY.ExpandEffectSettingName",
      hint: "EFFECTIVETRAY.ExpandEffectSettingHint",
      scope: "client",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: false,
      onChange: false
    });

    game.settings.register(MODULE, 'removeTransfer', {
      name: "EFFECTIVETRAY.RemoveTransferSettingName",
      hint: "EFFECTIVETRAY.RemoveTransferSettingHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: false,
      onChange: false
    });

    game.settings.register(MODULE, 'ignoreNPC', {
      name: "EFFECTIVETRAY.IgnoreNPCSettingName",
      hint: "EFFECTIVETRAY.IgnoreNPCSettingHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      requiresReload: true,
      onChange: false
    });

    game.settings.register(MODULE, 'filterPermission', {
      name: "EFFECTIVETRAY.FilterPermissionSettingName",
      hint: "EFFECTIVETRAY.FilterPermissionSettingHint",
      scope: "world",
      config: true,
      type: Number,
      default: 0,
      requiresReload: true,
      choices: {
        0: "None",
        1: "Limited",
        2: "Observer"
      }
    });

    game.settings.register(MODULE, 'systemDefault', {
      name: "EFFECTIVETRAY.SystemDefaultSettingName",
      hint: "EFFECTIVETRAY.SystemDefaultSettingHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      requiresReload: true,
      onChange: false
    });
  };
};