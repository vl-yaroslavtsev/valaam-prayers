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
      <f7-nav-title sliding>Молитвослов</f7-nav-title>
      <f7-nav-title-large>{{
        isFirstPage ? "Сейчас читаю" : "Молитвослов"
      }}</f7-nav-title-large>
    </f7-navbar>
    <PrayersList
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
  console.log(f7router, "history length = ", f7router.history.length);
  isFirstPage.value = f7router.history.length <= 1;
};

const onResetItemProgress = (id: string) => {
  console.log("onResetItemProgress", id);
  historyStore.resetProgress(id);
};

const onUndoResetItemProgress = () => {
  console.log("onUndoResetItemProgress");
  historyStore.undoResetProgress();
};
</script>
