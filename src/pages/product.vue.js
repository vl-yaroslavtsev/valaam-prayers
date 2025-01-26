/// <reference types="../../node_modules/.vue-global-types/vue_3.4_false.d.ts" />
import { useStore } from "framework7-vue";
const products = useStore("products");
const props = defineProps({ id: String });
const productId = props.id;
console.log("Product props", props);
let product;
products.value.forEach(function (el) {
  if (el.id === productId) {
    product = el;
  }
}); /* PartiallyEnd: #3632/scriptSetup.vue */
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
      title: "Product",
      backLink: "Back",
    }),
  );
  const __VLS_9 = __VLS_8(
    {
      title: "Product",
      backLink: "Back",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_8),
  );
  if (__VLS_ctx.product) {
    const __VLS_13 = {}.F7Block;
    /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({}));
    const __VLS_15 = __VLS_14(
      {},
      ...__VLS_functionalComponentArgsRest(__VLS_14),
    );
    __VLS_elementAsFunction(
      __VLS_intrinsicElements.h2,
      __VLS_intrinsicElements.h2,
    )({});
    __VLS_ctx.product.title;
    __VLS_elementAsFunction(
      __VLS_intrinsicElements.p,
      __VLS_intrinsicElements.p,
    )({});
    __VLS_ctx.product.description;
    __VLS_18.slots.default;
    var __VLS_18;
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
      product: product,
    };
  },
  props: { id: String },
});
export default (await import("vue")).defineComponent({
  setup() {
    return {};
  },
  props: { id: String },
}); /* PartiallyEnd: #4569/main.vue */
