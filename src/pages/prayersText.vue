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
    <f7-page-content>
      <TextPaginator 
        :isLoading="isLoading" 
        :text="text" 
        :initialProgress="initialProgress"
        :lang="currentLanguage"
        :itemId="itemId"
        :modified-ts="data?.modified_ts ?? 0"
        :highlightTransform="isSearchModeActive ? getHighlightedPageHtml : undefined"
        ref="textPaginator" 
        @tap="onTextPaginatorTap"
        @touchstart="onTextPaginatorTouchStart"
        @touchend="onTextPaginatorTouchEnd" />
      <!-- Пока протяжка ползунка не устоялась, реальный переход отложен —
           закрываем текст фоном текущей темы чтения (не сам reading-text,
           у которого горизонтальный режим рендерит слайды через Shadow DOM) -->
      <div v-if="isPageScrubbing" class="page-scrub-overlay" :class="`theme-${textTheme}`"></div>
      <!-- Подзаголовок текущей страницы слайдера — как в large title navbar -->
      <div
        v-if="isSliderScrubbing && subtitle.length"
        class="page-scrub-heading"
        :class="`theme-${textTheme}`"
      >
        <div
          class="page-scrub-subtitle"
          :class="{ 'lang-cs': currentLanguage === 'cs' }"
        >
          <span
            v-for="(item, index) in subtitle"
            :key="index"
            class="page-scrub-subtitle-item"
          >{{ item }}</span>
        </div>
      </div>
      <!-- Индикатор закладки на текущей странице (тап обрабатывается через detectTapZone) -->
      <div
        v-if="currentPageBookmark && isNavbarHidden"
        class="bookmark-corner-indicator"
      >
        <SvgIcon icon="bookmark-filled" color="primary-accent-50" :size="24" />
      </div>
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
    <BookmarkNavigationToolbar
      v-if="isBookmarkNavActive"
      v-show="!isBrightnessTouching"
      :current-index="activeBookmarkIndex"
      :total="bookmarksForItem.length"
      :is-hidden="false"
      @next="goToNextBookmark"
      @prev="goToPrevBookmark"
      @open-list="openBookmarksList"
      @close="closeBookmarkNav"
    />
    <ChapterNavigationToolbar
      v-if="isChapterNavActive"
      v-show="!isBrightnessTouching"
      :current-index="activeHeaderIndex"
      :total="headers.length"
      :is-hidden="false"
      @next="goToNextHeader"
      @prev="goToPrevHeader"
      @open-list="openContentPopup"
      @close="closeChapterNav"
    />
    <PageNavigationToolbar
      v-show="!isBrightnessTouching"
      :current-page="currentPage"
      :total-pages="totalPages"
      :is-hidden="isPageNavHidden"
      :animate-visibility="readingBarsAnimate"
      @reset-progress="resetProgress"
      @page-change="onPageSliderChange"
      @scrub-move="onPageScrubMove"
      @scrub-settle="isPageScrubbing = false"
      @scrub-end="onPageScrubEnd"
    />
    <PrayersTextContentPopup
      v-model:isOpened="isContentPopupOpened"
      :itemId="itemId"
      :title="title"
      :headers="headers"
      :page="currentPage"
      :lang="currentLanguage"
      :bookmarks="bookmarksForItem"
      :initial-tab="contentPopupInitialTab"
      :active-bookmark-id="isBookmarkNavActive ? activeBookmarkId : null"
      :active-header-index="isChapterNavActive ? activeHeaderIndex : null"
      @goToHeader="onGoToHeaderFromPopup"
      @goToBookmark="onGoToBookmarkFromPopup"
      @editBookmark="onEditBookmarkFromPopup"
      @deleteBookmark="onDeleteBookmarkFromPopup"
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
import { useBookmarks } from "@/composables/useBookmarks";

import PrayersTextContentPopup from "@/components/PrayersTextContentPopup.vue";
import PrayersTextSearchPage from "@/components/PrayersTextSearchPage.vue";
import TextPaginator from "@/components/TextPaginator.vue"
import TextSettingsSelector from "@/components/TextSettingsSelector.vue";
import PrayersTextNavbar from "@/components/PrayersTextNavbar.vue";
import PageNavigationToolbar from "@/components/PageNavigationToolbar.vue";
import SearchNavigationToolbar from "@/components/SearchNavigationToolbar.vue";
import BookmarkNavigationToolbar from "@/components/BookmarkNavigationToolbar.vue";
import ChapterNavigationToolbar from "@/components/ChapterNavigationToolbar.vue";
import SvgIcon from "@/components/SvgIcon.vue";

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

// Пока палец на слайдере — считаем заголовок по странице ползунка, а не по
// отложенному goToPage (иначе подзаголовок отстаёт на debounce)
const scrubPreviewPage = ref<number | null>(null);

const subtitle = computed<string[]>(() => {
  const result: string[] = [];
  const page = scrubPreviewPage.value ?? currentPage.value;

  // Находим индекс последнего заголовка, страница которого <= текущей
  let currentFlatIndex = -1;
  for (let i = 0; i < headers.value.length; i++) {
    if (headers.value[i].page <= page) {
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
const contentPopupInitialTab = ref<"content" | "bookmarks">("content");

// Получение headers из TextPaginator
const headers = computed(() => {
  const headersData = textPaginator.value?.headers || [];
  // Преобразуем readonly массив в мутабельный для совместимости типов
  return [...headersData];
});

// Функция для открытия попапа с содержанием
const openContentPopup = () => {
  contentPopupInitialTab.value = "content";
  isContentPopupOpened.value = true;
};

const openBookmarksList = () => {
  contentPopupInitialTab.value = "bookmarks";
  isContentPopupOpened.value = true;
};

const readingBarsAnimate = ref(true);

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
  if (saveProgressTimer) {
    clearTimeout(saveProgressTimer);
    saveProgressTimer = null;
    saveProgress();
  }
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

const onTextPaginatorTap = (payload: { type: "center" | "left" | "right" | "top" | "bottom" | "bookmark"; x: number; y: number }) => {
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

  } else if (type === "bookmark") {
    onCornerTap();

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

// Закладки
const {
  bookmarksForItem,
  currentPageBookmark,
  isBookmarkNavActive,
  activeBookmarkId,
  activeBookmarkIndex,
  activeBookmark,
  goToBookmark,
  goToNextBookmark,
  goToPrevBookmark,
  closeBookmarkNav,
  onCornerTap,
  openEditDialog: openBookmarkEditDialog,
  deleteBookmarkWithUndo,
} = useBookmarks(itemId, progress, totalPages);

const onGoToBookmarkFromPopup = (id: string) => {
  if (isSearchModeActive.value) {
    onCloseSearch();
  }
  closeChapterNav();
  goToBookmark(id);
  readingBarsAnimate.value = false;
  isNavbarHidden.value = true;
  isPageNavHidden.value = true;
  nextTick(() => {
    readingBarsAnimate.value = true;
  });
};

const onEditBookmarkFromPopup = (id: string) => {
  const bookmark = bookmarksForItem.value.find((b) => b.id === id);
  if (bookmark) {
    openBookmarkEditDialog(bookmark);
  }
};

const onDeleteBookmarkFromPopup = (id: string) => {
  deleteBookmarkWithUndo(id);
};

// При переходе к закладке из режима навигации по закладкам — сдвигаем читалку на её прогресс
watch(activeBookmark, (bookmark) => {
  if (isBookmarkNavActive.value && bookmark) {
    textPaginator.value?.setProgress(bookmark.progress);
  }
}, { flush: 'post' });

const isChapterNavActive = ref(false);
const activeHeaderIndex = ref(-1);

const goToHeader = (index: number) => {
  if (index < 0 || index >= headers.value.length) return;
  activeHeaderIndex.value = index;
  isChapterNavActive.value = true;
};

const goToNextHeader = () => {
  const list = headers.value;
  if (list.length === 0) return;
  const idx = (activeHeaderIndex.value + 1 + list.length) % list.length;
  activeHeaderIndex.value = idx;
};

const goToPrevHeader = () => {
  const list = headers.value;
  if (list.length === 0) return;
  const idx = (activeHeaderIndex.value - 1 + list.length) % list.length;
  activeHeaderIndex.value = idx;
};

const closeChapterNav = () => {
  isChapterNavActive.value = false;
  activeHeaderIndex.value = -1;
};

const onGoToHeaderFromPopup = (index: number) => {
  if (isSearchModeActive.value) {
    onCloseSearch();
  }
  closeBookmarkNav();
  goToHeader(index);
  readingBarsAnimate.value = false;
  isNavbarHidden.value = true;
  isPageNavHidden.value = true;
  nextTick(() => {
    readingBarsAnimate.value = true;
  });
};

watch(
  [activeHeaderIndex, isChapterNavActive],
  () => {
    if (!isChapterNavActive.value) return;
    const header = headers.value[activeHeaderIndex.value];
    if (header) {
      textPaginator.value?.goToPage(header.page, false);
    }
  },
  { flush: "post" }
);

watch(headers, (list) => {
  if (!isChapterNavActive.value) return;
  if (list.length === 0) {
    closeChapterNav();
    return;
  }
  if (activeHeaderIndex.value >= list.length) {
    activeHeaderIndex.value = list.length - 1;
  }
});

const saveProgress = () => {
  if (!textPaginator.value || !totalPages.value) return;
  const type = prayersStore.isBook(itemId) ? "books" : "prayers";
  historyStore.updateProgress(itemId, progress.value, totalPages.value, type);
};

let saveProgressTimer: ReturnType<typeof setTimeout> | null = null;
watch(progress, () => {
  if (!textPaginator.value || !totalPages.value) return;
  if (saveProgressTimer) {
    clearTimeout(saveProgressTimer);
  }
  // IndexedDB на каждый шаг слайдера/свайпа даёт заметный лаг при большом числе страниц
  saveProgressTimer = setTimeout(() => {
    saveProgressTimer = null;
    saveProgress();
  }, 300);
});

const isPageNavHidden = ref(true);

// Пока ползунок страниц двигается, реальный переход по тексту отложен
// (дебаунс в PageNavigationToolbar), поэтому видимый текст не соответствует
// счётчику — прячем его оверлеем. Как только переход применится (даже без
// отпускания пальца, на паузе), PageNavigationToolbar пришлёт scrub-settle.
const isPageScrubbing = ref(false);
// После протяжки слайдера заголовок оставляем, пока видно нижнее меню
const isSliderScrubbing = ref(false);

const onPageScrubMove = (page: number) => {
  isSliderScrubbing.value = true;
  scrubPreviewPage.value = page;
  isPageScrubbing.value = true;
  isNavbarHidden.value = true;
};

const onPageScrubEnd = () => {
  scrubPreviewPage.value = null;
};

watch(isPageNavHidden, (hidden) => {
  if (hidden) {
    isSliderScrubbing.value = false;
    scrubPreviewPage.value = null;
  }
});

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
  closeBookmarkNav();
  closeChapterNav();
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
  closeBookmarkNav();
  closeChapterNav();
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

// Фон берётся из того же общего правила [class*=' theme-'] в reading-text.less,
// что и у .reading-text/.text-page — визуально это просто "пустая" страница чтения
.page-scrub-overlay {
  position: absolute;
  top: var(--f7-safe-area-top);
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
}

.page-scrub-heading {
  position: absolute;
  top: var(--f7-safe-area-top);
  left: 0;
  right: 0;
  z-index: 7;
  padding: 4px 12px 4px; // 8px 12px 8px;
  pointer-events: none;
  background-color: var(--reading-text-background-color);
}

.page-scrub-subtitle {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  font-size: 16px;
  font-weight: 400;
  line-height: 130%;
  color: var(--reading-text-subtitle-color);
  hyphens: none;

  &.lang-cs {
    font-family: "Triodion Unicode";
  }
}

.page-scrub-subtitle-item:not(:first-child) {
  white-space: nowrap;
}

.page-scrub-subtitle-item:not(:first-child)::before {
  content: "";
  display: inline-block;
  width: 5px;
  height: 5px;
  margin: 0 7.5px;
  border-radius: 50%;
  background-color: var(--reading-text-subtitle-color);
  vertical-align: middle;
}

// Индикатор закладки на текущей странице — тап всё равно обрабатывается через
// detectTapZone/onTextPaginatorTap, поэтому сам оверлей не должен перехватывать события
.bookmark-corner-indicator {
  position: absolute;
  top: calc(var(--f7-safe-area-top) + 10px);
  right: 8px;
  pointer-events: none;
  z-index: 6;
}
</style>
