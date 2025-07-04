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
            :color="sortableEnabled ? 'primary-accent-50' : 'baige-900'"
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
        :key="tab.id"
        :id="`tab-${tab.id}`"
        class="page-content"
        :tab-active="tab.id === 1"
      >
        <f7-block v-if="isEmptyList(tab.type)"
          >Здесь появятся избранные молитвы, книги и святые.</f7-block
        >
        <FavoritesList
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
          v-if="favoritesStore.isInitialized"
          class="separator"
          :color="isDarkMode ? 'baige-100' : 'black-100'"
        />
      </f7-tab>
    </f7-tabs>
  </f7-page>
</template>

<script setup lang="ts">
import { ref, watchEffect, computed } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useFavoritesStore, type FavoriteType, type FavoritesItem } from "@/stores/favorites";
import { usePrayersStore } from "@/stores/prayers";
import { useReadingHistoryStore } from "@/stores/readingHistory";

import SvgIcon from "@/components/SvgIcon.vue";
import SeparatorLine from "@/components/SeparatorLine.vue";
import { FavoritesList } from "@/components/prayers";

const { isDarkMode } = useTheme();

// Используем Pinia store
const favoritesStore = useFavoritesStore();
const prayersStore = usePrayersStore();
const historyStore = useReadingHistoryStore();

type TabType = "prayers" | "books" | "calendar";

const tabs = ref<
  {
    id: number;
    title: string;
    type: TabType;
  }[]
>([
  { id: 1, title: "Молитвы", type: "prayers" },
  { id: 2, title: "Книги", type: "books" },
  { id: 3, title: "Календарь", type: "calendar" },
]);

// watchEffect(async () => {
//   await favoritesStore.init();
// });

const isEmptyList = (type: TabType) => {
  console.log("favoritesStore.isInitialized", favoritesStore.isInitialized);
  return favoritesStore.isInitialized && getFavoritesByType(type).length === 0;
};

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
    const history = historyStore.getItemProgress(f.id);
    let extra = {
      name: "",
      url: "",
    };

    if (["books", "prayers"].includes(type)) {
      extra = prayersStore.getItemById(f.id) ?? extra;
    } else if (type === "saints") {
      extra.url = "/saints/" + f.id;
    } else if (type === "thoughts") {
      extra.url = "/thoughts/" + f.id;
    }

    return {
      ...extra,
      ...history,
      ...f,
      name: extra.name || f.name,
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

// ужасный хак! Без него неправильно рассчитывается ширина tab-link-highlight
// при первой загрузке, т.к. шрифты еще не успели подгрузиться
// .tabbar {
//   .tab-link:first-child {
//     width: 113px;
//   }
// }
</style>
