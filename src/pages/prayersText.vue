<template>
  <f7-page :page-content="false" @page:beforein="onPageBeforeIn" @page:afterout="onPageAfterOut">
    <PrayersTextNavbar
      ref="navbar"
      :title="title"
      :subtitle="subtitle"
      :item-id="itemId"
      :item-url="item?.url || ''"
      v-model:current-language="currentLanguage"
      :available-languages="availableLanguages"
      :text-theme="textTheme"
      :is-hidden="isNavbarHidden"
      :animate-visibility="readingBarsAnimate"
      @toggle-text-settings="toggleTextSettingsSheet"
      @open-content-popup="openContentPopup"
      @open-search="onOpenSearch"
    />
    <f7-page-content class="">
      <TextPaginator 
        :isLoading="isLoading" 
        :text="text" 
        :initialProgress="initialProgress"
        :lang="currentLanguage"
        :itemId="itemId"
        :highlightTransform="isSearchModeActive ? getHighlightedPageHtml : undefined"
        ref="textPaginator" 
        @tap="onTextPaginatorTap"
        @touchstart="onTextPaginatorTouchStart"
        @touchend="onTextPaginatorTouchEnd" />
       
    </f7-page-content>
    <TextSettingsSelector 
      v-model:isOpened="isTextSettingsSheetOpened"
      :disabled="isTextCalculating"
      :language="currentLanguage"
    />
    
    <!-- Всплывающий тулбар для навигации по страницам -->
     
    <SearchNavigationToolbar
      v-if="isSearchModeActive"
      v-show="!isBrightnessTouching"
      :current-index="activeMatchIndex"
      :total="searchMatches.length"
      :is-hidden="false"
      @next="onSearchNext"
      @prev="onSearchPrev"
      @open-list="onOpenSearch"
      @close-search="onCloseSearch"
    />
    <PageNavigationToolbar
      v-show="!isBrightnessTouching"
      :current-page="currentPage"
      :total-pages="totalPages"
      :is-hidden="isPageNavHidden"
      :animate-visibility="readingBarsAnimate"
      @reset-progress="resetProgress"
      @page-change="onPageSliderChange"
    />
    <PrayersTextContentPopup
      v-model:isOpened="isContentPopupOpened"
      :itemId="itemId"
      :title="title"
      :headers="headers"
      :page="currentPage"
      :lang="currentLanguage"
      @goToPage="onGoToPageFromPopup"
    />
    <PrayersTextSearchPage
      v-model:isOpened="isSearchPageOpened"
      v-model:query="searchQuery"
      :matches="searchMatches"
      :active-match-id="isSearchModeActive ? activeMatchId : null"
      @selectMatch="onSelectMatch"
      @closeSearch="onCloseSearch"
    />
  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, useTemplateRef, ComponentPublicInstance, watch, nextTick } from "vue";
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
import { useUndoToast } from "@/composables/useUndoToast";
import { useTextSearch } from "@/composables/useTextSearch";

import PrayersTextContentPopup from "@/components/PrayersTextContentPopup.vue";
import PrayersTextSearchPage from "@/components/PrayersTextSearchPage.vue";
import TextPaginator from "@/components/TextPaginator.vue"
import TextSettingsSelector from "@/components/TextSettingsSelector.vue";
import PrayersTextNavbar from "@/components/PrayersTextNavbar.vue";
import PageNavigationToolbar from "@/components/PageNavigationToolbar.vue";
import SearchNavigationToolbar from "@/components/SearchNavigationToolbar.vue";

import { useApiState } from "@/composables/useApiState";
import { device } from "@/js/device";

const { elementId, sectionId, f7router } = defineProps<{
  elementId?: string;
  sectionId?: string;
  f7router: Router.Router;
}>();

const { isDarkMode } = useTheme();
const navbarRef = useTemplateRef<InstanceType<typeof PrayersTextNavbar>>("navbar");

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
const subtitle = computed<string[]>(() => {

  const result: string[] = [];

  // Находим индекс последнего заголовка, страница которого <= текущей
  let currentFlatIndex = -1;
  for (let i = 0; i < headers.value.length; i++) {
    if (headers.value[i].page <= currentPage.value) {
      currentFlatIndex = i;
    } else {
      break;
    }
  }

  for (let i = currentFlatIndex; i >= 0; i--) {
    const h = headers.value[i];
    if (i === currentFlatIndex) {
      result.unshift(h.text);
      if (h.level === 2) {
        break;
      }
    }

    if (h.level === 2) {
      result.unshift(h.text);
      break;
    }
  }

  return result;
});

const title = item?.name || '';
const text = ref<string>("");

const isContentPopupOpened = ref(false);

// Получение headers из TextPaginator
const headers = computed(() => {
  const headersData = textPaginator.value?.headers || [];
  // Преобразуем readonly массив в мутабельный для совместимости типов
  return [...headersData];
});

// Функция для открытия попапа с содержанием
const openContentPopup = () => {
  isContentPopupOpened.value = true;
};

const readingBarsAnimate = ref(true);

// Функция для перехода к странице из попапа
const onGoToPageFromPopup = (page: number) => {
  textPaginator.value?.goToPage(page, false);
  readingBarsAnimate.value = false;
  isNavbarHidden.value = true;
  isPageNavHidden.value = true;
  nextTick(() => {
    readingBarsAnimate.value = true;
  });
};

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

console.time('prayersText: apiCall');

const { isLoading, isError, error, data } = useApiState(apiCall);

watch(data, async () => {
  if (!data.value) return;
  console.timeEnd('prayersText: apiCall');
  console.log("data.value", data.value);
  // Обновляем доступные языки
  availableLanguages.value = data.value.lang;
  
  // Получаем подходящий язык из доступных
  currentLanguage.value = settingsStore.getLanguageFromAvailable(availableLanguages.value);


  console.log("currentLanguage.value ", currentLanguage.value );

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

  if (settingsStore.readingBrightness !== -1) {
    device.setBrightness(settingsStore.readingBrightness);
  }

  if (!settingsStore.isStatusBarVisible) {
    device.showStatusBar(false);
  }

  if (settingsStore.keepScreenOn) {
    device.keepScreenOn(true);
  }
};

const onPageAfterOut = () => {
  const bottomTabBar = getComponent("bottomTabBar");
  bottomTabBar?.show(true);
  device.resetBrightness();
  device.showStatusBar(true);
  device.keepScreenOn(false);
};

const textPaginator = useTemplateRef<InstanceType<typeof TextPaginator>>("textPaginator");

const isTextCalculating = computed(() => {
  return textPaginator.value?.isCalculating || false;
});

const textTheme = computed(() => {
  return textPaginator.value?.theme || "light";
});

const onTextPaginatorTap = (payload: { type: "center" | "left" | "right" | "top" | "bottom"; x: number; y: number }) => {
  const { type, x, y } = payload;

  console.log("onTextPaginatorTap", payload);

  if (isNavbarHiding || isPageNavHiding) {
    return;
  }

  if (!isNavbarHidden.value || !isPageNavHidden.value) {
    return;
  }

  if (type === "center") {
    if (!isNavbarHiding) {
      isNavbarHidden.value = false;
    }
    
    if (!isPageNavHiding) {
      isPageNavHidden.value = false;
    }

  } else if (type === "left" || type === "top") {
    textPaginator.value?.slidePrev();

  } else if (type === "right" || type === "bottom") {
    textPaginator.value?.slideNext();
  }
};

let isNavbarHiding = false;
let isPageNavHiding = false;

const onTextPaginatorTouchStart = (payload: { swiper: Swiper | null, event: Event }) => {
  console.log("onTextPaginatorTouchStart", payload);
  if (!isNavbarHidden.value) {
    isNavbarHidden.value = true;
    isNavbarHiding = true;
  }

  if (!isPageNavHidden.value) {
    isPageNavHidden.value = true;
    isPageNavHiding = true;
  }
};

const onTextPaginatorTouchEnd = (event: Event) => {
  console.log("onTextPaginatorTouchEnd", event);
  if (!event.isTrusted) {
    return;
  }
  isNavbarHiding = false;
  isPageNavHiding = false;
};

// Состояние навигации по страницам
const totalPages = computed(() => textPaginator.value?.pagesCount || 0);
const progress = computed(() => textPaginator.value?.progress || 0);
const currentPage = computed(() => Math.min(Math.floor(progress.value * totalPages.value) + 1, totalPages.value));

watch(progress, () => {
  if (!textPaginator.value || !totalPages.value) return;
  //console.log("watch progress", progress.value, totalPages.value);
  const type = prayersStore.isBook(itemId) ? "books" : "prayers";
  historyStore.updateProgress(itemId, progress.value, totalPages.value, type);
});

const isPageNavHidden = ref(true);

const onPageSliderChange = (value: number) => {
  isNavbarHidden.value = true;
  // Мгновенный переход (без анимации): плавный скролл в вертикальном режиме
  // порождает промежуточные значения currentPage во время анимации, которые
  // через f7-range's :value заново триггерят range:change и откатывают страницу назад
  textPaginator.value?.goToPage(value, false);
};

// --- Поиск по тексту ---
const pagesForSearch = computed<readonly string[]>(() => textPaginator.value?.pages || []);
const {
  query: searchQuery,
  matches: searchMatches,
  activeMatchId,
  activeMatchIndex,
  activeMatch,
  goToMatch,
  goToNextMatch,
  goToPrevMatch,
  getHighlightedPageHtml,
  resetSearch,
} = useTextSearch(pagesForSearch);

const isSearchPageOpened = ref(false);
const isSearchModeActive = ref(false);

const onOpenSearch = () => {
  isSearchPageOpened.value = true;
};

const onSelectMatch = (id: number) => {
  goToMatch(id);
  isSearchPageOpened.value = false;
  isSearchModeActive.value = true;
  readingBarsAnimate.value = false;
  isNavbarHidden.value = true;
  isPageNavHidden.value = true;
  nextTick(() => {
    readingBarsAnimate.value = true;
  });

  const match = searchMatches.value.find((m) => m.id === id);
  if (match) {
    textPaginator.value?.goToPage(match.page, false);
  }
};

const onSearchNext = () => {
  goToNextMatch();
};

const onSearchPrev = () => {
  goToPrevMatch();
};

const onCloseSearch = () => {
  isSearchModeActive.value = false;
  isSearchPageOpened.value = false;
  resetSearch();
};

// Сначала обновляем HTML подсветки, затем переходим к странице совпадения.
// Иначе refreshDisplay пересоберёт слайды Swiper в середине анимации.
watch(activeMatch, () => {
  if (!isSearchModeActive.value) return;
  textPaginator.value?.refreshDisplay();
  if (activeMatch.value) {
    textPaginator.value?.goToPage(activeMatch.value.page, false);
  }
}, { flush: 'post' });

watch(isSearchModeActive, () => {
  textPaginator.value?.refreshDisplay();
}, { flush: 'post' });

// Сбрасываем поиск при смене языка — страницы пересчитываются, старые совпадения не валидны
watch(currentLanguage, () => {
  onCloseSearch();
});

const { showUndoToast: showUndoResetToast } = useUndoToast({
  text: "Прогресс сброшен",
  onUndo: () => {    
    historyStore.undoResetProgress();
    const { progress } = historyStore.getItem(itemId) || {};

    console.log("showUndoResetToast onUndo, progress = ", progress);
    if (progress) {
      textPaginator.value?.setProgress(progress);
    }
  },
});

const resetProgress = () => {
  if (!itemId) {
    return;
  }

  textPaginator.value?.goToPage(1, false);
  showUndoResetToast();
}

// Управление яркостью
const isBrightnessTouching = computed(() => navbarRef.value?.isBrightnessTouching || false);

</script>
<style scoped lang="less">
// Стили перенесены в компонент PrayersTextNavbar
.dark .page {
  --f7-bars-bg-color: var(--content-color-baige-5-no-opacity);
}
</style>
