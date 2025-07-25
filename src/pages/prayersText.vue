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
          v-if="currentLanguage && availableLanguages.length > 1"
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
        :text="text" 
        :initialProgress="initialProgress"
        :lang="currentLanguage"
        :itemId="itemId"
        ref="textPaginator" 
        @tap="onTextPaginatorTap" />
       
    </f7-page-content>
    <TextSettingsSelector 
      v-model:isOpened="isTextSettingsSheetOpened"
      :disabled="isTextCalculating"
      :language="currentLanguage"
    />
    
    <!-- Всплывающий тулбар для навигации по страницам -->
     
    <f7-toolbar 
      ref="page-nav-toolbar"
      class="page-navigation-toolbar"
      bottom
      hidden
    >
      <div class="header">
        <f7-link class="reset-link" icon-only href="#">
          <SvgIcon  icon="reset" color="baige-60" />
        </f7-link>
        
        <div class="page-counter">
          {{ currentPage }} из {{ totalPages }}
        </div>
      </div>
        
      <f7-range
        v-if="!isPageNavHidden"
        class="page-range-slider"
        :min="1"
        :max="totalPages"
        :step="1"
        @range:change="onPageSliderChange"
        :value="currentPage"          
      />
    </f7-toolbar>

  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, useTemplateRef, ComponentPublicInstance, watch } from "vue";
import type { Router } from "framework7/types";
import { f7 } from "framework7-vue";
import type { Swiper } from "swiper";
import type { Language } from "@/types/common";

import { useTheme } from "@/composables/useTheme";
import { 
  usePrayersStore, 
  BOOKS_SECTION_ID,
  type PrayerElement 
} from "@/stores/prayers";
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

const { elementId, sectionId, f7router } = defineProps<{
  elementId?: string;
  sectionId?: string;
  f7router: Router.Router;
}>();

const { isDarkMode } = useTheme();
const navbarRef = useTemplateRef<ComponentPublicInstance>("navbar");
const pageNavToolbarRef = useTemplateRef<ComponentPublicInstance>("page-nav-toolbar");

const prayersStore = usePrayersStore();
const historyStore = useReadingHistoryStore();
const settingsStore = useSettingsStore();
const { getComponent } = useComponentsStore();

// Определяем ID и тип элемента
const itemId = elementId || sectionId;
const isSection = !!sectionId;

if (!itemId) {
  throw new Error("Neither elementId nor sectionId provided");
}

const item = prayersStore.getItemById(itemId);
const subtitle = computed(() => {
  if (!item || isSection) return '';
  return 'parent' in item ? prayersStore.getItemById(item.parent)?.name : '';
});
const title = item?.name || '';
const text = ref<string>("");

const isTextSettingsSheetOpened = ref(false);
const toggleTextSettingsSheet = () => {
  isTextSettingsSheetOpened.value = !isTextSettingsSheetOpened.value;
};

watch(isTextSettingsSheetOpened, (isOpen) => {
  if (isOpen) {
    isNavbarHidden.value = true;
    isPageNavHidden.value = true;
  }
});

// Языковые настройки из store
const currentLanguage = ref<Language | null>(settingsStore.currentLanguage);
const availableLanguages = ref<Language[]>([]);

// Выбираем подходящий метод API в зависимости от типа
const apiCall = isSection 
  ? prayersStore.getComposedPrayerText(itemId)
  : prayersStore.getPrayerText(itemId);

const { isLoading, isError, error, data } = useApiState(null, apiCall);

watch(data, async () => {
  if (!data.value) return;
   
  // Обновляем доступные языки
  availableLanguages.value = data.value.lang;
  
  // Получаем подходящий язык из доступных
  currentLanguage.value = settingsStore.getLanguageFromAvailable(availableLanguages.value);

  updatePrayerText(currentLanguage.value);
});

// Функция для обновления текста молитвы
const updatePrayerText = (language: Language | null) => {
  if (!data.value) return;

  console.log("updatePrayerText", data.value);

  let prayerText = '';
  
  // Теперь оба типа возвращают одинаковую структуру
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
      prayerText = data.value.text || '';
  }

  // Для отдельных молитв
  const hasExistingHeader = /^\s*<h[12]/.test(prayerText);
  
  if (hasExistingHeader) {
    // Заменяем h2 на h1 если есть
    prayerText = prayerText.replace(/^(\s*)<h2([^>]*)>/i, '$1<h1$2>').replace(/<\/h2>/i, '</h1>');
    text.value = prayerText;
  } else {
    text.value = `<h1>${title}</h1>\n\n${prayerText}`;
  }
};

const initialProgress = computed(() => historyStore.getItem(itemId)?.progress || 0);

watch(error, async () => {
  if (!error.value) return;
  console.log("error", error.value);
  text.value = `Данные не найдены`;
});

// Тема текста теперь управляется через settings store

// Отслеживание изменений языка
watch(currentLanguage, (newLanguage) => {
  updatePrayerText(newLanguage);
  if (newLanguage) {
    settingsStore.setLanguage(newLanguage);
  }
});

const isNavbarHidden = ref(true);

const onPageBeforeIn = () => {
  const bottomTabBar = getComponent("bottomTabBar");
  bottomTabBar?.hide(true);
};

const onPageAfterOut = () => {
  const bottomTabBar = getComponent("bottomTabBar");
  bottomTabBar?.show(true);
};

const toggleNavbar = () => {
  isNavbarHidden.value = !isNavbarHidden.value;
};

watch(isNavbarHidden, (isHidden) => {
  if (!navbarRef.value) return;
  const navbarEl = navbarRef.value.$el;

  if (isHidden) {
    f7.navbar.hide(navbarEl, true);
    f7.navbar.collapseLargeTitle(navbarEl);
  } else {
    f7.navbar.show(navbarEl, true);
    f7.navbar.expandLargeTitle(navbarEl);
  }
});

const textPaginator = useTemplateRef<InstanceType<typeof TextPaginator>>("textPaginator");

const isTextCalculating = computed(() => {
  return textPaginator.value?.isCalculating || false;
});

const textMode = computed(() => {
  return textPaginator.value?.mode || "horizontal";
});

const onTextPaginatorTap = (payload: { type: "center" | "left" | "right" | "top" | "bottom"; x: number; y: number }) => {
  const { type, x, y } = payload;
  if (!isNavbarHidden.value || !isPageNavHidden.value) {
    isNavbarHidden.value = true;
    isPageNavHidden.value = true;

  } else if (type === "center") {
    togglePageNavigation();
    toggleNavbar();

  } else if (type === "left" || type === "top") {
    textPaginator.value?.slidePrev();

  } else if (type === "right" || type === "bottom") {
    textPaginator.value?.slideNext();
  }
};

// Состояние навигации по страницам
const totalPages = computed(() => textPaginator.value?.pagesCount || 0);
const progress = computed(() => textPaginator.value?.progress || 0);
const currentPage = computed(() => Math.min(Math.floor(progress.value * totalPages.value) + 1, totalPages.value));

watch(progress, () => {
  if (!textPaginator.value || !totalPages.value) return;
  console.log("watch progress", progress.value, totalPages.value);
  const type = prayersStore.isBook(itemId) ? "books" : "prayers";
  historyStore.updateProgress(itemId, progress.value, totalPages.value, type);
});

const isPageNavHidden = ref(true);

// Показать/скрыть навигацию по страницам
const togglePageNavigation = () => {
  isPageNavHidden.value = !isPageNavHidden.value;
};

watch(isPageNavHidden, (isHidden) => {
  if (!pageNavToolbarRef.value) return;
  const pageNavToolbarEl = pageNavToolbarRef.value.$el;
  if (isHidden) {
    f7.toolbar.hide(pageNavToolbarEl, true);
  } else {
    f7.toolbar.show(pageNavToolbarEl, true);
  }
});

// Обработчик изменения слайдера страниц
const onPageSliderChange = (value: number) => {
  if (isNavbarHidden.value) {
    return;
  }
  textPaginator.value?.goToPage(value, textMode.value === "vertical");
};

const shareItem = (e: Event) => {
  const target = (e.target as HTMLElement).closest("a") as HTMLElement;

  const sharePopover = getComponent("sharePopover");
  if (!sharePopover) return;

  sharePopover.open({
    title: title || "",
    url: item?.url || "",
  }, target, false);
};


const { addFavorite, deleteFavorite, isFavorite } = useFavoritesStore();

const { showInfoToast: showAddedToFavoritesToast } = useInfoToast({
  text: "Добавлено на главный экран",
});

const { showInfoToast: showRemovedFromFavoritesToast } = useInfoToast({
  text: "Удалено с главного экрана",
});

const isElementFavorite = computed(() => isFavorite(itemId));

watchEffect(() => {
  console.log("isElementFavorite", isElementFavorite.value);
});

const toggleFavorite = async () => {

  const type = prayersStore.isBook(itemId) ? "books" : "prayers";

  if (isFavorite(itemId)) {
    await deleteFavorite(itemId);
    showRemovedFromFavoritesToast();
  } else {
    await addFavorite(itemId, type);
    showAddedToFavoritesToast();
  }
};


</script>
<style scoped lang="less">
.dark .page {
  --f7-bars-bg-color: var(--content-color-baige-5-no-opacity);
}

.page-navigation-toolbar {
  --f7-toolbar-height: calc(70px + var(--f7-safe-area-bottom));
  --f7-toolbar-bg-color: var(--f7-bars-bg-color);
  --f7-toolbar-border-color: var(--f7-bars-border-color);
  --f7-link-touch-ripple-color: rgba(255, 255, 255, 0.15);
  
  :deep(.toolbar-inner) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    padding: 8px 16px;
    gap: 8px;
  }

  .header {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 10px;
    height: 24px;
    width: 100%;
    position: relative;
  }

  .reset-link {
    position: absolute;
    right: 0;
    left: 0;
    width: 24px;
    height: 24px;
    padding: 0;
  }
  
  .page-counter {
    font-size: 14px;
    line-height: 130%;
    letter-spacing: 0.05em;
    color: var(--content-color-baige-60);
    text-align: center;
  }
  
  .page-range-slider {
    width: 100%;
    --f7-range-bar-bg-color: var(--content-color-baige-30);
    --f7-range-bar-active-bg-color: var(--brand-color-primary-accent-50);
    --f7-range-knob-color: var(--brand-color-primary-accent-50);
  }
  
  &.theme-dark {
    .page-counter {
      color: var(--content-color-baige-90);
    }
  }
}
</style>
