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

    game.settings.register(MODULE, "contextTarget", {
      name: "EFFECTIVETRAY.ContextTargetSettingName",
      hint: "EFFECTIVETRAY.ContextTargetSettingHint",
      scope: "client",
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
        0: "EFFECTIVETRAY.NoFilter",
        1: "OWNERSHIP.LIMITED",
        2: "OWNERSHIP.OBSERVER"
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
        0: "EFFECTIVETRAY.NoFilter",
        1: "TOKEN.DISPOSITION.SECRET",
        2: "TOKEN.DISPOSITION.HOSTILE",
        3: "TOKEN.DISPOSITION.NEUTRAL"
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

    /*
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
    */

    game.settings.register(MODULE, "dontCloseOnPress", {
      name: "EFFECTIVETRAY.DontCloseOnPressSettingName",
      hint: "EFFECTIVETRAY.DontCloseOnPressSettingHint",
      scope: "client",
      config: true,
      type: Boolean,
      default: false,
      requiresReload: true,
      onChange: false
    });

    game.settings.register(MODULE, "scrollOnExpand", {
      name: "EFFECTIVETRAY.ScrollOnExpandSettingName",
      hint: "EFFECTIVETRAY.ScrollOnExpandSettingHint",
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

    game.settings.register(MODULE, "multipleConcentrationEffects", {
      name: "EFFECTIVETRAY.MultipleConcentrationEffectsSettingName",
      hint: "EFFECTIVETRAY.MultipleConcentrationEffectsSettingHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      requiresReload: false,
      onChange: false
    });
  };
};