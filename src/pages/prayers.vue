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
    <HistorySlider v-if="isFirstPage"></HistorySlider>
    <f7-block-title v-if="isFirstPage"> Полный молитвослов </f7-block-title>
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
import PrayersList from "@/components/PrayersList.vue";
import SeparatorLine from "@/components/SeparatorLine.vue";
import HistorySlider from "@/components/HistorySlider.vue";

import { useTheme } from "@/composables/useTheme";
import { usePrayersStore } from "@/stores/prayers";
import { useReadingHistoryStore } from "@/stores/readingHistory";
import { f7 } from "framework7-vue";

const { sectionId, f7router } = defineProps<{
  sectionId: string;
  f7router: Router.Router;
}>();

const isFirstPage = ref<boolean>(true);

const rootSectionId = "842";

const { isDarkMode } = useTheme();

const prayersStore = usePrayersStore();
const historyStore = useReadingHistoryStore();

const title = computed(() => isFirstPage.value
  ? "Молитвослов"
  : prayersStore.getItemById(sectionId)?.name);

const prayers = computed(() =>
  prayersStore.getItemsBySection(sectionId).map((p) => {
    const history = historyStore.getItemProgress(p.id) || {};
    return {
      ...history,
      ...p,
    };
  })
);

const onPageBeforeIn = () => {
  isFirstPage.value = f7router.history.length <= 1;
};

const onResetItemProgress = (id: string) => {
  historyStore.resetProgress(id);
};

const onUndoResetItemProgress = () => {
  historyStore.undoResetProgress();
};
</script>
<style scoped lang="less">
</style>
