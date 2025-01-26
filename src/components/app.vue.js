/// <reference types="../../node_modules/.vue-global-types/vue_3.4_false.d.ts" />
import { ref, onMounted } from "vue";
import { f7, f7ready } from "framework7-vue";
import routes from "../js/routes";
import store from "../js/store";
import viewsManager from "../js/views-manager";
import { registerSW } from "virtual:pwa-register";
const needRefresh = ref(false);
const updateSW = registerSW({
  onNeedRefresh() {
    needRefresh.value = true;
  },
});
const updateApp = () => {
  f7.dialog.preloader("Обновляем приложение...");
  updateSW();
};
// Framework7 Parameters
const f7params = {
  name: "Валаамский календарь и молитвослов", // App name
  theme: "md",
  // App store
  store: store,
  // App routes
  routes: routes,
  // Register service worker (only on production build)
  // serviceWorker: process.env.NODE_ENV ==='production' ? {
  //   path: '/service-worker.js',
  // } : {},
};
onMounted(() => {
  f7ready(() => {
    viewsManager();
    // Call F7 APIs here
  });
}); /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
  const __VLS_ctx = {};
  let __VLS_components;
  let __VLS_directives;
  // CSS variable injection
  // CSS variable injection end
  const __VLS_0 = {}.F7App;
  /** @type { [typeof __VLS_components.F7App, typeof __VLS_components.f7App, typeof __VLS_components.F7App, typeof __VLS_components.f7App, ] } */ // @ts-ignore
  const __VLS_1 = __VLS_asFunctionalComponent(
    __VLS_0,
    new __VLS_0({
      ...__VLS_ctx.f7params,
    }),
  );
  const __VLS_2 = __VLS_1(
    {
      ...__VLS_ctx.f7params,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_1),
  );
  var __VLS_6 = {};
  const __VLS_7 = {}.F7Panel;
  /** @type { [typeof __VLS_components.F7Panel, typeof __VLS_components.f7Panel, typeof __VLS_components.F7Panel, typeof __VLS_components.f7Panel, ] } */ // @ts-ignore
  const __VLS_8 = __VLS_asFunctionalComponent(
    __VLS_7,
    new __VLS_7({
      left: true,
      cover: true,
      dark: true,
    }),
  );
  const __VLS_9 = __VLS_8(
    {
      left: true,
      cover: true,
      dark: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_8),
  );
  const __VLS_13 = {}.F7View;
  /** @type { [typeof __VLS_components.F7View, typeof __VLS_components.f7View, typeof __VLS_components.F7View, typeof __VLS_components.f7View, ] } */ // @ts-ignore
  const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({}));
  const __VLS_15 = __VLS_14({}, ...__VLS_functionalComponentArgsRest(__VLS_14));
  const __VLS_19 = {}.F7Page;
  /** @type { [typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, ] } */ // @ts-ignore
  const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({}));
  const __VLS_21 = __VLS_20({}, ...__VLS_functionalComponentArgsRest(__VLS_20));
  const __VLS_25 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({}));
  const __VLS_27 = __VLS_26({}, ...__VLS_functionalComponentArgsRest(__VLS_26));
  const __VLS_31 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_32 = __VLS_asFunctionalComponent(
    __VLS_31,
    new __VLS_31({
      title: "О МОНАСТЫРЕ",
      link: "#",
    }),
  );
  const __VLS_33 = __VLS_32(
    {
      title: "О МОНАСТЫРЕ",
      link: "#",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_32),
  );
  const __VLS_37 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_38 = __VLS_asFunctionalComponent(
    __VLS_37,
    new __VLS_37({
      title: "ПОМЯННИК",
      link: "#",
    }),
  );
  const __VLS_39 = __VLS_38(
    {
      title: "ПОМЯННИК",
      link: "#",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_38),
  );
  const __VLS_43 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_44 = __VLS_asFunctionalComponent(
    __VLS_43,
    new __VLS_43({
      title: "МОИ ЗАПИСКИ",
      link: "#",
    }),
  );
  const __VLS_45 = __VLS_44(
    {
      title: "МОИ ЗАПИСКИ",
      link: "#",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_44),
  );
  const __VLS_49 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_50 = __VLS_asFunctionalComponent(
    __VLS_49,
    new __VLS_49({
      title: "НАПОМИНАНИЯ",
      link: "#",
    }),
  );
  const __VLS_51 = __VLS_50(
    {
      title: "НАПОМИНАНИЯ",
      link: "#",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_50),
  );
  const __VLS_55 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_56 = __VLS_asFunctionalComponent(
    __VLS_55,
    new __VLS_55({
      title: "НАСТРОЙКИ",
      link: "#",
    }),
  );
  const __VLS_57 = __VLS_56(
    {
      title: "НАСТРОЙКИ",
      link: "#",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_56),
  );
  const __VLS_61 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_62 = __VLS_asFunctionalComponent(
    __VLS_61,
    new __VLS_61({
      title: "О ПРИЛОЖЕНИИ",
      link: "#",
    }),
  );
  const __VLS_63 = __VLS_62(
    {
      title: "О ПРИЛОЖЕНИИ",
      link: "#",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_62),
  );
  const __VLS_67 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_68 = __VLS_asFunctionalComponent(
    __VLS_67,
    new __VLS_67({
      title: "ПОИСК",
      link: "#",
    }),
  );
  const __VLS_69 = __VLS_68(
    {
      title: "ПОИСК",
      link: "#",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_68),
  );
  __VLS_30.slots.default;
  var __VLS_30;
  const __VLS_73 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_74 = __VLS_asFunctionalComponent(
    __VLS_73,
    new __VLS_73({
      ...{ class: "position-bottom" },
    }),
  );
  const __VLS_75 = __VLS_74(
    {
      ...{ class: "position-bottom" },
    },
    ...__VLS_functionalComponentArgsRest(__VLS_74),
  );
  if (__VLS_ctx.needRefresh) {
    const __VLS_79 = {}.F7Button;
    /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
    const __VLS_80 = __VLS_asFunctionalComponent(
      __VLS_79,
      new __VLS_79({
        ...{ onClick: {} },
        fill: true,
      }),
    );
    const __VLS_81 = __VLS_80(
      {
        ...{ onClick: {} },
        fill: true,
      },
      ...__VLS_functionalComponentArgsRest(__VLS_80),
    );
    let __VLS_85;
    const __VLS_86 = {
      onClick: __VLS_ctx.updateApp,
    };
    let __VLS_82;
    let __VLS_83;
    __VLS_84.slots.default;
    var __VLS_84;
  }
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({});
  __VLS_ctx.store.state.version;
  __VLS_78.slots.default;
  var __VLS_78;
  const __VLS_87 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({}));
  const __VLS_89 = __VLS_88({}, ...__VLS_functionalComponentArgsRest(__VLS_88));
  __VLS_24.slots.default;
  var __VLS_24;
  __VLS_18.slots.default;
  var __VLS_18;
  __VLS_12.slots.default;
  var __VLS_12;
  const __VLS_93 = {}.F7Views;
  /** @type { [typeof __VLS_components.F7Views, typeof __VLS_components.f7Views, typeof __VLS_components.F7Views, typeof __VLS_components.f7Views, ] } */ // @ts-ignore
  const __VLS_94 = __VLS_asFunctionalComponent(
    __VLS_93,
    new __VLS_93({
      tabs: true,
      ...{ class: "safe-areas" },
    }),
  );
  const __VLS_95 = __VLS_94(
    {
      tabs: true,
      ...{ class: "safe-areas" },
    },
    ...__VLS_functionalComponentArgsRest(__VLS_94),
  );
  const __VLS_99 = {}.F7Toolbar;
  /** @type { [typeof __VLS_components.F7Toolbar, typeof __VLS_components.f7Toolbar, typeof __VLS_components.F7Toolbar, typeof __VLS_components.f7Toolbar, ] } */ // @ts-ignore
  const __VLS_100 = __VLS_asFunctionalComponent(
    __VLS_99,
    new __VLS_99({
      tabbar: true,
      icons: true,
      bottom: true,
    }),
  );
  const __VLS_101 = __VLS_100(
    {
      tabbar: true,
      icons: true,
      bottom: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_100),
  );
  const __VLS_105 = {}.F7Link;
  /** @type { [typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, ] } */ // @ts-ignore
  const __VLS_106 = __VLS_asFunctionalComponent(
    __VLS_105,
    new __VLS_105({
      tabLink: "#view-main",
      tabLinkActive: true,
      iconMd: "material:home",
      text: "Главная",
    }),
  );
  const __VLS_107 = __VLS_106(
    {
      tabLink: "#view-main",
      tabLinkActive: true,
      iconMd: "material:home",
      text: "Главная",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_106),
  );
  const __VLS_111 = {}.F7Link;
  /** @type { [typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, ] } */ // @ts-ignore
  const __VLS_112 = __VLS_asFunctionalComponent(
    __VLS_111,
    new __VLS_111({
      tabLink: "#view-prayers",
      iconMd: "material:menu_book",
      text: "Молитвослов",
    }),
  );
  const __VLS_113 = __VLS_112(
    {
      tabLink: "#view-prayers",
      iconMd: "material:menu_book",
      text: "Молитвослов",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_112),
  );
  const __VLS_117 = {}.F7Link;
  /** @type { [typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, ] } */ // @ts-ignore
  const __VLS_118 = __VLS_asFunctionalComponent(
    __VLS_117,
    new __VLS_117({
      tabLink: "#view-calendar",
      iconMd: "material:date_range",
      text: "Календарь",
    }),
  );
  const __VLS_119 = __VLS_118(
    {
      tabLink: "#view-calendar",
      iconMd: "material:date_range",
      text: "Календарь",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_118),
  );
  const __VLS_123 = {}.F7Link;
  /** @type { [typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, ] } */ // @ts-ignore
  const __VLS_124 = __VLS_asFunctionalComponent(
    __VLS_123,
    new __VLS_123({
      tabLink: "#view-books",
      iconMd: "material:book",
      text: "API",
    }),
  );
  const __VLS_125 = __VLS_124(
    {
      tabLink: "#view-books",
      iconMd: "material:book",
      text: "API",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_124),
  );
  const __VLS_129 = {}.F7Link;
  /** @type { [typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, ] } */ // @ts-ignore
  const __VLS_130 = __VLS_asFunctionalComponent(
    __VLS_129,
    new __VLS_129({
      tabLink: "#view-rites",
      iconMd: "material:whatshot",
      text: "Поминовения",
    }),
  );
  const __VLS_131 = __VLS_130(
    {
      tabLink: "#view-rites",
      iconMd: "material:whatshot",
      text: "Поминовения",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_130),
  );
  __VLS_104.slots.default;
  var __VLS_104;
  const __VLS_135 = {}.F7View;
  /** @type { [typeof __VLS_components.F7View, typeof __VLS_components.f7View, typeof __VLS_components.F7View, typeof __VLS_components.f7View, ] } */ // @ts-ignore
  const __VLS_136 = __VLS_asFunctionalComponent(
    __VLS_135,
    new __VLS_135({
      id: "view-main",
      main: true,
      tab: true,
      tabActive: true,
      url: "/",
    }),
  );
  const __VLS_137 = __VLS_136(
    {
      id: "view-main",
      main: true,
      tab: true,
      tabActive: true,
      url: "/",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_136),
  );
  const __VLS_141 = {}.F7View;
  /** @type { [typeof __VLS_components.F7View, typeof __VLS_components.f7View, typeof __VLS_components.F7View, typeof __VLS_components.f7View, ] } */ // @ts-ignore
  const __VLS_142 = __VLS_asFunctionalComponent(
    __VLS_141,
    new __VLS_141({
      id: "view-prayers",
      name: "prayers",
      tab: true,
      url: "/catalog/",
    }),
  );
  const __VLS_143 = __VLS_142(
    {
      id: "view-prayers",
      name: "prayers",
      tab: true,
      url: "/catalog/",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_142),
  );
  const __VLS_147 = {}.F7View;
  /** @type { [typeof __VLS_components.F7View, typeof __VLS_components.f7View, typeof __VLS_components.F7View, typeof __VLS_components.f7View, ] } */ // @ts-ignore
  const __VLS_148 = __VLS_asFunctionalComponent(
    __VLS_147,
    new __VLS_147({
      id: "view-calendar",
      name: "calendar",
      tab: true,
      url: "/calendar/",
    }),
  );
  const __VLS_149 = __VLS_148(
    {
      id: "view-calendar",
      name: "calendar",
      tab: true,
      url: "/calendar/",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_148),
  );
  const __VLS_153 = {}.F7View;
  /** @type { [typeof __VLS_components.F7View, typeof __VLS_components.f7View, typeof __VLS_components.F7View, typeof __VLS_components.f7View, ] } */ // @ts-ignore
  const __VLS_154 = __VLS_asFunctionalComponent(
    __VLS_153,
    new __VLS_153({
      id: "view-books",
      name: "books",
      tab: true,
      url: "/api-test/",
    }),
  );
  const __VLS_155 = __VLS_154(
    {
      id: "view-books",
      name: "books",
      tab: true,
      url: "/api-test/",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_154),
  );
  const __VLS_159 = {}.F7View;
  /** @type { [typeof __VLS_components.F7View, typeof __VLS_components.f7View, typeof __VLS_components.F7View, typeof __VLS_components.f7View, ] } */ // @ts-ignore
  const __VLS_160 = __VLS_asFunctionalComponent(
    __VLS_159,
    new __VLS_159({
      id: "view-rites",
      name: "rites",
      tab: true,
      url: "/rites/",
    }),
  );
  const __VLS_161 = __VLS_160(
    {
      id: "view-rites",
      name: "rites",
      tab: true,
      url: "/rites/",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_160),
  );
  __VLS_98.slots.default;
  var __VLS_98;
  const __VLS_165 = {}.F7Popup;
  /** @type { [typeof __VLS_components.F7Popup, typeof __VLS_components.f7Popup, typeof __VLS_components.F7Popup, typeof __VLS_components.f7Popup, ] } */ // @ts-ignore
  const __VLS_166 = __VLS_asFunctionalComponent(
    __VLS_165,
    new __VLS_165({
      id: "my-popup",
    }),
  );
  const __VLS_167 = __VLS_166(
    {
      id: "my-popup",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_166),
  );
  const __VLS_171 = {}.F7View;
  /** @type { [typeof __VLS_components.F7View, typeof __VLS_components.f7View, typeof __VLS_components.F7View, typeof __VLS_components.f7View, ] } */ // @ts-ignore
  const __VLS_172 = __VLS_asFunctionalComponent(__VLS_171, new __VLS_171({}));
  const __VLS_173 = __VLS_172(
    {},
    ...__VLS_functionalComponentArgsRest(__VLS_172),
  );
  const __VLS_177 = {}.F7Page;
  /** @type { [typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, ] } */ // @ts-ignore
  const __VLS_178 = __VLS_asFunctionalComponent(__VLS_177, new __VLS_177({}));
  const __VLS_179 = __VLS_178(
    {},
    ...__VLS_functionalComponentArgsRest(__VLS_178),
  );
  const __VLS_183 = {}.F7Navbar;
  /** @type { [typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, ] } */ // @ts-ignore
  const __VLS_184 = __VLS_asFunctionalComponent(
    __VLS_183,
    new __VLS_183({
      title: "Попапчик",
    }),
  );
  const __VLS_185 = __VLS_184(
    {
      title: "Попапчик",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_184),
  );
  const __VLS_189 = {}.F7NavRight;
  /** @type { [typeof __VLS_components.F7NavRight, typeof __VLS_components.f7NavRight, typeof __VLS_components.F7NavRight, typeof __VLS_components.f7NavRight, ] } */ // @ts-ignore
  const __VLS_190 = __VLS_asFunctionalComponent(__VLS_189, new __VLS_189({}));
  const __VLS_191 = __VLS_190(
    {},
    ...__VLS_functionalComponentArgsRest(__VLS_190),
  );
  const __VLS_195 = {}.F7Link;
  /** @type { [typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, ] } */ // @ts-ignore
  const __VLS_196 = __VLS_asFunctionalComponent(
    __VLS_195,
    new __VLS_195({
      popupClose: true,
    }),
  );
  const __VLS_197 = __VLS_196(
    {
      popupClose: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_196),
  );
  __VLS_200.slots.default;
  var __VLS_200;
  __VLS_194.slots.default;
  var __VLS_194;
  __VLS_188.slots.default;
  var __VLS_188;
  const __VLS_201 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_202 = __VLS_asFunctionalComponent(__VLS_201, new __VLS_201({}));
  const __VLS_203 = __VLS_202(
    {},
    ...__VLS_functionalComponentArgsRest(__VLS_202),
  );
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({});
  __VLS_206.slots.default;
  var __VLS_206;
  __VLS_182.slots.default;
  var __VLS_182;
  __VLS_176.slots.default;
  var __VLS_176;
  __VLS_170.slots.default;
  var __VLS_170;
  __VLS_5.slots.default;
  var __VLS_5;
  ["position-bottom", "safe-areas"];
  var __VLS_slots;
  var $slots;
  let __VLS_inheritedAttrs;
  var $attrs;
  const __VLS_refs = {};
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
      store: store,
      needRefresh: needRefresh,
      updateApp: updateApp,
      f7params: f7params,
    };
  },
});
export default (await import("vue")).defineComponent({
  setup() {
    return {};
  },
}); /* PartiallyEnd: #4569/main.vue */
