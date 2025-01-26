<template>
  <f7-page>
    <f7-navbar title="Product" back-link="Back"></f7-navbar>
    <f7-block v-if="product">
      <h2>{{ product.title }}</h2>
      <p>{{ product.description }}</p>
    </f7-block>
  </f7-page>
</template>
<script setup lang="ts">
import { f7, useStore } from "framework7-vue";
import { Product } from "../js/store";

const products = useStore("products");
const props = defineProps({ id: String });
const productId = props.id;

console.log("Product props", props);

let product: Product;
products.value.forEach(function (el: Product) {
  if (el.id === productId) {
    product = el;
  }
});
</script>
