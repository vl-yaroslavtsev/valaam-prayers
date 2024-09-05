<template>
  <f7-page name="product">
    <f7-navbar :title="product.title" back-link="Back"></f7-navbar>
    <f7-block-title>About {{ product.title }}</f7-block-title>
    <f7-block>
      {{ product.description }}
    </f7-block>
  </f7-page>
</template>
<script>
import { f7, useStore } from 'framework7-vue';


export default {
  props: {
    f7route: Object,
  },
  setup(props) {
    const products = useStore('products');
    const version = useStore('version');
    const productId = props.f7route.params.id;
    let currentProduct;
    products.value.forEach(function (product) {
      if (product.id === productId) {
        currentProduct = product;
      }
    });

    console.log(`App version:`, f7.store.state.version);
    console.log(`App version:`, version.value);

    return {
      product: currentProduct,
    };
  },
};
</script>
