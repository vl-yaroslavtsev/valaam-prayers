<template>
  <f7-page name="home">
    <!-- Top Navbar -->
    <f7-navbar>
      <f7-nav-left>
        <f7-link panel-open="left" v-html="BurgerIcon"></f7-link>
      </f7-nav-left>
      <f7-nav-title>Избранное</f7-nav-title>
      <f7-nav-right>
        <f7-link sortable-toggle data-sortable=".favorites-list"
          ><PencilIcon :color="isSortableMode ? 'primary-accent-50' : 'baige-900'"
        /></f7-link>
      </f7-nav-right>
    </f7-navbar>

    <FavoritesList
      class="favorites-list"
      sortable
      :favorites="favorites"
      @delete-item="onDeleteItem"
      @reset-item="onResetItem"
      @sortable-mode-toggle="onSortableModeToggle"
    />
    <SeparatorLine :color="isDarkMode ? 'baige-100' : 'black-100'" />
  </f7-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useTheme } from "@/composables/useTheme";
import BurgerIcon from "/icons/burger.svg?raw";
import SeparatorLine from "@/components/icons/SeparatorLine.vue";
import PencilIcon from "@/components/icons/PencilIcon.vue";
import FavoritesList, { type FavoriteItem } from "@/components/FavoritesList.vue";

const { isDarkMode } = useTheme();

const favorites = ref<FavoriteItem[]>([
  {
    id: 1,
    title: "Утренние молитвы",
    url: "#",
    lang: ['цс', 'гр', 'ру'],
    progress: 0.443432,
    pages: 12
  },
  {
    id: 2,
    title: "Вечерние молитвы",
    url: "#",
    lang: ['цс', 'гр', 'ру'],
    progress: 0.113432,
    pages: 10
  },
  {
    id: 3,
    title: "Правило от осквернения",
    url: "#",
    lang: [ 'цс', 'гр']
  },
  {
    id: 4,
    title: "Молитва иеросхим. Пафения Киевского",
    url: "#",
    lang: ['ру'],
    progress: 0,
    pages: 5
  },
  {
    id: 5,
    title: "Помянник иеромон. Серапиона",
    url: "#",
    lang: ['ру']
  },
  {
    id: 6,
    title: "Правило к причащению",
    url: "#",
    lang: [ 'цс', 'гр'],
    progress: 0.343432,
    pages: 35
  },
  {
    id: 7,
    title: "Благодарственные молитвы по причащению",
    url: "#",
    lang: ['цс', 'гр'],
    progress: 1,
    pages: 16
  },
]);

const onDeleteItem = (item: FavoriteItem) => {
  favorites.value = favorites.value.filter((p) => p.id !== item.id);
};

const onResetItem = (item: FavoriteItem) => {
  item.progress = 0;
  item.pages = 0;
};

const isSortableMode = ref(false);

const onSortableModeToggle = (mode: boolean) => {
  isSortableMode.value = mode ;
};
</script>

<style scoped>
</style>
