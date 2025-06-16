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
    <f7-toolbar position="top" tabbar scrollable>
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
        <f7-block v-if="getFavoritesByType(tab.type).length === 0"
          >Здесь пока ничего нет.</f7-block
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
          class="separator"
          :color="isDarkMode ? 'baige-100' : 'black-100'"
        />
      </f7-tab>
    </f7-tabs>
  </f7-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useFavoritesStore, type FavoriteType } from "@/stores/favorites";
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

const tabs = ref<
  {
    id: number;
    title: string;
    type: FavoriteType;
  }[]
>([
  { id: 1, title: "Молитвы", type: "prayers" },
  { id: 2, title: "Библия", type: "bible" },
  { id: 3, title: "Книги", type: "books" },
  { id: 4, title: "Святые", type: "saints" },
  { id: 5, title: "Мысли", type: "thoughts" },
]);

// Используем методы из store
const getFavoritesByType = (type: FavoriteType) =>
  favoritesStore.getFavoritesByType(type).map((f) => {
    const history = historyStore.getItemProgress(f.id);
    let extra = {
      name: "",
      url: "",
    };

    if (["books", "prayers", "bible"].includes(type)) {
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
.tabbar {
  .tab-link:first-child {
    width: 113px;
  }
}
</style>
