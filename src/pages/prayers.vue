<template>
  <f7-page @page:beforein="onPageBeforeIn">
    <f7-navbar large>
      <f7-nav-left :back-link="!isFirstPage">
        <f7-link
          v-if="isFirstPage"
          panel-open="left"
          v-html="BurgerIcon"
        ></f7-link>
      </f7-nav-left>
      <f7-nav-title sliding>{{ title }}</f7-nav-title>
      <f7-nav-title-large>{{
        isFirstPage ? "Сейчас читаю" : title
      }}</f7-nav-title-large>
    </f7-navbar>
    <HistorySlider v-if="isFirstPage" :items="lastReadings"></HistorySlider>
    <f7-block-title v-if="isFirstPage" class="block-title">
      {{title}}
    </f7-block-title>
    <PrayersList
      :cssClass="`${isFirstPage ? 'no-margin-top' : ''}`"
      :prayers="prayers"
      @reset-item-progress="onResetItemProgress"
      @undo-reset-item-progress="onUndoResetItemProgress"
    />
    <SeparatorLine
      class="separator"
      :color="isDarkMode ? 'baige-100' : 'black-100'"
    />
  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Router } from "framework7/types";

import BurgerIcon from "/icons/burger.svg?raw";
import { PrayersList } from "@/components/prayers";
import SeparatorLine from "@/components/SeparatorLine.vue";
import HistorySlider from "@/components/HistorySlider.vue";

import { useTheme } from "@/composables/useTheme";
import { usePrayersStore, BOOKS_SECTION_ID } from "@/stores/prayers";
import { useReadingHistoryStore } from "@/stores/readingHistory";

const { sectionId, f7router } = defineProps<{
  sectionId: string;
  f7router: Router.Router;
}>();

const isFirstPage = ref<boolean>(true);

const { isDarkMode } = useTheme();

const prayersStore = usePrayersStore();
const historyStore = useReadingHistoryStore();

// isFirstPage.value ? "Молитвослов" :
const title = computed(() =>
   prayersStore.getItemById(sectionId)?.name
);

console.log("page prayers with sectionId = " + sectionId);

const prayers = computed(() =>
  prayersStore.getItemsBySection(sectionId).map((p) => {
    const history = historyStore.getItemProgress(p.id) ?? { progress: 0, pages: 0};
    return {
      progress: history.progress, 
      pages: history.pages,
      ...p,
    };
  })
);


const readingsType = sectionId == BOOKS_SECTION_ID ? "books" : "prayers";
const lastReadings = computed(() =>
  historyStore.getLastItems(readingsType, 10).map((r) => {
    const p = prayersStore.getItemById(r.id) ?? { name: "", url: "" };
    return {
      name: p.name,
      url: p.url,
      ...r,
    };
  })
);

const onPageBeforeIn = () => {
  isFirstPage.value = f7router.history.length <= 1;
};

const onResetItemProgress = (id: string) => {
  console.log("prayers page onResetItemProgress ", id);
  historyStore.resetProgress(id);
};

const onUndoResetItemProgress = () => {
  historyStore.undoResetProgress();
};
</script>
<style scoped lang="less">
.block-title {
  margin-top: 20px;
}
</style>
