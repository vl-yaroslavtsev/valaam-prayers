/// <reference types="../../node_modules/.vue-global-types/vue_3.4_false.d.ts" />
import { useStore } from "framework7-vue";
import store from "../js/store";
const products = useStore("products");
const addProduct = () => {
  store.dispatch("addProduct", {
    id: "4",
    title: "Apple iPhone 12",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nisi tempora similique reiciendis, error nesciunt vero, blanditiis pariatur dolor, minima sed sapiente rerum, dolorem corrupti hic modi praesentium unde saepe perspiciatis.",
  });
}; /* PartiallyEnd: #3632/scriptSetup.vue */
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
      title: "Catalog",
      backLink: "Back",
    }),
  );
  const __VLS_9 = __VLS_8(
    {
      title: "Catalog",
      backLink: "Back",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_8),
  );
  const __VLS_13 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({}));
  const __VLS_15 = __VLS_14({}, ...__VLS_functionalComponentArgsRest(__VLS_14));
  for (const [product] of __VLS_getVForSourceType(__VLS_ctx.products)) {
    const __VLS_19 = {}.F7ListItem;
    /** @type { [typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, typeof __VLS_components.F7ListItem, typeof __VLS_components.f7ListItem, ] } */ // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent(
      __VLS_19,
      new __VLS_19({
        key: product.id,
        title: product.title,
        link: `/product/${product.id}/`,
      }),
    );
    const __VLS_21 = __VLS_20(
      {
        key: product.id,
        title: product.title,
        link: `/product/${product.id}/`,
      },
      ...__VLS_functionalComponentArgsRest(__VLS_20),
    );
  }
  __VLS_18.slots.default;
  var __VLS_18;
  if (__VLS_ctx.products.length === 3) {
    const __VLS_25 = {}.F7Block;
    /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({}));
    const __VLS_27 = __VLS_26(
      {},
      ...__VLS_functionalComponentArgsRest(__VLS_26),
    );
    const __VLS_31 = {}.F7Button;
    /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent(
      __VLS_31,
      new __VLS_31({
        ...{ onClick: {} },
        fill: true,
      }),
    );
    const __VLS_33 = __VLS_32(
      {
        ...{ onClick: {} },
        fill: true,
      },
      ...__VLS_functionalComponentArgsRest(__VLS_32),
    );
    let __VLS_37;
    const __VLS_38 = {
      onClick: __VLS_ctx.addProduct,
    };
    let __VLS_34;
    let __VLS_35;
    __VLS_36.slots.default;
    var __VLS_36;
    __VLS_30.slots.default;
    var __VLS_30;
  }
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
      products: products,
      addProduct: addProduct,
    };
  },
});
export default (await import("vue")).defineComponent({
  setup() {
    return {};
  },
}); /* PartiallyEnd: #4569/main.vue */
