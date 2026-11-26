<template>
  <f7-page
    ref="readingPage"
    class="reading-page"
    :page-content="false"
    @page:beforein="onPageBeforeIn"
    @page:beforeout="onPageBeforeOut"
    @page:afterout="onPageAfterOut"
  >
    <PrayersTextNavbar
      ref="navbar"
      :title="title"
      :subtitle="subtitle"
      :item-id="props.itemId"
      :item-url="props.itemUrl"
      v-model:current-language="currentLanguage"
      :available-languages="availableLanguages"
      :text-theme="textTheme"
      :is-hidden="isNavbarHidden"
      :animate-visibility="readingBarsAnimate"
      :favorite="navbarFavorite"
      :is-favorite-disabled="isLoading || !data"
      @toggle-text-settings="toggleTextSettingsSheet"
      @open-content-popup="openContentPopup"
      @open-search="onOpenSearch"
      @start-tutorial="onStartTutorial"
    />
    <f7-page-content :class="`theme-${settingsStore.textTheme}`">
      <TextPaginator
        :isLoading="isLoading"
        :text="text"
        :initialProgress="initialProgress"
        :lang="currentLanguage"
        :itemId="props.itemId"
        :modified-ts="data?.modified_ts ?? 0"
        :highlightTransform="isSearchModeActive ? getHighlightedPageHtml : undefined"
        :bookmarked-pages="bookmarkedPages"
        :show-bookmark-tabs="isNavbarHidden"
        ref="textPaginator"
        @tap="onTextPaginatorTap"
        @action="onTextAction"
        @touchstart="onTextPaginatorTouchStart"
      />
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
      <div
        v-if="currentPageBookmark && isNavbarHidden && settingsStore.pageMode !== 'vertical' && !isTextCalculating && totalPages > 0"
        class="bookmark-corner-indicator"
      >
        <SvgIcon icon="bookmark-filled" color="primary-accent-50" :size="24" />
      </div>
    </f7-page-content>
    <TextSettingsSelector
      ref="textSettingsSelector"
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
      v-if="isBookmarkNavActive && settingsStore.isBookmarkNavToolbarEnabled"
      ref="bookmarkNavToolbar"
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
      v-if="isChapterNavActive && settingsStore.isChapterNavToolbarEnabled"
      ref="chapterNavToolbar"
      v-show="!isBrightnessTouching"
      :current-index="activeChapterPageIndex"
      :total="chapterPageIndices.length"
      :is-hidden="false"
      @next="goToNextHeader"
      @prev="goToPrevHeader"
      @open-list="openContentPopup"
      @close="closeChapterNav"
    />
    <PageNavigationToolbar
      ref="pageNavToolbar"
      v-show="!isBrightnessTouching"
      :current-page="currentPage"
      :total-pages="totalPages"
      :is-hidden="isPageNavHidden"
      :animate-visibility="readingBarsAnimate"
      :show-reset-progress="Boolean(props.history)"
      @reset-progress="resetProgress"
      @page-change="onPageSliderChange"
      @scrub-move="onPageScrubMove"
      @scrub-settle="isPageScrubbing = false"
      @scrub-end="onPageScrubEnd"
    />
    <PrayersTextContentPopup
      ref="contentPopup"
      v-model:isOpened="isContentPopupOpened"
      :itemId="props.itemId"
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

    <FootnoteSheet
      v-model:opened="isFootnoteSheetOpened"
      :html="footnoteHtml"
      @anchor="onFootnoteAnchor"
    />
    <ReadingBasicsTutorial
      v-if="isBasicsTutorialActive"
      :page-mode="settingsStore.pageMode"
      :step="basicsStep"
      :steps-count="basicsStepsCount"
      @next="nextBasicsStep"
      @prev="prevBasicsStep"
      @close="skipBasicsTutorial"
    />
    <SpotlightHint
      v-if="activeHintTargets"
      :targets="activeHintTargets"
      @close="closeActiveHint"
    />
  </f7-page>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, useTemplateRef, watch, nextTick, onUnmounted } from "vue";
import type { Router } from "framework7/types";
import { f7 } from "framework7-vue";
import type { Swiper } from "swiper";
import type { Language } from "@/types/common";

import { useTheme } from "@/composables/useTheme";
import { useReadingHistoryStore } from "@/stores/readingHistory";
import { useComponentsStore } from "@/stores/components";
import { useSettingsStore } from "@/stores/settings";
import { useUndoToast } from "@/composables/useUndoToast";
import { useTextSearch } from "@/composables/useTextSearch";
import { useBookmarks, progressToPage } from "@/composables/useBookmarks";
import { useReadingTutorial } from "@/composables/useReadingTutorial";
import { isScreenEdgeClientX } from "@/composables/useSwipeout";

import PrayersTextContentPopup from "@/components/PrayersTextContentPopup.vue";
import PrayersTextSearchPage from "@/components/PrayersTextSearchPage.vue";
import TextPaginator from "@/components/TextPaginator.vue";
import TextSettingsSelector from "@/components/TextSettingsSelector.vue";
import PrayersTextNavbar, { type NavbarFavoriteConfig } from "@/components/PrayersTextNavbar.vue";
import FootnoteSheet from "@/components/FootnoteSheet.vue";
import PageNavigationToolbar from "@/components/PageNavigationToolbar.vue";
import SearchNavigationToolbar from "@/components/SearchNavigationToolbar.vue";
import BookmarkNavigationToolbar from "@/components/BookmarkNavigationToolbar.vue";
import ChapterNavigationToolbar from "@/components/ChapterNavigationToolbar.vue";
import ReadingBasicsTutorial from "@/components/reading-tutorial/ReadingBasicsTutorial.vue";
import SpotlightHint, { type SpotlightTarget } from "@/components/reading-tutorial/SpotlightHint.vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useApiState } from "@/composables/useApiState";
import { device } from "@/js/device";
import { noteReadingInteraction, startReadingScreenTimeout, stopReadingScreenTimeout } from "@/js/device/readingScreenTimeout";
import { prepareReadingHtml, type TextAction } from "@/text-processing-v3/readingAnnotations";
import type {
  ReaderFavoriteConfig,
  ReaderHistoryConfig,
  ReaderTextDocument,
} from "@/components/textReader";

const props = withDefaults(
  defineProps<{
    itemId: string;
    initialTitle?: string;
    itemUrl?: string;
    load: () => Promise<ReaderTextDocument>;
    /** null — кнопка Избранного скрыта (например, житие святого) */
    favorite?: ReaderFavoriteConfig | null;
    /** null — прогресс не запоминается и кнопка сброса скрыта (мысль/притча дня) */
    history?: ReaderHistoryConfig | null;
    f7router: Router.Router;
  }>(),
  {
    initialTitle: "",
    itemUrl: "",
    favorite: null,
    history: null,
  }
);

const { isDarkMode } = useTheme();
const navbarRef = useTemplateRef<InstanceType<typeof PrayersTextNavbar>>("navbar");
const pageNavToolbarRef = useTemplateRef<InstanceType<typeof PageNavigationToolbar>>("pageNavToolbar");
const chapterNavToolbarRef = useTemplateRef<InstanceType<typeof ChapterNavigationToolbar>>("chapterNavToolbar");
const bookmarkNavToolbarRef = useTemplateRef<InstanceType<typeof BookmarkNavigationToolbar>>("bookmarkNavToolbar");
const contentPopupRef = useTemplateRef<InstanceType<typeof PrayersTextContentPopup>>("contentPopup");
const textSettingsSelectorRef = useTemplateRef<InstanceType<typeof TextSettingsSelector>>("textSettingsSelector");

const historyStore = useReadingHistoryStore();
const settingsStore = useSettingsStore();
const { getComponent } = useComponentsStore();

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

// Название может прийти только после загрузки (например, чтение дня), поэтому title - ref
const title = ref(props.initialTitle);
const favoriteTitle = ref(props.initialTitle);

const navbarFavorite = computed<NavbarFavoriteConfig | null>(() => {
  if (!props.favorite) return null;
  return {
    type: props.favorite.type,
    meta: props.favorite.withMeta
      ? { title: favoriteTitle.value || title.value, url: props.itemUrl }
      : undefined,
  };
});

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

// Предпочтение языка живёт в настройках и меняется только явным выбором в селекторе.
// Если у текста этого языка нет, показываем запасной и настройку не перезаписываем.
const displayLanguage = ref<Language | null>(settingsStore.currentLanguage);
const currentLanguage = computed({
  get: () => displayLanguage.value,
  set: (language: Language | null) => {
    const previous = displayLanguage.value;
    displayLanguage.value = language;
    if (language && language !== previous) {
      settingsStore.setLanguage(language);
    }
  },
});
const availableLanguages = ref<Language[]>([]);

console.time("textReader: apiCall");
const { isLoading, error, data } = useApiState(props.load());

watch(data, async () => {
  if (!data.value) return;
  console.timeEnd("textReader: apiCall");
  if (data.value.title) {
    title.value = data.value.title;
  }
  favoriteTitle.value = data.value.favoriteTitle ?? title.value;

  // Обновляем доступные языки
  availableLanguages.value = data.value.lang;

  // Запасной язык пишем в displayLanguage, не в computed: сеттер сохранил бы его в настройки.
  displayLanguage.value = settingsStore.getLanguageFromAvailable(availableLanguages.value);

  updateReaderText(currentLanguage.value);
});

const updateReaderText = (language: Language | null) => {
  if (!data.value) return;

  let rawText = "";

  switch (language) {
    case "cs-cf":
      rawText = data.value.text_cs_cf || "";
      break;
    case "cs":
      rawText = data.value.text_cs || "";
      break;
    case "ru":
      rawText = data.value.text_ru || "";
      break;
    default:
      rawText = data.value.text || "";
  }

  const prepared = prepareReadingHtml(rawText);
  currentFootnotes.value = prepared.footnotes;
  rawText = prepared.html;

  const hasExistingHeader = /^\s*<h[12]/.test(rawText);

  if (hasExistingHeader) {
    rawText = rawText.replace(/^(\s*)<h2([^>]*)>/i, "$1<h1$2>").replace(/<\/h2>/i, "</h1>");
    text.value = rawText;
  } else {
    text.value = `<h1>${title.value}</h1>\n\n${rawText}`;
  }
};

const initialProgress = computed(() =>
  props.history ? historyStore.getItem(props.itemId)?.progress || 0 : 0
);

watch(error, async () => {
  if (!error.value) return;
  console.log("error", error.value);
  currentFootnotes.value = {};
  text.value = `Данные не найдены`;
});

watch(displayLanguage, (newLanguage) => {
  updateReaderText(newLanguage);
});

const isNavbarHidden = ref(true);

let readingScreenTimeoutStarted = false;

const releaseReadingScreenTimeout = () => {
  if (!readingScreenTimeoutStarted) return;
  readingScreenTimeoutStarted = false;
  stopReadingScreenTimeout();
};

const onPageBeforeIn = () => {
  const bottomTabBar = getComponent("bottomTabBar");
  bottomTabBar?.hide(true);

  if (settingsStore.readingBrightness !== -1) {
    device.setBrightness(settingsStore.readingBrightness);
  }

  isReadingPageActive.value = true;
  syncReadingSystemBars();

  if (settingsStore.keepScreenOn) {
    if (!readingScreenTimeoutStarted) {
      startReadingScreenTimeout();
      readingScreenTimeoutStarted = true;
    }
  } else if (readingScreenTimeoutStarted) {
    releaseReadingScreenTimeout();
  } else {
    device.keepScreenOn(false);
  }

  if (settingsStore.isVolumeButtonsScrollEnabled) {
    device.onVolumeKey((keyCode) => {
      noteReadingInteraction();
      switch (keyCode) {
        case device.KEYCODE_VOLUME_UP:
          textPaginator.value?.slidePrev();
          break;
        case device.KEYCODE_VOLUME_DOWN:
          textPaginator.value?.slideNext();
          break;
      }
    });
  }
};

let dismissBookmarkTransient = () => {};

const onPageBeforeOut = () => {
  navbarRef.value?.closeMorePopup();
  // Sheet живёт с внешним backdrop вне страницы. destroy() его не закрывает,
  // и прозрачный backdrop остаётся поверх главной и съедает тапы.
  isTextSettingsSheetOpened.value = false;
  isFootnoteSheetOpened.value = false;
  dismissBookmarkTransient();
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
  isReadingPageActive.value = false;
  restoreReadingSystemBars();
  releaseReadingScreenTimeout();
  device.offVolumeKey();
};

onUnmounted(releaseReadingScreenTimeout);

const textPaginator = useTemplateRef<InstanceType<typeof TextPaginator>>("textPaginator");

const isTextCalculating = computed(() => {
  return textPaginator.value?.isCalculating || false;
});

const textTheme = computed(() => {
  return textPaginator.value?.theme || "light";
});

const currentFootnotes = shallowRef<Record<string, string>>({});
const footnoteHtml = ref("");
const isFootnoteSheetOpened = ref(false);

const hideReadingBars = () => {
  readingBarsAnimate.value = false;
  isNavbarHidden.value = true;
  isPageNavHidden.value = true;
  nextTick(() => {
    readingBarsAnimate.value = true;
  });
};

const onFootnoteAnchor = (id: string) => {
  if (textPaginator.value?.scrollToAnchor(id)) {
    hideReadingBars();
  }
};

const onTextAction = (action: TextAction) => {
  if (action.type === "footnote") {
    const html = currentFootnotes.value[action.id];
    if (!html) return;
    footnoteHtml.value = html;
    isFootnoteSheetOpened.value = true;
    return;
  }
  onFootnoteAnchor(action.id);
};

const onTextPaginatorTap = (payload: { type: "center" | "left" | "right" | "top" | "bottom" | "bookmark"; x: number; y: number; page?: number }) => {
  const { type } = payload;

  // Касание, которое закрыло меню, только закрывает их: ни открыть снова,
  // ни пролистать страницу. click приходит уже после touchend.
  if (menusClosedByTouch) {
    menusClosedByTouch = false;
    return;
  }

  if (!isNavbarHidden.value || !isPageNavHidden.value) {
    return;
  }

  if (
    shouldShowBasicsTutorial.value &&
    !isLoading.value &&
    !isTextCalculating.value &&
    !isSearchModeActive.value &&
    !isBookmarkNavActive.value &&
    !isChapterNavActive.value
  ) {
    startBasicsTutorial();
    return;
  }

  if (type === "center") {
    isNavbarHidden.value = false;
    isPageNavHidden.value = false;
  } else if (type === "bookmark") {
    onCornerTap(payload.page);
  } else if (type === "left" || type === "top") {
    textPaginator.value?.slidePrev();
  } else if (type === "right" || type === "bottom") {
    textPaginator.value?.slideNext();
  }
};

// Последнее касание закрыло верхнее или нижнее меню. Сбрасывается в следующем touchstart.
let menusClosedByTouch = false;

const readClientX = (event: Event): number | null => {
  if (event instanceof MouseEvent) {
    return event.clientX;
  }
  if (typeof TouchEvent !== "undefined" && event instanceof TouchEvent) {
    return event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX ?? null;
  }
  return null;
};

const onTextPaginatorTouchStart = (payload: { swiper: Swiper | null; event: Event }) => {
  menusClosedByTouch = false;
  // Верхний статус-бар скрыт: свайп от края — системный «Назад», меню не закрываем.
  const clientX = readClientX(payload.event);
  if (
    settingsStore.readingSystemBars !== "normal" &&
    clientX != null &&
    isScreenEdgeClientX(clientX, f7.width)
  ) {
    return;
  }

  if (!isNavbarHidden.value) {
    isNavbarHidden.value = true;
    menusClosedByTouch = true;
  }

  if (!isPageNavHidden.value) {
    isPageNavHidden.value = true;
    menusClosedByTouch = true;
  }
};

// Состояние навигации по страницам
const totalPages = computed(() => textPaginator.value?.pagesCount || 0);
const progress = computed(() => textPaginator.value?.progress || 0);
const currentPage = computed(() => {
  const page = textPaginator.value?.currentPage;
  if (page) return page;
  return progressToPage(progress.value, totalPages.value);
});

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
  closeToasts: closeBookmarkToasts,
  closeEditDialog: closeBookmarkEditDialog,
  onCornerTap,
  openEditDialog: openBookmarkEditDialog,
  deleteBookmarkWithUndo,
} = useBookmarks(props.itemId, currentPage, totalPages);

dismissBookmarkTransient = () => {
  closeBookmarkToasts();
  closeBookmarkEditDialog();
};

watch(isContentPopupOpened, (opened) => {
  if (opened) closeBookmarkToasts();
});

// Обучающий режим читалки — уровень 1 "Основы" (см. useReadingTutorial.ts)
const {
  isBasicsTutorialActive,
  basicsStep,
  basicsStepsCount,
  shouldShowBasicsTutorial,
  startBasicsTutorial,
  nextBasicsStep,
  prevBasicsStep,
  skipBasicsTutorial,
  shouldShowBarsHint,
  markBarsHintSeen,
  shouldShowChapterNavHint,
  markChapterNavHintSeen,
  shouldShowBookmarkNavHint,
  markBookmarkNavHintSeen,
  resetAllTutorialFlags,
} = useReadingTutorial();

// Уровень 2 обучающего режима — контекстные подсказки (см. SpotlightHint.vue).
const activeHintTargets = ref<SpotlightTarget[] | null>(null);
let activeHintDone: (() => void) | null = null;

const showSpotlightHint = (targets: SpotlightTarget[], onDone: () => void) => {
  if (!targets.length) return;
  activeHintTargets.value = targets;
  activeHintDone = onDone;
};

const closeActiveHint = () => {
  activeHintTargets.value = null;
  activeHintDone?.();
  activeHintDone = null;
};

const TOP_MENU_HINT_COPY: Record<string, { title: string; text: string }> = {
  menu: {
    title: "Содержание и закладки",
    text: "Открывает список глав и ваши закладки для этого текста.",
  },
  language: {
    title: "Смена языка",
    text: "Переключает язык текста молитвы.",
  },
  favorite: {
    title: "Добавить в Избранное",
    text: "Добавляет молитву в Избранное для быстрого доступа.",
  },
  settings: {
    title: "Настройки текста",
    text: "Изменяет размер шрифта, межстрочный интервал и тему чтения.",
  },
  more: {
    title: "Ещё",
    text: "Поиск по тексту, поделиться материалом и повторное обучение.",
  },
};

const RESET_PROGRESS_HINT = {
  title: "Читать сначала",
  text: "Удобно, если вы дочитали молитвы до конца и хотите, чтобы завтра они открылись с первой страницы.",
};

const CHAPTER_NAV_HINT_COPY = {
  toolbar: {
    title: "Листание по главам",
    text: "Стрелками можно переходить от главы к главе. В центре показано, какая глава сейчас открыта и сколько глав всего. Эту панель можно скрыть в {link}.",
    linkLabel: "настройках",
  },
  content: {
    title: "Содержание",
    text: "Открывает список глав, чтобы сразу перейти к нужной.",
  },
};

const BOOKMARK_NAV_HINT_COPY = {
  toolbar: {
    title: "Листание по закладкам",
    text: "Стрелками можно переходить от закладки к закладке. В центре показано, какая закладка сейчас открыта и сколько закладок всего. Эту панель можно скрыть в {link}.",
    linkLabel: "настройках",
  },
  list: {
    title: "Закладки",
    text: "Открывает список ваших закладок, чтобы сразу перейти к нужной.",
  },
};

const bookmarkedPages = computed(() =>
  [...new Set(bookmarksForItem.value.map((bookmark) => bookmark.page))]
);

const onGoToBookmarkFromPopup = (id: string) => {
  if (isSearchModeActive.value) {
    onCloseSearch();
  }
  closeChapterNav();
  if (settingsStore.isBookmarkNavToolbarEnabled) {
    goToBookmark(id);
  } else {
    closeBookmarkNav();
    const bookmark = bookmarksForItem.value.find((b) => b.id === id);
    if (bookmark) {
      textPaginator.value?.goToPage(bookmark.page, false);
    }
  }
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

// При переходе к закладке — открываем начало её страницы, а не позицию внутри
watch(
  activeBookmark,
  (bookmark) => {
    if (isBookmarkNavActive.value && bookmark) {
      textPaginator.value?.goToPage(bookmark.page, false);
    }
  },
  { flush: "post" }
);

const isChapterNavActive = ref(false);
const activeHeaderIndex = ref(-1);

const chapterPageIndices = computed(() => {
  if (settingsStore.pageMode === "vertical") {
    return headers.value.map((_, index) => index);
  }
  const indices: number[] = [];
  let lastPage: number | null = null;
  headers.value.forEach((header, index) => {
    if (header.page !== lastPage) {
      indices.push(index);
      lastPage = header.page;
    }
  });
  return indices;
});

const activeChapterPageIndex = computed(() => {
  if (settingsStore.pageMode === "vertical") {
    const index = activeHeaderIndex.value;
    return index >= 0 && index < headers.value.length ? index : -1;
  }
  const header = headers.value[activeHeaderIndex.value];
  if (!header) return -1;
  return chapterPageIndices.value.findIndex(
    (index) => headers.value[index].page === header.page
  );
});

const goToHeader = (index: number) => {
  if (index < 0 || index >= headers.value.length) return;
  activeHeaderIndex.value = index;
  isChapterNavActive.value = true;
};

const goToNextHeader = () => {
  const steps = chapterPageIndices.value;
  if (steps.length <= 1) return;
  const current = activeChapterPageIndex.value;
  const next = (current + 1 + steps.length) % steps.length;
  activeHeaderIndex.value = steps[next];
};

const goToPrevHeader = () => {
  const steps = chapterPageIndices.value;
  if (steps.length <= 1) return;
  const current = activeChapterPageIndex.value;
  const prev = (current - 1 + steps.length) % steps.length;
  activeHeaderIndex.value = steps[prev];
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
  if (settingsStore.isChapterNavToolbarEnabled) {
    goToHeader(index);
  } else {
    closeChapterNav();
    textPaginator.value?.scrollToHeader(index);
  }
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
    textPaginator.value?.scrollToHeader(activeHeaderIndex.value);
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

const openSettingsFromHint = () => {
  closeActiveHint();
  props.f7router.navigate("/settings/");
};

const showChapterNavHint = () => {
  const toolbarEl = chapterNavToolbarRef.value?.getToolbarEl();
  if (!toolbarEl) return;

  const targets: SpotlightTarget[] = [
    {
      title: CHAPTER_NAV_HINT_COPY.toolbar.title,
      text: CHAPTER_NAV_HINT_COPY.toolbar.text,
      getTargetEl: () => chapterNavToolbarRef.value?.getToolbarEl(),
      shape: "rounded",
      link: {
        label: CHAPTER_NAV_HINT_COPY.toolbar.linkLabel,
        onClick: openSettingsFromHint,
      },
    },
  ];

  if (chapterNavToolbarRef.value?.getContentLinkEl()) {
    targets.push({
      title: CHAPTER_NAV_HINT_COPY.content.title,
      text: CHAPTER_NAV_HINT_COPY.content.text,
      getTargetEl: () => chapterNavToolbarRef.value?.getContentLinkEl(),
      shape: "circle",
    });
  }

  showSpotlightHint(targets, markChapterNavHintSeen);
};

watch(isChapterNavActive, (active) => {
  if (!active) {
    if (activeHintDone === markChapterNavHintSeen) {
      closeActiveHint();
    }
    return;
  }
  if (
    !shouldShowChapterNavHint.value ||
    isBasicsTutorialActive.value ||
    activeHintTargets.value
  ) {
    return;
  }
  nextTick(() => {
    setTimeout(() => {
      if (
        !isChapterNavActive.value ||
        !shouldShowChapterNavHint.value ||
        activeHintTargets.value
      ) {
        return;
      }
      showChapterNavHint();
    }, 350);
  });
});

const showBookmarkNavHint = () => {
  const toolbarEl = bookmarkNavToolbarRef.value?.getToolbarEl();
  if (!toolbarEl) return;

  const targets: SpotlightTarget[] = [
    {
      title: BOOKMARK_NAV_HINT_COPY.toolbar.title,
      text: BOOKMARK_NAV_HINT_COPY.toolbar.text,
      getTargetEl: () => bookmarkNavToolbarRef.value?.getToolbarEl(),
      shape: "rounded",
      link: {
        label: BOOKMARK_NAV_HINT_COPY.toolbar.linkLabel,
        onClick: openSettingsFromHint,
      },
    },
  ];

  if (bookmarkNavToolbarRef.value?.getListLinkEl()) {
    targets.push({
      title: BOOKMARK_NAV_HINT_COPY.list.title,
      text: BOOKMARK_NAV_HINT_COPY.list.text,
      getTargetEl: () => bookmarkNavToolbarRef.value?.getListLinkEl(),
      shape: "circle",
    });
  }

  showSpotlightHint(targets, markBookmarkNavHintSeen);
};

watch(isBookmarkNavActive, (active) => {
  if (!active) {
    if (activeHintDone === markBookmarkNavHintSeen) {
      closeActiveHint();
    }
    return;
  }
  if (
    !shouldShowBookmarkNavHint.value ||
    isBasicsTutorialActive.value ||
    activeHintTargets.value
  ) {
    return;
  }
  nextTick(() => {
    setTimeout(() => {
      if (
        !isBookmarkNavActive.value ||
        !shouldShowBookmarkNavHint.value ||
        activeHintTargets.value
      ) {
        return;
      }
      showBookmarkNavHint();
    }, 350);
  });
});

const buildHistoryMeta = () =>
  props.history?.withMeta ? { title: title.value, url: props.itemUrl } : undefined;

const saveProgress = () => {
  if (!props.history || !textPaginator.value || !totalPages.value) return;
  void historyStore.updateProgress(
    props.itemId,
    progress.value,
    totalPages.value,
    props.history.type,
    buildHistoryMeta()
  );
};

let saveProgressTimer: ReturnType<typeof setTimeout> | null = null;
watch(progress, () => {
  if (!props.history || !textPaginator.value || !totalPages.value) return;
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
const isReadingPageActive = ref(false);
const isSliderScrubbing = ref(false);

const syncReadingSystemBars = () => {
  const navbarVisible = !isNavbarHidden.value;
  const pageNavVisible = !isPageNavHidden.value;
  const barsMode = settingsStore.readingSystemBars;
  const hidesSystemBars = barsMode !== "normal";
  const scrubHidesSystemBars = isSliderScrubbing.value && hidesSystemBars;
  const chromeVisible = navbarVisible || (pageNavVisible && !scrubHidesSystemBars);
  const keepSystemBars = !hidesSystemBars || chromeVisible;

  if (!keepSystemBars) {
    if (barsMode === "fullscreen") {
      device.showStatusBar(false);
      device.setFullScreen(true);
    } else {
      device.setFullScreen(false);
      device.showStatusBar(false);
    }
  } else {
    device.setFullScreen(false);
    device.showStatusBar(true);
  }

  device.setStatusBarTextColor(
    chromeVisible
      ? (isDarkMode.value ? "light" : "dark")
      : (settingsStore.textTheme === "dark" ? "light" : "dark")
  );
};

const restoreReadingSystemBars = () => {
  device.setFullScreen(false);
  device.showStatusBar(true);
  device.setStatusBarTextColor(isDarkMode.value ? "light" : "dark");
};

watch(
  [
    isNavbarHidden,
    isPageNavHidden,
    isSliderScrubbing,
    () => settingsStore.readingSystemBars,
    () => settingsStore.textTheme,
    isDarkMode,
  ],
  () => {
    if (!isReadingPageActive.value) return;
    syncReadingSystemBars();
  }
);

watch([isNavbarHidden, isPageNavHidden], ([navHidden, pageNavHidden]) => {
  if (navHidden || pageNavHidden || !shouldShowBarsHint.value) return;
  setTimeout(() => {
    if (isNavbarHidden.value || isPageNavHidden.value) return;
    const targets: SpotlightTarget[] = (navbarRef.value?.getIconTargets() ?? [])
      .filter((target) => target.el)
      .map((target) => ({
        title: TOP_MENU_HINT_COPY[target.key].title,
        text: TOP_MENU_HINT_COPY[target.key].text,
        getTargetEl: () => target.el,
        shape: "circle" as const,
      }));
    const resetEl = pageNavToolbarRef.value?.getResetLinkEl();
    if (resetEl) {
      targets.push({
        title: RESET_PROGRESS_HINT.title,
        text: RESET_PROGRESS_HINT.text,
        getTargetEl: () => resetEl,
        shape: "circle",
      });
    }
    showSpotlightHint(targets, markBarsHintSeen);
  }, 350);
});

const isPageScrubbing = ref(false);

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
  const wasSearchActive = isSearchModeActive.value;
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

  if (settingsStore.pageMode === "vertical") {
    if (wasSearchActive) {
      textPaginator.value?.focusSearchMatch(activeMatch.value, searchMatches.value, searchQuery.value);
    }
    return;
  }

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

watch(
  activeMatch,
  () => {
    if (!isSearchModeActive.value) return;
    if (settingsStore.pageMode === "vertical") {
      if (isSearchPageOpened.value) return;
      textPaginator.value?.focusSearchMatch(activeMatch.value, searchMatches.value, searchQuery.value);
      return;
    }
    textPaginator.value?.refreshDisplay();
    if (activeMatch.value) {
      textPaginator.value?.goToPage(activeMatch.value.page, false);
    }
  },
  { flush: "post" }
);

watch(
  isSearchModeActive,
  (active) => {
    if (active && settingsStore.pageMode === "vertical") return;
    textPaginator.value?.refreshDisplay();
  },
  { flush: "post" }
);

watch(
  isSearchPageOpened,
  (opened) => {
    if (opened || !isSearchModeActive.value || settingsStore.pageMode !== "vertical") return;
    textPaginator.value?.focusSearchMatch(activeMatch.value, searchMatches.value, searchQuery.value);
  },
  { flush: "post" }
);

watch(displayLanguage, () => {
  isFootnoteSheetOpened.value = false;
  onCloseSearch();
  closeBookmarkNav();
  closeChapterNav();
  closeBookmarkToasts();
});

watch(
  () => settingsStore.isChapterNavToolbarEnabled,
  (enabled) => {
    if (!enabled) {
      closeChapterNav();
    }
  }
);

watch(
  () => settingsStore.isBookmarkNavToolbarEnabled,
  (enabled) => {
    if (!enabled) {
      closeBookmarkNav();
    }
  }
);

let progressBeforeReset = 0;

const { showUndoToast: showUndoResetToast } = useUndoToast({
  text: "Чтение начнется сначала",
  onUndo: () => {
    if (saveProgressTimer) {
      clearTimeout(saveProgressTimer);
      saveProgressTimer = null;
    }
    textPaginator.value?.setProgress(progressBeforeReset);
    if (!props.history) return;
    void historyStore.updateProgress(
      props.itemId,
      progressBeforeReset,
      totalPages.value,
      props.history.type,
      buildHistoryMeta()
    );
  },
});

const resetProgress = () => {
  if (!props.itemId || !props.history) {
    return;
  }

  progressBeforeReset = progress.value;
  textPaginator.value?.goToPage(1, false);
  showUndoResetToast();
};

const onStartTutorial = () => {
  closeActiveHint();
  resetAllTutorialFlags();
  readingBarsAnimate.value = false;
  isNavbarHidden.value = true;
  isPageNavHidden.value = true;
  nextTick(() => {
    readingBarsAnimate.value = true;
    startBasicsTutorial();
  });
};

// Управление яркостью
const isBrightnessTouching = computed(() => navbarRef.value?.isBrightnessTouching || false);
</script>

<style scoped lang="less">
.page-content[class*="theme-"] {
  background-color: var(--reading-text-background-color);
}

.dark .page {
  --f7-bars-bg-color: var(--content-color-baige-5-no-opacity);
}

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
  padding: 4px 12px 4px;
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

.bookmark-corner-indicator {
  position: absolute;
  top: calc(var(--f7-safe-area-top) + 4px);
  right: 0px;
  pointer-events: none;
  z-index: 6;
}
</style>
