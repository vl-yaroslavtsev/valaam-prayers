/// <reference types="../../node_modules/.vue-global-types/vue_3.4_false.d.ts" />
import { f7, useStore } from "framework7-vue";
export default (await import("vue")).defineComponent({
  props: {
    f7route: Object,
  },
  setup(props) {
    const days = useStore("days");
    const dayId = props.f7route.params.id;
    let currentDay;
    days.value.forEach(function (day) {
      if (day.id === dayId) {
        currentDay = day;
      }
    });
    if (!currentDay) {
      currentDay = {
        id: dayId,
        title: "День " + dayId,
        description: "Описание дня " + dayId,
      };
    }
    console.log(`App version:`, f7.store.state.version);
    return {
      day: currentDay,
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
      name: "day",
    }),
  );
  const __VLS_2 = __VLS_1(
    {
      name: "day",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_1),
  );
  var __VLS_6 = {};
  const __VLS_7 = {}.F7Navbar;
  /** @type { [typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, ] } */ // @ts-ignore
  const __VLS_8 = __VLS_asFunctionalComponent(
    __VLS_7,
    new __VLS_7({
      title: __VLS_ctx.day.title,
      backLink: "Back",
    }),
  );
  const __VLS_9 = __VLS_8(
    {
      title: __VLS_ctx.day.title,
      backLink: "Back",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_8),
  );
  const __VLS_13 = {}.F7BlockTitle;
  /** @type { [typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, ] } */ // @ts-ignore
  const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({}));
  const __VLS_15 = __VLS_14({}, ...__VLS_functionalComponentArgsRest(__VLS_14));
  __VLS_ctx.day.id;
  __VLS_18.slots.default;
  var __VLS_18;
  const __VLS_19 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({}));
  const __VLS_21 = __VLS_20({}, ...__VLS_functionalComponentArgsRest(__VLS_20));
  __VLS_ctx.day.description;
  __VLS_24.slots.default;
  var __VLS_24;
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
let __VLS_self;
