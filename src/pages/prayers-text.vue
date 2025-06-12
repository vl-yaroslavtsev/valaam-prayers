<template>
  <f7-page
    @click="onPageClick"
  >
    <f7-navbar
      ref="navbar"
      hidden
    >
      <f7-nav-left :back-link="true"></f7-nav-left>
      <f7-nav-title sliding>{{ title }}</f7-nav-title>
      <f7-nav-right
        ><f7-link icon-md="f7:search"
      /></f7-nav-right>
    </f7-navbar>
    <h1>{{ title }}</h1>
    <div v-html="text"></div>
  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, useTemplateRef } from "vue";
import type { Router } from "framework7/types";
import { f7 } from "framework7-vue";

import { useTheme } from "@/composables/useTheme";
import { usePrayersStore, BOOKS_SECTION_ID } from "@/stores/prayers";
import { useReadingHistoryStore } from "@/stores/readingHistory";

const { elementId, f7router } = defineProps<{
  elementId: string;
  f7router: Router.Router;
}>();

interface Navbar  {
  show: (animated: boolean) => void;
  hide: (animated: boolean) => void;
}

const { isDarkMode } = useTheme();
const navbar = useTemplateRef<Navbar>("navbar");

const prayersStore = usePrayersStore();
const historyStore = useReadingHistoryStore();

const prayer = computed(() => prayersStore.getItemById(elementId));
const title = computed(() => prayer.value?.name);
const text = ref<string>("");

watchEffect(async () => {
  try {
    const prayersData = await import(`../../test-data/prayers-text/${elementId}.json`);
    // console.log(prayersData);
    text.value = prayersData.slavonic_text || prayersData.ru_text || prayersData.csl_text;
  } catch (error) {
    text.value = "Данные не найдены";
  }
})();

let isNavbarHidden = true;

const onPageClick = () => {
  if (!navbar.value) return;

  console.log(f7);

  if (isNavbarHidden) {
    navbar.value.show(true);
  } else {
    navbar.value.hide(true);
  }
  isNavbarHidden = !isNavbarHidden;
};

</script>
<style scoped lang="less">

</style>
