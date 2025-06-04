<template>
  <f7-page>
    <f7-navbar large>
      <f7-nav-left>
        <f7-link panel-open="left" v-html="BurgerIcon"></f7-link>
      </f7-nav-left>
      <f7-nav-title sliding>Молитвослов</f7-nav-title>
      <f7-nav-title-large>Сейчас читаю</f7-nav-title-large>
    </f7-navbar>
    <f7-list>
      <f7-list-item
        v-for="product in products"
        :key="product.id"
        :title="product.title"
        :link="`/product/${product.id}/`"
      >     
    </f7-list-item>
    </f7-list>
    <f7-block v-if="products.length === 3">
      <f7-button fill @click="addProduct">Add Product</f7-button>
    </f7-block>
  </f7-page>
</template>

<script setup lang="ts">
import { useStore } from "framework7-vue";
import store, { Product } from "../js/store";
import BurgerIcon from "/icons/burger.svg?raw";

const products = useStore("products") as Product[];

const addProduct = () => {
  store.dispatch("addProduct", {
    id: "4",
    title: "Apple iPhone 12",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nisi tempora similique reiciendis, error nesciunt vero, blanditiis pariatur dolor, minima sed sapiente rerum, dolorem corrupti hic modi praesentium unde saepe perspiciatis.",
  });
};
</script>
