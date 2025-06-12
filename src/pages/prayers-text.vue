<template>
  <f7-page>
    <f7-navbar>
      <f7-nav-left :back-link="true">
        <f7-link
          panel-open="left"
          v-html="BurgerIcon"
        ></f7-link>
      </f7-nav-left>
      <f7-nav-title sliding>{{ title }}</f7-nav-title>
      <f7-nav-right
        ><f7-link icon-md="f7:search"
      /></f7-nav-right>
    </f7-navbar>
    <f7-block>
      Тута текст
    </f7-block>
  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed, useTemplateRef, onMounted } from "vue";
import type { Router, Searchbar } from "framework7/types";

import BurgerIcon from "/icons/burger.svg?raw";

import { useTheme } from "@/composables/useTheme";
import { usePrayersStore, BOOKS_SECTION_ID } from "@/stores/prayers";
import { useReadingHistoryStore } from "@/stores/readingHistory";

const { sectionId, f7router } = defineProps<{
  sectionId: string;
  f7router: Router.Router;
}>();

const { isDarkMode } = useTheme();

const prayersStore = usePrayersStore();
const historyStore = useReadingHistoryStore();

// isFirstPage.value ? "Молитвослов" :
const title = computed(() => prayersStore.getItemById(sectionId)?.name);


</script>
<style scoped lang="less">

</style>
