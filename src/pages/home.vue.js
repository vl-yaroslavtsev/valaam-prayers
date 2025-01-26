/// <reference types="../../node_modules/.vue-global-types/vue_3.4_false.d.ts" />
import { defineComponent } from "vue";
import { f7 } from "framework7-vue";
export default defineComponent({
  name: "HomePage",
  setup() {
    return {
      f7,
    };
  },
}); /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
  const __VLS_ctx = {};
  let __VLS_components;
  let __VLS_directives;
  const __VLS_0 = {}.F7Page;
  /** @type { [typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, ] } */ // @ts-ignore
  const __VLS_1 = __VLS_asFunctionalComponent(
    __VLS_0,
    new __VLS_0({
      name: "home",
    }),
  );
  const __VLS_2 = __VLS_1(
    {
      name: "home",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_1),
  );
  var __VLS_6 = {};
  const __VLS_7 = {}.F7Navbar;
  /** @type { [typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, ] } */ // @ts-ignore
  const __VLS_8 = __VLS_asFunctionalComponent(
    __VLS_7,
    new __VLS_7({
      large: true,
      sliding: false,
    }),
  );
  const __VLS_9 = __VLS_8(
    {
      large: true,
      sliding: false,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_8),
  );
  const __VLS_13 = {}.F7NavLeft;
  /** @type { [typeof __VLS_components.F7NavLeft, typeof __VLS_components.f7NavLeft, typeof __VLS_components.F7NavLeft, typeof __VLS_components.f7NavLeft, ] } */ // @ts-ignore
  const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({}));
  const __VLS_15 = __VLS_14({}, ...__VLS_functionalComponentArgsRest(__VLS_14));
  const __VLS_19 = {}.F7Link;
  /** @type { [typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, ] } */ // @ts-ignore
  const __VLS_20 = __VLS_asFunctionalComponent(
    __VLS_19,
    new __VLS_19({
      iconMd: "material:menu",
      panelOpen: "left",
    }),
  );
  const __VLS_21 = __VLS_20(
    {
      iconMd: "material:menu",
      panelOpen: "left",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_20),
  );
  __VLS_18.slots.default;
  var __VLS_18;
  const __VLS_25 = {}.F7NavTitle;
  /** @type { [typeof __VLS_components.F7NavTitle, typeof __VLS_components.f7NavTitle, typeof __VLS_components.F7NavTitle, typeof __VLS_components.f7NavTitle, ] } */ // @ts-ignore
  const __VLS_26 = __VLS_asFunctionalComponent(
    __VLS_25,
    new __VLS_25({
      sliding: true,
    }),
  );
  const __VLS_27 = __VLS_26(
    {
      sliding: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_26),
  );
  __VLS_30.slots.default;
  var __VLS_30;
  const __VLS_31 = {}.F7NavTitleLarge;
  /** @type { [typeof __VLS_components.F7NavTitleLarge, typeof __VLS_components.f7NavTitleLarge, typeof __VLS_components.F7NavTitleLarge, typeof __VLS_components.f7NavTitleLarge, ] } */ // @ts-ignore
  const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({}));
  const __VLS_33 = __VLS_32({}, ...__VLS_functionalComponentArgsRest(__VLS_32));
  __VLS_36.slots.default;
  var __VLS_36;
  __VLS_12.slots.default;
  var __VLS_12;
  const __VLS_37 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({}));
  const __VLS_39 = __VLS_38({}, ...__VLS_functionalComponentArgsRest(__VLS_38));
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({});
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({});
  __VLS_42.slots.default;
  var __VLS_42;
  const __VLS_43 = {}.F7BlockTitle;
  /** @type { [typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, ] } */ // @ts-ignore
  const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({}));
  const __VLS_45 = __VLS_44({}, ...__VLS_functionalComponentArgsRest(__VLS_44));
  __VLS_48.slots.default;
  var __VLS_48;
  const __VLS_49 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_50 = __VLS_asFunctionalComponent(
    __VLS_49,
    new __VLS_49({
      strong: true,
      inset: true,
      dividersIos: true,
    }),
  );
  const __VLS_51 = __VLS_50(
    {
      strong: true,
      inset: true,
      dividersIos: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_50),
  );
  const __VLS_55 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_56 = __VLS_asFunctionalComponent(
    __VLS_55,
    new __VLS_55({
      link: "/about/",
      title: "About",
    }),
  );
  const __VLS_57 = __VLS_56(
    {
      link: "/about/",
      title: "About",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_56),
  );
  const __VLS_61 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_62 = __VLS_asFunctionalComponent(
    __VLS_61,
    new __VLS_61({
      link: "/form/",
      title: "Form",
    }),
  );
  const __VLS_63 = __VLS_62(
    {
      link: "/form/",
      title: "Form",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_62),
  );
  __VLS_54.slots.default;
  var __VLS_54;
  const __VLS_67 = {}.F7BlockTitle;
  /** @type { [typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, ] } */ // @ts-ignore
  const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({}));
  const __VLS_69 = __VLS_68({}, ...__VLS_functionalComponentArgsRest(__VLS_68));
  __VLS_72.slots.default;
  var __VLS_72;
  const __VLS_73 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_74 = __VLS_asFunctionalComponent(
    __VLS_73,
    new __VLS_73({
      ...{ class: "grid grid-cols-2 grid-gap" },
    }),
  );
  const __VLS_75 = __VLS_74(
    {
      ...{ class: "grid grid-cols-2 grid-gap" },
    },
    ...__VLS_functionalComponentArgsRest(__VLS_74),
  );
  const __VLS_79 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_80 = __VLS_asFunctionalComponent(
    __VLS_79,
    new __VLS_79({
      fill: true,
      popupOpen: "#my-popup",
    }),
  );
  const __VLS_81 = __VLS_80(
    {
      fill: true,
      popupOpen: "#my-popup",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_80),
  );
  __VLS_84.slots.default;
  var __VLS_84;
  __VLS_78.slots.default;
  var __VLS_78;
  const __VLS_85 = {}.F7BlockTitle;
  /** @type { [typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, ] } */ // @ts-ignore
  const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({}));
  const __VLS_87 = __VLS_86({}, ...__VLS_functionalComponentArgsRest(__VLS_86));
  __VLS_90.slots.default;
  var __VLS_90;
  const __VLS_91 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_92 = __VLS_asFunctionalComponent(
    __VLS_91,
    new __VLS_91({
      ...{ class: "grid grid-cols-2 grid-gap" },
    }),
  );
  const __VLS_93 = __VLS_92(
    {
      ...{ class: "grid grid-cols-2 grid-gap" },
    },
    ...__VLS_functionalComponentArgsRest(__VLS_92),
  );
  const __VLS_97 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_98 = __VLS_asFunctionalComponent(
    __VLS_97,
    new __VLS_97({
      fill: true,
      panelOpen: "left",
    }),
  );
  const __VLS_99 = __VLS_98(
    {
      fill: true,
      panelOpen: "left",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_98),
  );
  __VLS_102.slots.default;
  var __VLS_102;
  const __VLS_103 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_104 = __VLS_asFunctionalComponent(
    __VLS_103,
    new __VLS_103({
      fill: true,
      panelOpen: "right",
    }),
  );
  const __VLS_105 = __VLS_104(
    {
      fill: true,
      panelOpen: "right",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_104),
  );
  __VLS_108.slots.default;
  var __VLS_108;
  __VLS_96.slots.default;
  var __VLS_96;
  const __VLS_109 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_110 = __VLS_asFunctionalComponent(
    __VLS_109,
    new __VLS_109({
      strong: true,
      inset: true,
      dividersIos: true,
    }),
  );
  const __VLS_111 = __VLS_110(
    {
      strong: true,
      inset: true,
      dividersIos: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_110),
  );
  const __VLS_115 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_116 = __VLS_asFunctionalComponent(
    __VLS_115,
    new __VLS_115({
      title: "Dynamic (Component) Route",
      link: "/dynamic-route/blog/45/post/125/?foo=bar#about",
    }),
  );
  const __VLS_117 = __VLS_116(
    {
      title: "Dynamic (Component) Route",
      link: "/dynamic-route/blog/45/post/125/?foo=bar#about",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_116),
  );
  const __VLS_121 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_122 = __VLS_asFunctionalComponent(
    __VLS_121,
    new __VLS_121({
      title: "Default Route (404)",
      link: "/load-something-that-doesnt-exist/",
    }),
  );
  const __VLS_123 = __VLS_122(
    {
      title: "Default Route (404)",
      link: "/load-something-that-doesnt-exist/",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_122),
  );
  const __VLS_127 = {}.F7ListItem;
  /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
  const __VLS_128 = __VLS_asFunctionalComponent(
    __VLS_127,
    new __VLS_127({
      title: "Request Data & Load",
      link: "/request-and-load/user/123456/",
    }),
  );
  const __VLS_129 = __VLS_128(
    {
      title: "Request Data & Load",
      link: "/request-and-load/user/123456/",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_128),
  );
  __VLS_114.slots.default;
  var __VLS_114;
  __VLS_5.slots.default;
  var __VLS_5;
  ["grid", "grid-cols-2", "grid-gap", "grid", "grid-cols-2", "grid-gap"];
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
let __VLS_self;
