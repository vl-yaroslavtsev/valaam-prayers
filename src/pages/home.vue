<template>
  <f7-page name="home">
    <!-- Top Navbar -->
    <f7-navbar>
      <f7-nav-left>
        <f7-link panel-open="left">
          <SvgIcon icon="burger" :size="32" />
        </f7-link>
      </f7-nav-left>
      <f7-nav-title></f7-nav-title>
      <f7-nav-right>
        <f7-link @click="toggleSortable"
          ><SvgIcon
            icon="pencil"
            :color="sortableEnabled ? 'primary-accent-50' : 'baige-90'"
            :size="24"
        /></f7-link>
      </f7-nav-right>
    </f7-navbar>
    <f7-toolbar position="top" tabbar>
      <f7-link
        v-for="(tab, index) in tabs"
        :key="tab.id"
        :tab-link="`#tab-${tab.id}`"
        :tab-link-active="index === 0"
      >
        {{ tab.title }}
      </f7-link>
    </f7-toolbar>
    <f7-tabs animated>
      <f7-tab
        v-for="tab in tabs"
        :key="`${tab.id}`"
        :id="`tab-${tab.id}`"
        class="page-content"
        :tab-active="tab.id === 1"
      >
        <f7-block v-if="isEmptyList(tab.type)"
          >Отметьте звездочкой молитвы, книги, святые, мысли и они появятся здесь.</f7-block
        >
        <FavoritesList
          :isLoading="tab.isLoading"
          sortable
          :sortable-enabled="sortableEnabled"
          :favorites="getFavoritesByType(tab.type)"
          @delete-item="onDeleteItem"
          @undo-delete-item="onUndoDeleteItem"
          @reset-item-progress="onResetItemProgress"
          @undo-reset-item-progress="onUndoResetItemProgress"
          @sorted="onSorted"
        />
        <SeparatorLine
          class="separator"
          :color="isDarkMode ? 'baige-10' : 'black-10'"
        />
      </f7-tab>
    </f7-tabs>
  </f7-page>
</template>

<script setup lang="ts">
import { ref, watchEffect, computed, type Ref } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useFavoritesStore, type FavoriteType, type FavoritesItem } from "@/stores/favorites";
import { usePrayersStore } from "@/stores/prayers";
import { useSaintsStore } from "@/stores/saints";
import { useThoughtsStore } from "@/stores/thoughts";
import { useReadingHistoryStore } from "@/stores/readingHistory";
import { useErrorToast } from "@/composables/useErrorToast";
import type { Language } from "@/types/common";

import SvgIcon from "@/components/SvgIcon.vue";
import SeparatorLine from "@/components/SeparatorLine.vue";
import { FavoritesList } from "@/components/prayers";

const { isDarkMode } = useTheme();

// Используем Pinia store
const favoritesStore = useFavoritesStore();
const prayersStore = usePrayersStore();
const saintsStore = useSaintsStore();
const thoughtsStore = useThoughtsStore();
const historyStore = useReadingHistoryStore();

type TabType = "prayers" | "books" | "calendar";

const tabs = ref<
  {
    id: number;
    title: string;
    type: TabType;
    isLoading: Ref<boolean>;
  }[]
>([
  { 
    id: 1, 
    title: "Молитвы", 
    type: "prayers", 
    isLoading: computed(() => prayersStore.isLoading) 
  },
  { 
    id: 2, 
    title: "Книги", 
    type: "books", 
    isLoading: computed(() => prayersStore.isLoading) },
  { 
    id: 3, 
    title: "Календарь", 
    type: "calendar", 
    isLoading: computed(() => saintsStore.isLoading || thoughtsStore.isLoading),
  },
]);

const isEmptyList = (type: TabType) => {
  return !tabs.value.find((tab) => tab.type === type)?.isLoading && getFavoritesByType(type).length === 0;
};

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
const getFavoritesByType = (tabType: TabType) => {
  let favorites: FavoritesItem[] = [];
  if (tabType === "books") {
    favorites = favoritesStore.getFavoritesByType("books");

  } else if (tabType === "prayers") {
    favorites = favoritesStore.getFavoritesByType("prayers");

  } else if (tabType === "calendar") {
    favorites = favoritesStore.getFavoritesByType("saints");
    favorites = favorites.concat(favoritesStore.getFavoritesByType("thoughts"));

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

const onSorted = (id: string, from: number, to: number) => {
  favoritesStore.moveFavorite(id, from, to);
};
</script>

<style scoped lang="less">
.separator {
  margin-top: 30px;
}
</style>
