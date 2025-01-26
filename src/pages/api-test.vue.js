/// <reference types="../../node_modules/.vue-global-types/vue_3.4_false.d.ts" />
import { add } from "date-fns";
import { ref, watch, onMounted } from "vue";
import { f7, f7ready } from "framework7-vue";
import { Dom7 as $ } from "framework7";
import deviceAPI from "../js/device/device-api";
import { testBrowser } from "../js/device/browser-test";
const currentBrightness = ref(0);
deviceAPI
  .getBrightness()
  .then((brightness) => (currentBrightness.value = brightness));
const onBrightnessChange = (newVal) => {
  console.log("onBrightnessChange = ", newVal);
  deviceAPI.setBrightness(newVal);
};
const resetBrightness = () => {
  deviceAPI.resetBrightness();
  setTimeout(async () => {
    currentBrightness.value = await deviceAPI.getBrightness();
  }, 0);
};
const showThemeAlert = async () => {
  const theme = await deviceAPI.getTheme();
  f7.dialog.alert(`Тема устройства: ${theme}`);
};
const isStatusBarShown = ref(true);
watch(isStatusBarShown, (newVal) => {
  deviceAPI.showStatusBar(newVal);
  console.log("isStatusBarShown", newVal);
});
const isFullscreen = ref(false);
watch(isFullscreen, (newVal) => {
  deviceAPI.setFullScreen(newVal);
  console.log("isFullscreen", newVal);
});
const isKeepScreenOn = ref(false);
watch(isKeepScreenOn, (newVal) => {
  deviceAPI.keepScreenOn(newVal);
  console.log("isKeepScreenOn", newVal);
});
const statusBarColor = ref("#000000");
const setStatusBarColor = () => {
  deviceAPI.setStatusBarColor(statusBarColor.value);
  console.log(statusBarColor.value);
};
const сontentRef = ref(null);
const isVolumeButtonsScroll = ref(false);
watch(isVolumeButtonsScroll, (newVal) => {
  //console.log("watch: pageContentRef", сontentRef.value);
  console.log(сontentRef.value.$el);
  const $сontent = $(сontentRef.value.$el);
  if (newVal) {
    deviceAPI.onVolumeKey((keyCode, event) => {
      switch (keyCode) {
        case deviceAPI.KEYCODE_VOLUME_UP:
          $сontent.scrollTop($сontent.scrollTop() - 50, 200);
          break;
        case deviceAPI.KEYCODE_VOLUME_DOWN:
          $сontent.scrollTop($сontent.scrollTop() + 50, 200);
          break;
      }
    });
  } else {
    deviceAPI.offVolumeKey();
  }
});
const addNotification = () => {
  const notification = {
    id: "123",
    title: "Завтра праздник",
    description: "Описание праздника",
    date: add(new Date(), { seconds: 30 }),
    url: "https://molitvoslov.valaam.ru/app/#view-calendar:/days/20241001",
  };
  console.log("notif", notification);
  deviceAPI.addNotification(notification).then((isGranted) => {
    f7.dialog.alert(`Права на уведомления ${isGranted}`);
  });
};
/**
 * Тестируем фичи клиента.
 */
const testBrowserFitures = async () => {
  const msg = await testBrowser(f7.device);
  f7.dialog.alert(msg);
};
console.log(f7); /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
  const __VLS_ctx = {};
  let __VLS_components;
  let __VLS_directives;
  const __VLS_0 = {}.F7Page;
  /** @type { [typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, ] } */ // @ts-ignore
  const __VLS_1 = __VLS_asFunctionalComponent(
    __VLS_0,
    new __VLS_0({
      name: "apiTest",
      pageContent: false,
    }),
  );
  const __VLS_2 = __VLS_1(
    {
      name: "apiTest",
      pageContent: false,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_1),
  );
  var __VLS_6 = {};
  const __VLS_7 = {}.F7PageContent;
  /** @type { [typeof __VLS_components.F7PageContent, typeof __VLS_components.f7PageContent, typeof __VLS_components.F7PageContent, typeof __VLS_components.f7PageContent, ] } */ // @ts-ignore
  const __VLS_8 = __VLS_asFunctionalComponent(
    __VLS_7,
    new __VLS_7({
      ref: "сontentRef",
    }),
  );
  const __VLS_9 = __VLS_8(
    {
      ref: "сontentRef",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_8),
  );
  // @ts-ignore navigation for `const сontentRef = ref()`
  /** @type { typeof __VLS_ctx['сontentRef'] } */ var __VLS_13 = {};
  const __VLS_14 = {}.F7Navbar;
  /** @type { [typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, ] } */ // @ts-ignore
  const __VLS_15 = __VLS_asFunctionalComponent(
    __VLS_14,
    new __VLS_14({
      title: "Тест JS API",
    }),
  );
  const __VLS_16 = __VLS_15(
    {
      title: "Тест JS API",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_15),
  );
  const __VLS_20 = {}.F7BlockTitle;
  /** @type { [typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, ] } */ // @ts-ignore
  const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
  const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
  __VLS_25.slots.default;
  var __VLS_25;
  const __VLS_26 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_27 = __VLS_asFunctionalComponent(
    __VLS_26,
    new __VLS_26({
      strongIos: true,
      outlineIos: true,
      ...{ class: "grid grid-cols-2 grid-gap" },
    }),
  );
  const __VLS_28 = __VLS_27(
    {
      strongIos: true,
      outlineIos: true,
      ...{ class: "grid grid-cols-2 grid-gap" },
    },
    ...__VLS_functionalComponentArgsRest(__VLS_27),
  );
  const __VLS_32 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_33 = __VLS_asFunctionalComponent(
    __VLS_32,
    new __VLS_32({
      ...{ onClick: {} },
      fill: true,
    }),
  );
  const __VLS_34 = __VLS_33(
    {
      ...{ onClick: {} },
      fill: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_33),
  );
  let __VLS_38;
  const __VLS_39 = {
    onClick: __VLS_ctx.testBrowserFitures,
  };
  let __VLS_35;
  let __VLS_36;
  __VLS_37.slots.default;
  var __VLS_37;
  __VLS_31.slots.default;
  var __VLS_31;
  const __VLS_40 = {}.F7BlockTitle;
  /** @type { [typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, ] } */ // @ts-ignore
  const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({}));
  const __VLS_42 = __VLS_41({}, ...__VLS_functionalComponentArgsRest(__VLS_41));
  __VLS_45.slots.default;
  var __VLS_45;
  const __VLS_46 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_47 = __VLS_asFunctionalComponent(
    __VLS_46,
    new __VLS_46({
      simpleList: true,
      outlineIos: true,
      strongIos: true,
    }),
  );
  const __VLS_48 = __VLS_47(
    {
      simpleList: true,
      outlineIos: true,
      strongIos: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_47),
  );
  const __VLS_52 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({}));
  const __VLS_54 = __VLS_53({}, ...__VLS_functionalComponentArgsRest(__VLS_53));
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.div,
    __VLS_intrinsicElements.div,
  )({});
  const __VLS_58 = {}.F7Icon;
  /** @type { [typeof __VLS_components.F7Icon, typeof __VLS_components.f7Icon, ] } */ // @ts-ignore
  const __VLS_59 = __VLS_asFunctionalComponent(
    __VLS_58,
    new __VLS_58({
      ios: "f7:sun_min",
      md: "material:brightness_low",
    }),
  );
  const __VLS_60 = __VLS_59(
    {
      ios: "f7:sun_min",
      md: "material:brightness_low",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_59),
  );
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.div,
    __VLS_intrinsicElements.div,
  )({
    ...{ style: {} },
  });
  const __VLS_64 = {}.F7Range;
  /** @type { [typeof __VLS_components.F7Range, typeof __VLS_components.f7Range, ] } */ // @ts-ignore
  const __VLS_65 = __VLS_asFunctionalComponent(
    __VLS_64,
    new __VLS_64({
      ...{ "onRange:change": {} },
      min: 0,
      max: 100,
      step: 1,
      value: __VLS_ctx.currentBrightness,
      label: true,
      color: "orange",
    }),
  );
  const __VLS_66 = __VLS_65(
    {
      ...{ "onRange:change": {} },
      min: 0,
      max: 100,
      step: 1,
      value: __VLS_ctx.currentBrightness,
      label: true,
      color: "orange",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_65),
  );
  let __VLS_70;
  const __VLS_71 = {
    "onRange:change": __VLS_ctx.onBrightnessChange,
  };
  let __VLS_67;
  let __VLS_68;
  var __VLS_69;
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.div,
    __VLS_intrinsicElements.div,
  )({});
  const __VLS_72 = {}.F7Icon;
  /** @type { [typeof __VLS_components.F7Icon, typeof __VLS_components.f7Icon, ] } */ // @ts-ignore
  const __VLS_73 = __VLS_asFunctionalComponent(
    __VLS_72,
    new __VLS_72({
      ios: "f7:sun_max_fill",
      md: "material:brightness_high",
    }),
  );
  const __VLS_74 = __VLS_73(
    {
      ios: "f7:sun_max_fill",
      md: "material:brightness_high",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_73),
  );
  __VLS_57.slots.default;
  var __VLS_57;
  const __VLS_78 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({}));
  const __VLS_80 = __VLS_79({}, ...__VLS_functionalComponentArgsRest(__VLS_79));
  const __VLS_84 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_85 = __VLS_asFunctionalComponent(
    __VLS_84,
    new __VLS_84({
      ...{ onClick: {} },
      fill: true,
    }),
  );
  const __VLS_86 = __VLS_85(
    {
      ...{ onClick: {} },
      fill: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_85),
  );
  let __VLS_90;
  const __VLS_91 = {
    onClick: __VLS_ctx.resetBrightness,
  };
  let __VLS_87;
  let __VLS_88;
  __VLS_89.slots.default;
  var __VLS_89;
  __VLS_83.slots.default;
  var __VLS_83;
  __VLS_51.slots.default;
  var __VLS_51;
  const __VLS_92 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_93 = __VLS_asFunctionalComponent(
    __VLS_92,
    new __VLS_92({
      strongIos: true,
      outlineIos: true,
      ...{ class: "grid grid-cols-2 grid-gap" },
    }),
  );
  const __VLS_94 = __VLS_93(
    {
      strongIos: true,
      outlineIos: true,
      ...{ class: "grid grid-cols-2 grid-gap" },
    },
    ...__VLS_functionalComponentArgsRest(__VLS_93),
  );
  const __VLS_98 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_99 = __VLS_asFunctionalComponent(
    __VLS_98,
    new __VLS_98({
      ...{ onClick: {} },
      fill: true,
    }),
  );
  const __VLS_100 = __VLS_99(
    {
      ...{ onClick: {} },
      fill: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_99),
  );
  let __VLS_104;
  const __VLS_105 = {
    onClick: __VLS_ctx.showThemeAlert,
  };
  let __VLS_101;
  let __VLS_102;
  __VLS_103.slots.default;
  var __VLS_103;
  __VLS_97.slots.default;
  var __VLS_97;
  const __VLS_106 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_107 = __VLS_asFunctionalComponent(
    __VLS_106,
    new __VLS_106({
      strongIos: true,
      dividersIos: true,
      outlineIos: true,
    }),
  );
  const __VLS_108 = __VLS_107(
    {
      strongIos: true,
      dividersIos: true,
      outlineIos: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_107),
  );
  const __VLS_112 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_113 = __VLS_asFunctionalComponent(
    __VLS_112,
    new __VLS_112({
      title: "Показывать статус бар",
    }),
  );
  const __VLS_114 = __VLS_113(
    {
      title: "Показывать статус бар",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_113),
  );
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.template,
    __VLS_intrinsicElements.template,
  )({});
  {
    const { after: __VLS_thisSlot } = __VLS_117.slots;
    const __VLS_118 = {}.F7Toggle;
    /** @type { [typeof __VLS_components.F7Toggle, typeof __VLS_components.f7Toggle, ] } */ // @ts-ignore
    const __VLS_119 = __VLS_asFunctionalComponent(
      __VLS_118,
      new __VLS_118({
        checked: __VLS_ctx.isStatusBarShown,
      }),
    );
    const __VLS_120 = __VLS_119(
      {
        checked: __VLS_ctx.isStatusBarShown,
      },
      ...__VLS_functionalComponentArgsRest(__VLS_119),
    );
  }
  var __VLS_117;
  __VLS_111.slots.default;
  var __VLS_111;
  const __VLS_124 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_125 = __VLS_asFunctionalComponent(
    __VLS_124,
    new __VLS_124({
      strongIos: true,
      dividersIos: true,
      outlineIos: true,
    }),
  );
  const __VLS_126 = __VLS_125(
    {
      strongIos: true,
      dividersIos: true,
      outlineIos: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_125),
  );
  const __VLS_130 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_131 = __VLS_asFunctionalComponent(
    __VLS_130,
    new __VLS_130({
      title: "Полный экран",
    }),
  );
  const __VLS_132 = __VLS_131(
    {
      title: "Полный экран",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_131),
  );
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.template,
    __VLS_intrinsicElements.template,
  )({});
  {
    const { after: __VLS_thisSlot } = __VLS_135.slots;
    const __VLS_136 = {}.F7Toggle;
    /** @type { [typeof __VLS_components.F7Toggle, typeof __VLS_components.f7Toggle, ] } */ // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(
      __VLS_136,
      new __VLS_136({
        checked: __VLS_ctx.isFullscreen,
      }),
    );
    const __VLS_138 = __VLS_137(
      {
        checked: __VLS_ctx.isFullscreen,
      },
      ...__VLS_functionalComponentArgsRest(__VLS_137),
    );
  }
  var __VLS_135;
  __VLS_129.slots.default;
  var __VLS_129;
  const __VLS_142 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_143 = __VLS_asFunctionalComponent(
    __VLS_142,
    new __VLS_142({
      strongIos: true,
      dividersIos: true,
      outlineIos: true,
    }),
  );
  const __VLS_144 = __VLS_143(
    {
      strongIos: true,
      dividersIos: true,
      outlineIos: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_143),
  );
  const __VLS_148 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_149 = __VLS_asFunctionalComponent(
    __VLS_148,
    new __VLS_148({
      title: "Не гасить экран",
    }),
  );
  const __VLS_150 = __VLS_149(
    {
      title: "Не гасить экран",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_149),
  );
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.template,
    __VLS_intrinsicElements.template,
  )({});
  {
    const { after: __VLS_thisSlot } = __VLS_153.slots;
    const __VLS_154 = {}.F7Toggle;
    /** @type { [typeof __VLS_components.F7Toggle, typeof __VLS_components.f7Toggle, ] } */ // @ts-ignore
    const __VLS_155 = __VLS_asFunctionalComponent(
      __VLS_154,
      new __VLS_154({
        checked: __VLS_ctx.isKeepScreenOn,
      }),
    );
    const __VLS_156 = __VLS_155(
      {
        checked: __VLS_ctx.isKeepScreenOn,
      },
      ...__VLS_functionalComponentArgsRest(__VLS_155),
    );
  }
  var __VLS_153;
  __VLS_147.slots.default;
  var __VLS_147;
  const __VLS_160 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_161 = __VLS_asFunctionalComponent(
    __VLS_160,
    new __VLS_160({
      strongIos: true,
      outlineIos: true,
    }),
  );
  const __VLS_162 = __VLS_161(
    {
      strongIos: true,
      outlineIos: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_161),
  );
  const __VLS_166 = {}.F7ListInput;
  /** @type { [typeof __VLS_components.F7ListInput, typeof __VLS_components.f7ListInput, typeof __VLS_components.F7ListInput, typeof __VLS_components.f7ListInput, ] } */ // @ts-ignore
  const __VLS_167 = __VLS_asFunctionalComponent(
    __VLS_166,
    new __VLS_166({
      label: "Цвет статусбара",
      type: "text",
      placeholder: "#000000",
      value: __VLS_ctx.statusBarColor,
    }),
  );
  const __VLS_168 = __VLS_167(
    {
      label: "Цвет статусбара",
      type: "text",
      placeholder: "#000000",
      value: __VLS_ctx.statusBarColor,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_167),
  );
  const __VLS_172 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({}));
  const __VLS_174 = __VLS_173(
    {},
    ...__VLS_functionalComponentArgsRest(__VLS_173),
  );
  const __VLS_178 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_179 = __VLS_asFunctionalComponent(
    __VLS_178,
    new __VLS_178({
      ...{ onClick: {} },
      fill: true,
    }),
  );
  const __VLS_180 = __VLS_179(
    {
      ...{ onClick: {} },
      fill: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_179),
  );
  let __VLS_184;
  const __VLS_185 = {
    onClick: __VLS_ctx.setStatusBarColor,
  };
  let __VLS_181;
  let __VLS_182;
  __VLS_183.slots.default;
  var __VLS_183;
  __VLS_177.slots.default;
  var __VLS_177;
  __VLS_165.slots.default;
  var __VLS_165;
  const __VLS_186 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_187 = __VLS_asFunctionalComponent(
    __VLS_186,
    new __VLS_186({
      strongIos: true,
      dividersIos: true,
      outlineIos: true,
    }),
  );
  const __VLS_188 = __VLS_187(
    {
      strongIos: true,
      dividersIos: true,
      outlineIos: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_187),
  );
  const __VLS_192 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_193 = __VLS_asFunctionalComponent(
    __VLS_192,
    new __VLS_192({
      title: "Прокручивание с помощью кнопок громкости",
    }),
  );
  const __VLS_194 = __VLS_193(
    {
      title: "Прокручивание с помощью кнопок громкости",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_193),
  );
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.template,
    __VLS_intrinsicElements.template,
  )({});
  {
    const { after: __VLS_thisSlot } = __VLS_197.slots;
    const __VLS_198 = {}.F7Toggle;
    /** @type { [typeof __VLS_components.F7Toggle, typeof __VLS_components.f7Toggle, ] } */ // @ts-ignore
    const __VLS_199 = __VLS_asFunctionalComponent(
      __VLS_198,
      new __VLS_198({
        checked: __VLS_ctx.isVolumeButtonsScroll,
      }),
    );
    const __VLS_200 = __VLS_199(
      {
        checked: __VLS_ctx.isVolumeButtonsScroll,
      },
      ...__VLS_functionalComponentArgsRest(__VLS_199),
    );
  }
  var __VLS_197;
  __VLS_191.slots.default;
  var __VLS_191;
  const __VLS_204 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_205 = __VLS_asFunctionalComponent(
    __VLS_204,
    new __VLS_204({
      strongIos: true,
      outlineIos: true,
      ...{ class: "grid grid-cols-2 grid-gap" },
    }),
  );
  const __VLS_206 = __VLS_205(
    {
      strongIos: true,
      outlineIos: true,
      ...{ class: "grid grid-cols-2 grid-gap" },
    },
    ...__VLS_functionalComponentArgsRest(__VLS_205),
  );
  const __VLS_210 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_211 = __VLS_asFunctionalComponent(
    __VLS_210,
    new __VLS_210({
      ...{ onClick: {} },
      fill: true,
    }),
  );
  const __VLS_212 = __VLS_211(
    {
      ...{ onClick: {} },
      fill: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_211),
  );
  let __VLS_216;
  const __VLS_217 = {
    onClick: __VLS_ctx.addNotification,
  };
  let __VLS_213;
  let __VLS_214;
  __VLS_215.slots.default;
  var __VLS_215;
  __VLS_209.slots.default;
  var __VLS_209;
  const __VLS_218 = {}.F7BlockTitle;
  /** @type { [typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, ] } */ // @ts-ignore
  const __VLS_219 = __VLS_asFunctionalComponent(__VLS_218, new __VLS_218({}));
  const __VLS_220 = __VLS_219(
    {},
    ...__VLS_functionalComponentArgsRest(__VLS_219),
  );
  __VLS_223.slots.default;
  var __VLS_223;
  const __VLS_224 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_225 = __VLS_asFunctionalComponent(
    __VLS_224,
    new __VLS_224({
      strongIos: true,
      outlineIos: true,
      ...{ class: "grid grid-cols-2 grid-gap" },
    }),
  );
  const __VLS_226 = __VLS_225(
    {
      strongIos: true,
      outlineIos: true,
      ...{ class: "grid grid-cols-2 grid-gap" },
    },
    ...__VLS_functionalComponentArgsRest(__VLS_225),
  );
  const __VLS_230 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_231 = __VLS_asFunctionalComponent(__VLS_230, new __VLS_230({}));
  const __VLS_232 = __VLS_231(
    {},
    ...__VLS_functionalComponentArgsRest(__VLS_231),
  );
  __VLS_235.slots.default;
  var __VLS_235;
  const __VLS_236 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_237 = __VLS_asFunctionalComponent(
    __VLS_236,
    new __VLS_236({
      fill: true,
    }),
  );
  const __VLS_238 = __VLS_237(
    {
      fill: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_237),
  );
  __VLS_241.slots.default;
  var __VLS_241;
  const __VLS_242 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_243 = __VLS_asFunctionalComponent(
    __VLS_242,
    new __VLS_242({
      raised: true,
    }),
  );
  const __VLS_244 = __VLS_243(
    {
      raised: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_243),
  );
  __VLS_247.slots.default;
  var __VLS_247;
  const __VLS_248 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_249 = __VLS_asFunctionalComponent(
    __VLS_248,
    new __VLS_248({
      raised: true,
      fill: true,
    }),
  );
  const __VLS_250 = __VLS_249(
    {
      raised: true,
      fill: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_249),
  );
  __VLS_253.slots.default;
  var __VLS_253;
  const __VLS_254 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_255 = __VLS_asFunctionalComponent(
    __VLS_254,
    new __VLS_254({
      round: true,
    }),
  );
  const __VLS_256 = __VLS_255(
    {
      round: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_255),
  );
  __VLS_259.slots.default;
  var __VLS_259;
  const __VLS_260 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_261 = __VLS_asFunctionalComponent(
    __VLS_260,
    new __VLS_260({
      round: true,
      fill: true,
    }),
  );
  const __VLS_262 = __VLS_261(
    {
      round: true,
      fill: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_261),
  );
  __VLS_265.slots.default;
  var __VLS_265;
  const __VLS_266 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_267 = __VLS_asFunctionalComponent(
    __VLS_266,
    new __VLS_266({
      outline: true,
    }),
  );
  const __VLS_268 = __VLS_267(
    {
      outline: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_267),
  );
  __VLS_271.slots.default;
  var __VLS_271;
  const __VLS_272 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_273 = __VLS_asFunctionalComponent(
    __VLS_272,
    new __VLS_272({
      round: true,
      outline: true,
    }),
  );
  const __VLS_274 = __VLS_273(
    {
      round: true,
      outline: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_273),
  );
  __VLS_277.slots.default;
  var __VLS_277;
  const __VLS_278 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_279 = __VLS_asFunctionalComponent(
    __VLS_278,
    new __VLS_278({
      small: true,
      outline: true,
    }),
  );
  const __VLS_280 = __VLS_279(
    {
      small: true,
      outline: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_279),
  );
  __VLS_283.slots.default;
  var __VLS_283;
  const __VLS_284 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_285 = __VLS_asFunctionalComponent(
    __VLS_284,
    new __VLS_284({
      small: true,
      round: true,
      outline: true,
    }),
  );
  const __VLS_286 = __VLS_285(
    {
      small: true,
      round: true,
      outline: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_285),
  );
  __VLS_289.slots.default;
  var __VLS_289;
  const __VLS_290 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_291 = __VLS_asFunctionalComponent(
    __VLS_290,
    new __VLS_290({
      small: true,
      fill: true,
    }),
  );
  const __VLS_292 = __VLS_291(
    {
      small: true,
      fill: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_291),
  );
  __VLS_295.slots.default;
  var __VLS_295;
  const __VLS_296 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_297 = __VLS_asFunctionalComponent(
    __VLS_296,
    new __VLS_296({
      small: true,
      round: true,
      fill: true,
    }),
  );
  const __VLS_298 = __VLS_297(
    {
      small: true,
      round: true,
      fill: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_297),
  );
  __VLS_301.slots.default;
  var __VLS_301;
  const __VLS_302 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_303 = __VLS_asFunctionalComponent(
    __VLS_302,
    new __VLS_302({
      large: true,
      raised: true,
    }),
  );
  const __VLS_304 = __VLS_303(
    {
      large: true,
      raised: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_303),
  );
  __VLS_307.slots.default;
  var __VLS_307;
  const __VLS_308 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_309 = __VLS_asFunctionalComponent(
    __VLS_308,
    new __VLS_308({
      large: true,
      fill: true,
      raised: true,
    }),
  );
  const __VLS_310 = __VLS_309(
    {
      large: true,
      fill: true,
      raised: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_309),
  );
  __VLS_313.slots.default;
  var __VLS_313;
  const __VLS_314 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_315 = __VLS_asFunctionalComponent(
    __VLS_314,
    new __VLS_314({
      large: true,
      fill: true,
      raised: true,
      color: "red",
    }),
  );
  const __VLS_316 = __VLS_315(
    {
      large: true,
      fill: true,
      raised: true,
      color: "red",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_315),
  );
  __VLS_319.slots.default;
  var __VLS_319;
  const __VLS_320 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_321 = __VLS_asFunctionalComponent(
    __VLS_320,
    new __VLS_320({
      large: true,
      fill: true,
      raised: true,
      color: "green",
    }),
  );
  const __VLS_322 = __VLS_321(
    {
      large: true,
      fill: true,
      raised: true,
      color: "green",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_321),
  );
  __VLS_325.slots.default;
  var __VLS_325;
  __VLS_229.slots.default;
  var __VLS_229;
  const __VLS_326 = {}.F7BlockTitle;
  /** @type { [typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, ] } */ // @ts-ignore
  const __VLS_327 = __VLS_asFunctionalComponent(__VLS_326, new __VLS_326({}));
  const __VLS_328 = __VLS_327(
    {},
    ...__VLS_functionalComponentArgsRest(__VLS_327),
  );
  __VLS_331.slots.default;
  var __VLS_331;
  const __VLS_332 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_333 = __VLS_asFunctionalComponent(
    __VLS_332,
    new __VLS_332({
      strongIos: true,
      outlineIos: true,
      dividersIos: true,
    }),
  );
  const __VLS_334 = __VLS_333(
    {
      strongIos: true,
      outlineIos: true,
      dividersIos: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_333),
  );
  const __VLS_338 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_339 = __VLS_asFunctionalComponent(
    __VLS_338,
    new __VLS_338({
      checkbox: true,
      name: "my-checkbox",
      value: "Books",
      title: "Books",
    }),
  );
  const __VLS_340 = __VLS_339(
    {
      checkbox: true,
      name: "my-checkbox",
      value: "Books",
      title: "Books",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_339),
  );
  const __VLS_344 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_345 = __VLS_asFunctionalComponent(
    __VLS_344,
    new __VLS_344({
      checkbox: true,
      name: "my-checkbox",
      value: "Movies",
      title: "Movies",
    }),
  );
  const __VLS_346 = __VLS_345(
    {
      checkbox: true,
      name: "my-checkbox",
      value: "Movies",
      title: "Movies",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_345),
  );
  const __VLS_350 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_351 = __VLS_asFunctionalComponent(
    __VLS_350,
    new __VLS_350({
      checkbox: true,
      name: "my-checkbox",
      value: "Food",
      title: "Food",
    }),
  );
  const __VLS_352 = __VLS_351(
    {
      checkbox: true,
      name: "my-checkbox",
      value: "Food",
      title: "Food",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_351),
  );
  __VLS_337.slots.default;
  var __VLS_337;
  const __VLS_356 = {}.F7BlockTitle;
  /** @type { [typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, ] } */ // @ts-ignore
  const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({}));
  const __VLS_358 = __VLS_357(
    {},
    ...__VLS_functionalComponentArgsRest(__VLS_357),
  );
  __VLS_361.slots.default;
  var __VLS_361;
  const __VLS_362 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_363 = __VLS_asFunctionalComponent(
    __VLS_362,
    new __VLS_362({
      strongIos: true,
      outlineIos: true,
      dividersIos: true,
    }),
  );
  const __VLS_364 = __VLS_363(
    {
      strongIos: true,
      outlineIos: true,
      dividersIos: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_363),
  );
  const __VLS_368 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_369 = __VLS_asFunctionalComponent(
    __VLS_368,
    new __VLS_368({
      radio: true,
      name: "radio",
      value: "Books",
      title: "Books",
    }),
  );
  const __VLS_370 = __VLS_369(
    {
      radio: true,
      name: "radio",
      value: "Books",
      title: "Books",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_369),
  );
  const __VLS_374 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_375 = __VLS_asFunctionalComponent(
    __VLS_374,
    new __VLS_374({
      radio: true,
      name: "radio",
      value: "Movies",
      title: "Movies",
    }),
  );
  const __VLS_376 = __VLS_375(
    {
      radio: true,
      name: "radio",
      value: "Movies",
      title: "Movies",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_375),
  );
  const __VLS_380 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_381 = __VLS_asFunctionalComponent(
    __VLS_380,
    new __VLS_380({
      radio: true,
      name: "radio",
      value: "Food",
      title: "Food",
    }),
  );
  const __VLS_382 = __VLS_381(
    {
      radio: true,
      name: "radio",
      value: "Food",
      title: "Food",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_381),
  );
  __VLS_367.slots.default;
  var __VLS_367;
  __VLS_12.slots.default;
  var __VLS_12;
  __VLS_5.slots.default;
  var __VLS_5;
  [
    "grid",
    "grid-cols-2",
    "grid-gap",
    "grid",
    "grid-cols-2",
    "grid-gap",
    "grid",
    "grid-cols-2",
    "grid-gap",
    "grid",
    "grid-cols-2",
    "grid-gap",
  ];
  var __VLS_slots;
  var $slots;
  let __VLS_inheritedAttrs;
  var $attrs;
  const __VLS_refs = {
    сontentRef: __VLS_13,
  };
  var $refs;
  var $el;
  return {
    attrs: {},
    slots: __VLS_slots,
    refs: $refs,
    rootEl: $el,
  };
}
const __VLS_self = (await import("vue")).defineComponent({
  setup() {
    return {
      currentBrightness: currentBrightness,
      onBrightnessChange: onBrightnessChange,
      resetBrightness: resetBrightness,
      showThemeAlert: showThemeAlert,
      isStatusBarShown: isStatusBarShown,
      isFullscreen: isFullscreen,
      isKeepScreenOn: isKeepScreenOn,
      statusBarColor: statusBarColor,
      setStatusBarColor: setStatusBarColor,
      isVolumeButtonsScroll: isVolumeButtonsScroll,
      addNotification: addNotification,
      testBrowserFitures: testBrowserFitures,
    };
  },
});
export default (await import("vue")).defineComponent({
  setup() {
    return {};
  },
}); /* PartiallyEnd: #4569/main.vue */
