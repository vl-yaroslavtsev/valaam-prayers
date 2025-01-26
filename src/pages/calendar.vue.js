/// <reference types="../../node_modules/.vue-global-types/vue_3.4_false.d.ts" />
import { useStore } from "framework7-vue";
import store from "../js/store";
const days = useStore("days"); /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
  const __VLS_ctx = {};
  let __VLS_components;
  let __VLS_directives;
  const __VLS_0 = {}.F7Page;
  /** @type { [typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, ] } */ // @ts-ignore
  const __VLS_1 = __VLS_asFunctionalComponent(
    __VLS_0,
    new __VLS_0({
      name: "calendar",
    }),
  );
  const __VLS_2 = __VLS_1(
    {
      name: "calendar",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_1),
  );
  var __VLS_6 = {};
  const __VLS_7 = {}.F7Navbar;
  /** @type { [typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, ] } */ // @ts-ignore
  const __VLS_8 = __VLS_asFunctionalComponent(
    __VLS_7,
    new __VLS_7({
      title: "Календарь",
    }),
  );
  const __VLS_9 = __VLS_8(
    {
      title: "Календарь",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_8),
  );
  const __VLS_13 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_14 = __VLS_asFunctionalComponent(
    __VLS_13,
    new __VLS_13({
      strong: true,
      dividersIos: true,
      outlineIos: true,
      insetMd: true,
    }),
  );
  const __VLS_15 = __VLS_14(
    {
      strong: true,
      dividersIos: true,
      outlineIos: true,
      insetMd: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_14),
  );
  for (const [day] of __VLS_getVForSourceType(__VLS_ctx.days)) {
    const __VLS_19 = {}.F7ListItem;
    /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent(
      __VLS_19,
      new __VLS_19({
        key: day.id,
        title: day.title,
        link: `/days/${day.id}/`,
      }),
    );
    const __VLS_21 = __VLS_20(
      {
        key: day.id,
        title: day.title,
        link: `/days/${day.id}/`,
      },
      ...__VLS_functionalComponentArgsRest(__VLS_20),
    );
  }
  __VLS_18.slots.default;
  var __VLS_18;
  __VLS_5.slots.default;
  var __VLS_5;
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
      days: days,
    };
  },
});
export default (await import("vue")).defineComponent({
  setup() {
    return {};
  },
}); /* PartiallyEnd: #4569/main.vue */
