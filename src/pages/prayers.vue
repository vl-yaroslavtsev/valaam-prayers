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
      <f7-nav-right
        ><f7-link v-if="!isFirstPage" @click="toggleSearch" icon-md="f7:search"
      /></f7-nav-right>
      <f7-nav-title-large>{{ title }}</f7-nav-title-large>
      <f7-searchbar
        ref="searchbar"
        class="searchbar-prayers"
        expandable
        custom-search
        disable-button-text=""
        placeholder="Поиск в разделе"
        v-model:value="searchQuery"
      >
        <template #input-wrap-end>
          <span class="input-clear-button custom-button">
            <SvgIcon icon="cancel" color="baige-30" />
          </span>
        </template>
      </f7-searchbar>
    </f7-navbar>
    <PrayersList
      :isLoading="isLoading"
      :prayers="prayers"
      :query="searchQuery"
      @reset-item-progress="onResetItemProgress"
      @undo-reset-item-progress="onUndoResetItemProgress"
    />
    <SeparatorLine
      class="separator"
      :color="isDarkMode ? 'baige-10' : 'black-10'"
    />
  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed, useTemplateRef } from "vue";
import type { Router, Searchbar } from "framework7/types";

import BurgerIcon from "@/assets/icons/burger.svg?raw";
import { PrayersList } from "@/components/prayers";
import SvgIcon from "@/components/SvgIcon.vue";
import SeparatorLine from "@/components/SeparatorLine.vue";

import { useTheme } from "@/composables/useTheme";
import { usePrayersStore } from "@/stores/prayers";
import { useReadingHistoryStore } from "@/stores/readingHistory";

const { sectionId, f7router } = defineProps<{
  sectionId: string;
  f7router: Router.Router;
}>();

const isFirstPage = ref<boolean>(true);

const { isDarkMode } = useTheme();

const prayersStore = usePrayersStore();
const historyStore = useReadingHistoryStore();
const isLoading = computed(() => prayersStore.isLoading);

const title = computed(() => prayersStore.getItemById(sectionId)?.name);

const prayers = computed(() =>
  prayersStore.getItemsBySection(sectionId).map((p) => {
    const history = historyStore.getItem(p.id) ?? {
      progress: 0,
      pages: 0,
    };
    return {
      progress: history.progress,
      pages: history.pages,
      ...p,
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

const f7SearchbarRef = useTemplateRef<Searchbar.Searchbar>("searchbar");

const toggleSearch = () => {
  if (f7SearchbarRef.value) {
    f7SearchbarRef.value.toggle();
  }
};

const searchQuery = ref("");

</script>
<style scoped lang="less">
.md .searchbar {
  .input-clear-button {
    &:not(.custom-button) {
      display: none;
    }

    &.custom-button {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}

:global(.md .searchbar .input-clear-button::after) {
  display: none;
}
</style>
