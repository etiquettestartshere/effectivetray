import { MODULE } from "./const.mjs";

export class moduleSettings {

  static init() {
    moduleSettings._chatSettings();
  };

  static _chatSettings() {
    game.settings.register(MODULE, "allowTarget", {
      name: "EFFECTIVETRAY.AllowTargetSettingName",
      hint: "EFFECTIVETRAY.AllowTargetSettingHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true,
      onChange: false
    });

    game.settings.register(MODULE, "damageTarget", {
      name: "EFFECTIVETRAY.DamageTargetSettingName",
      hint: "EFFECTIVETRAY.DamageTargetSettingHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      requiresReload: true,
      onChange: false
    });

    game.settings.register(MODULE, "deleteInstead", {
      name: "EFFECTIVETRAY.DeleteInsteadSettingName",
      hint: "EFFECTIVETRAY.DeleteInsteadSettingHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      requiresReload: true,
      onChange: false
    });

    game.settings.register(MODULE, "flagLevel", {
      name: "EFFECTIVETRAY.FlagLevelSettingName",
      hint: "EFFECTIVETRAY.FlagLevelSettingHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      requiresReload: false,
      onChange: false
    });

    game.settings.register(MODULE, "ignoreNPC", {
      name: "EFFECTIVETRAY.IgnoreNPCSettingName",
      hint: "EFFECTIVETRAY.IgnoreNPCSettingHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      requiresReload: true,
      onChange: false
    });

    game.settings.register(MODULE, "filterPermission", {
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

    game.settings.register(MODULE, "filterDisposition", {
      name: "EFFECTIVETRAY.FilterDispositionSettingName",
      hint: "EFFECTIVETRAY.FilterDispositionSettingHint",
      scope: "world",
      config: true,
      type: Number,
      default: 0,
      requiresReload: true,
      choices: {
        0: "None",
        1: "Secret",
        2: "Hostile",
        3: "Neutral"
      }
    });

    game.settings.register(MODULE, "systemDefault", {
      name: "EFFECTIVETRAY.SystemDefaultSettingName",
      hint: "EFFECTIVETRAY.SystemDefaultSettingHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      requiresReload: true,
      onChange: false
    });

    game.settings.register(MODULE, "damageDefault", {
      name: "EFFECTIVETRAY.DamageDefaultSettingName",
      hint: "EFFECTIVETRAY.DamageDefaultSettingHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      requiresReload: true,
      onChange: false
    });

    game.settings.register(MODULE, "expandEffect", {
      name: "EFFECTIVETRAY.ExpandEffectSettingName",
      hint: "EFFECTIVETRAY.ExpandEffectSettingHint",
      scope: "client",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true,
      onChange: false
    });

    game.settings.register(MODULE, "expandDamage", {
      name: "EFFECTIVETRAY.ExpandDamageSettingName",
      hint: "EFFECTIVETRAY.ExpandDamageSettingHint",
      scope: "client",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true,
      onChange: false
    });

    game.settings.register(MODULE, "dontCloseOnPress", {
      name: "EFFECTIVETRAY.DontCloseOnPressSettingName",
      hint: "EFFECTIVETRAY.DontCloseOnPressSettingHint",
      scope: "client",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true,
      onChange: false
    });

    game.settings.register(MODULE, "scrollOnExpand", {
      name: "EFFECTIVETRAY.ScrollOnExpandName",
      hint: "EFFECTIVETRAY.ScrollOnExpandHint",
      scope: "client",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: false,
      onChange: false
    })

    game.settings.register(MODULE, "removeTransfer", {
      name: "EFFECTIVETRAY.RemoveTransferSettingName",
      hint: "EFFECTIVETRAY.RemoveTransferSettingHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: false,
      onChange: false
    });
  };
};