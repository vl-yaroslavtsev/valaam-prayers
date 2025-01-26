const props = defineProps({ user: Object });
const user = props.user; /* PartiallyEnd: #3632/scriptSetup.vue */
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
      title: `${__VLS_ctx.user.firstName} ${__VLS_ctx.user.lastName}`,
      backLink: "Back",
    }),
  );
  const __VLS_9 = __VLS_8(
    {
      title: `${__VLS_ctx.user.firstName} ${__VLS_ctx.user.lastName}`,
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
  __VLS_ctx.user.about;
  __VLS_18.slots.default;
  var __VLS_18;
  const __VLS_19 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_20 = __VLS_asFunctionalComponent(
    __VLS_19,
    new __VLS_19({
      strong: true,
      inset: true,
      dividersIos: true,
    }),
  );
  const __VLS_21 = __VLS_20(
    {
      strong: true,
      inset: true,
      dividersIos: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_20),
  );
  for (const [link, index] of __VLS_getVForSourceType(__VLS_ctx.user.links)) {
    const __VLS_25 = {}.F7ListItem;
    /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent(
      __VLS_25,
      new __VLS_25({
        key: index,
        link: link.url,
        title: link.title,
        external: true,
        target: "_blank",
      }),
    );
    const __VLS_27 = __VLS_26(
      {
        key: index,
        link: link.url,
        title: link.title,
        external: true,
        target: "_blank",
      },
      ...__VLS_functionalComponentArgsRest(__VLS_26),
    );
  }
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
const __VLS_self = (await import("vue")).defineComponent({
  setup() {
    return {
      user: user,
    };
  },
  props: { user: Object },
});
export default (await import("vue")).defineComponent({
  setup() {
    return {};
  },
  props: { user: Object },
}); /* PartiallyEnd: #4569/main.vue */
