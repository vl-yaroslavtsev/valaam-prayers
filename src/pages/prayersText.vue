<template>
  <f7-page :page-content="false" @page:beforein="onPageBeforeIn" @page:afterout="onPageAfterOut">
    <f7-navbar ref="navbar" large hidden class="navbar-large-collapsed">
      <f7-nav-left :back-link="true"></f7-nav-left>
      <f7-nav-title sliding></f7-nav-title>
      <f7-nav-right>
        <f7-link icon-only>
          <SvgIcon icon="menu" color="baige-90" :size="24" />
        </f7-link>
        <LanguageSelector 
          v-model="currentLanguage" 
          :available-languages="availableLanguages" />
        <f7-link icon-only>
          <SvgIcon 
            :icon="isElementFavorite ? 'favorite-filled' : 'favorite'" 
            color="baige-90" 
            :size="24"
            @click="toggleFavorite" />
        </f7-link>
        <f7-link icon-only>
          <SvgIcon 
            icon="settings-2" 
            color="baige-90" 
            :size="24" 
            @click="toggleTextSettingsSheet()" />
        </f7-link>
        <f7-link icon-only>
          <SvgIcon icon="share" color="baige-90" :size="24" @click="shareItem" />
        </f7-link>
        <f7-link icon-only>
          <SvgIcon icon="search" color="baige-90" :size="24" />
        </f7-link>
      </f7-nav-right>
      <f7-nav-title-large>{{ title }}</f7-nav-title-large>
    </f7-navbar>
    <f7-page-content class="">
      <TextPaginator 
        :isLoading="isLoading" 
        :mode="'horizontal'" 
        :text="text" 
        :initialProgress="initialProgress"
        :lang="currentLanguage"
        ref="textPaginator" 
        @tap="onTextPaginatorTap" 
        @progress="onTextPaginatorProgress" />
       
    </f7-page-content>
    <TextSettingsSelector v-model:isOpened="isTextSettingsSheetOpened" />
  </f7-page>
</template>

<!--
<f7-list menu-list strong-ios outline-ios>
  <f7-list-item
    link
    title="Home"
    :selected="selected === 'home'"
    @click="() => (selected = 'home')"
  > </f7-list-item>
</f7-list>
-->

<script setup lang="ts">
import { ref, computed, watchEffect, useTemplateRef, ComponentPublicInstance, watch } from "vue";
import type { Router } from "framework7/types";
import { f7 } from "framework7-vue";
import type { Swiper } from "swiper";
import type { Language } from "@/types/common";

import { useTheme } from "@/composables/useTheme";
import { usePrayersStore, BOOKS_SECTION_ID, type PrayerElement } from "@/stores/prayers";
import { useReadingHistoryStore } from "@/stores/readingHistory";
import { useComponentsStore } from "@/stores/components";
import { useSettingsStore } from "@/stores/settings";
import TextPaginator from "@/components/TextPaginator.vue"
import TextSettingsSelector from "@/components/TextSettingsSelector.vue";
import SvgIcon from "@/components/SvgIcon.vue";
import LanguageSelector from "@/components/LanguageSelector.vue";
import { useFavoritesStore } from "@/stores/favorites";
import { useInfoToast } from "@/composables/useInfoToast";
import { useApiState } from "@/composables/useApiState";

const { elementId, f7router } = defineProps<{
  elementId: string;
  f7router: Router.Router;
}>();

const { isDarkMode } = useTheme();
const navbarRef = useTemplateRef<ComponentPublicInstance>("navbar");

const prayersStore = usePrayersStore();
const historyStore = useReadingHistoryStore();
const settingsStore = useSettingsStore();
const { getComponent } = useComponentsStore();

const prayer = prayersStore.getItemById(elementId) as PrayerElement;
const subtitle = computed(
  () => prayer && prayersStore.getItemById(prayer.parent)?.name
);
const title = prayer.name;
const text = ref<string>("");

const isTextSettingsSheetOpened = ref(false);
const toggleTextSettingsSheet = () => {
  isTextSettingsSheetOpened.value = !isTextSettingsSheetOpened.value;
};

// Языковые настройки из store
const currentLanguage = ref<Language>(settingsStore.currentLanguage);
const availableLanguages = ref<Language[]>([]);

const { isLoading, isError, error, data } = useApiState(null, prayersStore.getPrayerText(elementId));

watch(data, async () => {
  if (!data.value) return;
   
  // Обновляем доступные языки
  availableLanguages.value = data.value.lang;
  
  // Получаем подходящий язык из доступных
  currentLanguage.value = settingsStore.getLanguageFromAvailable(availableLanguages.value);

  updatePrayerText(currentLanguage.value);
});

// Функция для обновления текста молитвы
const updatePrayerText = (language: Language) => {
  if (!data.value) return;

  let prayerText = '';
  switch (language) {
    case 'cs-cf':
      prayerText = data.value.text_cs_cf || '';
      break;
    case 'cs':
      prayerText = data.value.text_cs || '';
      break;
    case 'ru':
      prayerText = data.value.text_ru || '';
      break;
    default:
      prayerText = data.value.text_cs_cf || '';
  }

  // Проверяем наличие заголовков h1 или h2 в начале текста
  const hasExistingHeader = /^\s*<h[12]/.test(prayerText);
  
  if (hasExistingHeader) {
    // Заменяем h2 на h1 если есть
    prayerText = prayerText.replace(/^(\s*)<h2([^>]*)>/i, '$1<h1$2>').replace(/<\/h2>/i, '</h1>');
    text.value = prayerText;
  } else {
    text.value = `<h1>${title}</h1>\n\n${prayerText}`;
  }
};

const initialProgress = computed(() => historyStore.getItem(elementId)?.progress || 0);

watch(error, async () => {
  if (!error.value) return;
  console.log("error", error.value);
  text.value = `Данные не найдены`;
});

// Тема текста теперь управляется через settings store

// Отслеживание изменений языка
watch(currentLanguage, (newLanguage) => {
  updatePrayerText(newLanguage);
  settingsStore.setLanguage(newLanguage);
});

let isNavbarHidden = true;

const onPageBeforeIn = () => {
  const bottomTabBar = getComponent("bottomTabBar");
  bottomTabBar?.hide(true);
};

const onPageAfterOut = () => {
  const bottomTabBar = getComponent("bottomTabBar");
  bottomTabBar?.show(true);
};

const toggleNavbar = () => {
  if (!navbarRef.value) return;
  console.log("toggleNavbar", navbarRef.value);

  const navbarEl = navbarRef.value.$el;

  if (isNavbarHidden) {
    f7.navbar.show(navbarEl, true);
    f7.navbar.expandLargeTitle(navbarEl);
  } else {
    f7.navbar.hide(navbarEl, true);
    f7.navbar.collapseLargeTitle(navbarEl);
  }
  isNavbarHidden = !isNavbarHidden;
};

const textPaginator = useTemplateRef("textPaginator");

const onTextPaginatorTap = (payload: { type: "center" | "left" | "right" | "top" | "bottom"; x: number; y: number }) => {
  const { type, x, y } = payload;
  if (type === "center") {
    toggleNavbar();
  }
};

const onTextPaginatorProgress = (payload: { progress: number; pages: number }) => {
  const { progress, pages } = payload;
  console.log("onTextPaginatorProgress", progress, pages);
  historyStore.updateProgress(elementId, progress, pages, "prayers");
};

const shareItem = (e: Event) => {
  const target = (e.target as HTMLElement).closest("a") as HTMLElement;

  const sharePopover = getComponent("sharePopover");
  if (!sharePopover) return;

  sharePopover.open({
    title: title || "",
    url: prayer.url || "",
  }, target, false);
};


const { addFavorite, deleteFavorite, isFavorite } = useFavoritesStore();

const { showInfoToast: showAddedToFavoritesToast } = useInfoToast({
  text: "Добавлено на главный экран",
});

const { showInfoToast: showRemovedFromFavoritesToast } = useInfoToast({
  text: "Удалено с главного экрана",
});

const isElementFavorite = computed(() => isFavorite(elementId));

watchEffect(() => {
  console.log("isElementFavorite", isElementFavorite.value);
});

const toggleFavorite = async () => {
  if (isFavorite(elementId)) {
    await deleteFavorite(elementId);
    showRemovedFromFavoritesToast();
  } else {
    await addFavorite(elementId, "prayers");
    showAddedToFavoritesToast();
  }
};


</script>
<style scoped lang="less">
.dark .page {
  --f7-bars-bg-color: var(--content-color-baige-5-no-opacity);
}
</style>
