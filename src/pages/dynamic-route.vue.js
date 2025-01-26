/// <reference types="../../node_modules/.vue-global-types/vue_3.4_false.d.ts" />
export default (await import("vue")).defineComponent({
  props: {
    f7route: Object,
    f7router: Object,
  },
}); /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
  const __VLS_ctx = {};
  let __VLS_components;
  let __VLS_directives;
  const __VLS_0 = {}.F7Page;
  /** @type { [typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, ] } */ // @ts-ignore
  const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
  const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
  var __VLS_6 = {};
  const __VLS_7 = {}.F7Navbar;
  /** @type { [typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, ] } */ // @ts-ignore
  const __VLS_8 = __VLS_asFunctionalComponent(
    __VLS_7,
    new __VLS_7({
      title: "Dynamic Route",
      backLink: "Back",
    }),
  );
  const __VLS_9 = __VLS_8(
    {
      title: "Dynamic Route",
      backLink: "Back",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_8),
  );
  const __VLS_13 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_14 = __VLS_asFunctionalComponent(
    __VLS_13,
    new __VLS_13({
      strong: true,
      inset: true,
    }),
  );
  const __VLS_15 = __VLS_14(
    {
      strong: true,
      inset: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_14),
  );
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.ul,
    __VLS_intrinsicElements.ul,
  )({});
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.li,
    __VLS_intrinsicElements.li,
  )({});
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.b,
    __VLS_intrinsicElements.b,
  )({});
  __VLS_ctx.f7route.url;
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.li,
    __VLS_intrinsicElements.li,
  )({});
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.b,
    __VLS_intrinsicElements.b,
  )({});
  __VLS_ctx.f7route.path;
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.li,
    __VLS_intrinsicElements.li,
  )({});
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.b,
    __VLS_intrinsicElements.b,
  )({});
  __VLS_ctx.f7route.hash;
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.li,
    __VLS_intrinsicElements.li,
  )({});
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.b,
    __VLS_intrinsicElements.b,
  )({});
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.ul,
    __VLS_intrinsicElements.ul,
  )({});
  for (const [value, key] of __VLS_getVForSourceType(
    __VLS_ctx.f7route.params,
  )) {
    __VLS_elementAsFunction(
      __VLS_intrinsicElements.li,
      __VLS_intrinsicElements.li,
    )({
      key: key,
    });
    __VLS_elementAsFunction(
      __VLS_intrinsicElements.b,
      __VLS_intrinsicElements.b,
    )({});
    key;
    value;
  }
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.li,
    __VLS_intrinsicElements.li,
  )({});
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.b,
    __VLS_intrinsicElements.b,
  )({});
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.ul,
    __VLS_intrinsicElements.ul,
  )({});
  for (const [value, key] of __VLS_getVForSourceType(__VLS_ctx.f7route.query)) {
    __VLS_elementAsFunction(
      __VLS_intrinsicElements.li,
      __VLS_intrinsicElements.li,
    )({
      key: key,
    });
    __VLS_elementAsFunction(
      __VLS_intrinsicElements.b,
      __VLS_intrinsicElements.b,
    )({});
    key;
    value;
  }
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.li,
    __VLS_intrinsicElements.li,
  )({});
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.b,
    __VLS_intrinsicElements.b,
  )({});
  __VLS_ctx.f7route.route.path;
  __VLS_18.slots.default;
  var __VLS_18;
  const __VLS_19 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_20 = __VLS_asFunctionalComponent(
    __VLS_19,
    new __VLS_19({
      strong: true,
      inset: true,
    }),
  );
  const __VLS_21 = __VLS_20(
    {
      strong: true,
      inset: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_20),
  );
  const __VLS_25 = {}.F7Link;
  /** @type { [typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, typeof __VLS_components.F7Link, typeof __VLS_components.f7Link, ] } */ // @ts-ignore
  const __VLS_26 = __VLS_asFunctionalComponent(
    __VLS_25,
    new __VLS_25({
      ...{ onClick: {} },
    }),
  );
  const __VLS_27 = __VLS_26(
    {
      ...{ onClick: {} },
    },
    ...__VLS_functionalComponentArgsRest(__VLS_26),
  );
  let __VLS_31;
  const __VLS_32 = {
    onClick: (...[$event]) => {
      __VLS_ctx.f7router.back();
    },
  };
  let __VLS_28;
  let __VLS_29;
  __VLS_30.slots.default;
  var __VLS_30;
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
