<template>
  <f7-page name="home">
    <!-- Top Navbar -->
    <f7-navbar>
      <f7-nav-left>
        <f7-link panel-open="left">
          <SvgIcon icon="burger" :size="32" />
        </f7-link>
      </f7-nav-left>
      <f7-nav-title sliding>Избранное</f7-nav-title>
      <f7-nav-right>
        <f7-link @click="toggleSortable"
          ><SvgIcon
            icon="pencil"
            :color="sortableEnabled ? 'primary-accent-50' : 'baige-90'"
            :size="24"
        /></f7-link>
      </f7-nav-right>
      <f7-nav-title-large>
        Сейчас читаю
      </f7-nav-title-large>
    </f7-navbar>
    <HistorySlider :items="lastReadings" :isLoading="isHistoryLoading" />
    <f7-block-title>Избранное</f7-block-title>
    <f7-block ref="chipsBlockRef" class="chips-block">
      <f7-chip
        v-for="chip in chips"
        :key="chip.id"
        :text="chip.title"
        :class="{ 'chip-selected': selectedFilter === chip.id }"
        @click="onFilterClick(chip.id)"
      />
    </f7-block>
    <f7-block v-if="isEmptyList"
      >Отметьте звездочкой молитвы, книги, святые, мысли и они появятся здесь.</f7-block
    >
    <div
      ref="favoritesSectionRef"
      class="favorites-section"
      :style="favoritesSectionMinHeight ? { minHeight: favoritesSectionMinHeight } : undefined"
    >
      <FavoritesList
        :isLoading="isLoading"
        sortable
        :sortable-enabled="sortableEnabled"
        :favorites="currentFavorites"
        @delete-item="onDeleteItem"
        @undo-delete-item="onUndoDeleteItem"
        @reset-item-progress="onResetItemProgress"
        @undo-reset-item-progress="onUndoResetItemProgress"
        @sorted="onSorted"
      />
    </div>
    <SeparatorLine
      class="separator"
      :color="isDarkMode ? 'baige-10' : 'black-10'"
    />
  </f7-page>
</template>

<script setup lang="ts">
import { ref, watchEffect, computed, nextTick, useTemplateRef } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useFavoritesStore, type FavoritesItem } from "@/stores/favorites";
import { usePrayersStore } from "@/stores/prayers";
import { useSaintsStore } from "@/stores/saints";
import { useThoughtsStore } from "@/stores/thoughts";
import { useReadingHistoryStore } from "@/stores/readingHistory";
import { useErrorToast } from "@/composables/useErrorToast";
import type { Language } from "@/types/common";

import SvgIcon from "@/components/SvgIcon.vue";
import SeparatorLine from "@/components/SeparatorLine.vue";
import HistorySlider from "@/components/HistorySlider.vue";
import { FavoritesList } from "@/components/prayers";

const { isDarkMode } = useTheme();

// Используем Pinia store
const favoritesStore = useFavoritesStore();
const prayersStore = usePrayersStore();
const saintsStore = useSaintsStore();
const thoughtsStore = useThoughtsStore();
const historyStore = useReadingHistoryStore();

type FilterType = "all" | "prayers" | "books" | "calendar";

const chips: { id: FilterType; title: string }[] = [
  { id: "all", title: "Все" },
  { id: "prayers", title: "Молитвы" },
  { id: "books", title: "Книги" },
  { id: "calendar", title: "Календарь" },
];

const selectedFilter = ref<FilterType>("all");
const chipsBlockRef = useTemplateRef("chipsBlockRef");
const favoritesSectionRef = useTemplateRef<HTMLElement>("favoritesSectionRef");
const favoritesSectionMinHeight = ref<string | null>(null);

const getF7El = (refValue: unknown): HTMLElement | null => {
  if (!refValue) return null;
  if (refValue instanceof HTMLElement) return refValue;
  const el = (refValue as { $el?: HTMLElement }).$el;
  return el instanceof HTMLElement ? el : null;
};

/** Сохраняет позицию chips при смене фильтра: короткие списки не схлопывают scrollHeight. */
const onFilterClick = async (id: FilterType) => {
  if (selectedFilter.value === id) return;

  const chipsEl = getF7El(chipsBlockRef.value);
  const favoritesSection = favoritesSectionRef.value;
  const pageContent = chipsEl?.closest(".page-content") as HTMLElement | null;

  if (pageContent && favoritesSection) {
    // min-height секции = место от её начала до низа видимой области при текущем scrollTop
    const needed =
      pageContent.scrollTop +
      pageContent.clientHeight -
      favoritesSection.offsetTop;
    favoritesSectionMinHeight.value = `${Math.max(needed, 0)}px`;
  }

  const anchorTop = chipsEl?.getBoundingClientRect().top ?? null;
  selectedFilter.value = id;

  await nextTick();

  if (!pageContent || !chipsEl || anchorTop == null) return;

  const delta = chipsEl.getBoundingClientRect().top - anchorTop;
  if (Math.abs(delta) > 1) {
    pageContent.scrollTop += delta;
  }
};

const isLoading = computed(() => {
  if (selectedFilter.value === "prayers" || selectedFilter.value === "books") {
    return prayersStore.isLoading;
  }
  if (selectedFilter.value === "calendar") {
    return saintsStore.isLoading || thoughtsStore.isLoading;
  }
  return (
    prayersStore.isLoading ||
    saintsStore.isLoading ||
    thoughtsStore.isLoading
  );
});

const isHistoryLoading = computed(
  () =>
    prayersStore.isLoading ||
    saintsStore.isLoading ||
    thoughtsStore.isLoading
);

const lastReadings = computed(() =>
  historyStore.getLastItems("all", 10).map((r) => {
    let name = "";
    let url = "";

    if (r.type === "prayers" || r.type === "books") {
      const item = prayersStore.getItemById(r.id);
      if (item) {
        name = item.name;
        url = item.url;
      }
    } else if (r.type === "saints") {
      const saint = saintsStore.getSaintById(r.id);
      if (saint) {
        name = saint.name;
      }
      url = "/saints/" + r.id;
    }

    return {
      name,
      url,
      ...r,
    };
  })
);

const currentFavorites = computed(() => {
  if (selectedFilter.value === "all") {
    return [
      ...getFavoritesByType("prayers"),
      ...getFavoritesByType("books"),
      ...getFavoritesByType("calendar"),
    ].sort((a, b) => a.sort - b.sort);
  }
  return getFavoritesByType(selectedFilter.value);
});

const isEmptyList = computed(
  () => !isLoading.value && currentFavorites.value.length === 0
);

const showErrorToast = useErrorToast({
  text: "Ошибка при загрузке данных. Пожалуйста, проверьте интернет соединение.",
});

const isError = computed(() => {
  return (prayersStore.error && prayersStore.elements.length === 0)
  || (saintsStore.error && saintsStore.saints.length === 0)
  || (thoughtsStore.error && thoughtsStore.thoughts.length === 0);
});

watchEffect(() => {
  if (isError.value) {
    showErrorToast.showErrorToast();
  }
});


// Используем методы из store
const getFavoritesByType = (filterType: Exclude<FilterType, "all">) => {
  let favorites: FavoritesItem[] = [];
  if (filterType === "books") {
    favorites = favoritesStore.getFavoritesByType("books");

  } else if (filterType === "prayers") {
    favorites = favoritesStore.getFavoritesByType("prayers");

  } else if (filterType === "calendar") {
    favorites = [
      ...favoritesStore.getFavoritesByType("saints"),
      ...favoritesStore.getFavoritesByType("thoughts"),
    ].sort((a, b) => a.sort - b.sort);

  }
  return favorites.map((f) => {
    const type = f.type;
    const history = historyStore.getItem(f.id);
    let extra: {
      name: string;
      url: string;
      lang: Language[];
    } = {
      name: "",
      url: "",
      lang: [],
    };

    if (["books", "prayers"].includes(type)) {
      const item = prayersStore.getItemById(f.id);
      if (item) {
        extra.name = item.name;
        extra.url = item.url;
        extra.lang = 'lang' in item ? item.lang : [];
      }
    } else if (type === "saints") {
      const saint = saintsStore.getSaintById(f.id);
      if (saint) {
        extra.name = saint.name;
      }
      extra.url = "/saints/" + f.id;
    } else if (type === "thoughts") {
      const thought = thoughtsStore.getThoughtById(f.id);
      if (thought) {
        extra.name = thought.name;
      }
      extra.url = "/thoughts/" + f.id;
    }

    return {
      ...f,
      progress: history?.progress,
      pages: history?.pages,
      lastReadAt: history?.lastReadAt,
      ...extra,
    };
  });
};

const onDeleteItem = favoritesStore.deleteFavorite;
const onUndoDeleteItem = favoritesStore.undoDeleteFavorite;

const onResetItemProgress = historyStore.resetProgress;
const onUndoResetItemProgress = historyStore.undoResetProgress;

const sortableEnabled = ref(false);

const toggleSortable = () => {
  sortableEnabled.value = !sortableEnabled.value;
};

const onSorted = (id: string, prevId: string | null) => {
  favoritesStore.moveFavorite(id, prevId);
};
</script>

<style scoped lang="less">
.chips-block {
  --filter-chip-selected-border: var(--brand-color-primary-accent-50);
  --filter-chip-bg-color: var(--content-color-black-10);

  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 0;

  :deep(.chip) {
    background-color: var( --filter-chip-bg-color);
    border: 2px solid transparent;
  }

  :deep(.chip-selected) {
    border-color: var(--filter-chip-selected-border);
  }
}

:global(.dark .chips-block) {
  // --filter-chip-selected-border: var(--content-color-white-100);
  --filter-chip-bg-color: var(--content-color-baige-5);
}

.favorites-section {
  overflow-anchor: none;
}

.separator {
  margin-top: 30px;
}
</style>
