<template>
  <f7-page
    class="reading-page"
    :page-content="false"
    @page:beforein="enterReadingDevice"
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
      @open-search="openSearch"
      @start-tutorial="onStartTutorial"
    />
    <f7-page-content :class="`theme-${settingsStore.textTheme}`">
      <TextPaginator
        ref="textPaginator"
        :is-loading="isLoading"
        :text="text"
        :initial-progress="initialProgress"
        :lang="currentLanguage"
        :item-id="props.itemId"
        :modified-ts="data?.modified_ts ?? 0"
        :highlight-transform="isSearchModeActive ? getHighlightedPageHtml : undefined"
        :bookmarked-pages="bookmarkedPages"
        :show-bookmark-tabs="isNavbarHidden"
        @tap="onTextPaginatorTap"
        @action="onTextAction"
        @touchstart="onTextTouchStart($event.event)"
      />
      <ReadingScrubOverlay
        :is-page-scrubbing="isPageScrubbing"
        :is-slider-scrubbing="isSliderScrubbing"
        :subtitle="subtitle"
        :text-theme="textTheme"
        :current-language="currentLanguage"
      />
      <div v-if="showBookmarkCorner" class="bookmark-corner-indicator">
        <SvgIcon icon="bookmark-filled" color="primary-accent-50" :size="24" />
      </div>
    </f7-page-content>
    <TextSettingsSelector
      v-model:isOpened="isTextSettingsSheetOpened"
      :disabled="isTextCalculating"
      :language="currentLanguage"
    />

    <!-- Всплывающие тулбары навигации -->
    <SearchNavigationToolbar
      v-if="isSearchModeActive"
      v-show="!isBrightnessTouching"
      :current-index="activeMatchIndex"
      :total="searchMatches.length"
      :is-hidden="false"
      @next="goToNextMatch"
      @prev="goToPrevMatch"
      @open-list="openSearch"
      @close-search="closeSearch"
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
      @scrub-settle="onPageScrubSettle"
      @scrub-end="onPageScrubEnd"
    />
    <PrayersTextContentPopup
      v-model:isOpened="isContentPopupOpened"
      :item-id="props.itemId"
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
      @deleteBookmark="deleteBookmarkWithUndo"
    />
    <PrayersTextSearchPage
      v-model:isOpened="isSearchPageOpened"
      v-model:query="searchQuery"
      :matches="searchMatches"
      :active-match-id="isSearchModeActive ? activeMatchId : null"
      @selectMatch="selectMatch"
      @closeSearch="closeSearch"
    />

    <FootnoteSheet
      v-model:opened="isFootnoteSheetOpened"
      :html="footnoteHtml"
      @anchor="onFootnoteAnchor"
    />
    <ReadingBasicsTutorial
      v-if="tutorial.isBasicsTutorialActive.value"
      :page-mode="settingsStore.pageMode"
      :step="tutorial.basicsStep.value"
      :steps-count="tutorial.basicsStepsCount"
      @next="tutorial.nextBasicsStep"
      @prev="tutorial.prevBasicsStep"
      @close="tutorial.skipBasicsTutorial"
    />
    <SpotlightHint
      v-if="activeHintTargets"
      :targets="activeHintTargets"
      @close="closeActiveHint"
    />
  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed, useTemplateRef, watch, nextTick } from "vue";
import type { Router } from "framework7/types";

import { useSettingsStore } from "@/stores/settings";
import { useBookmarks, progressToPage } from "@/composables/useBookmarks";
import { useReadingTutorial } from "@/composables/useReadingTutorial";
import { useReadingHints } from "@/composables/useReadingHints";
import { useChapterNavigation } from "@/composables/useChapterNavigation";
import { useReadingProgress } from "@/composables/useReadingProgress";
import { useReadingChrome } from "@/composables/useReadingChrome";
import { useReadingDevice } from "@/composables/useReadingDevice";
import { useReaderText } from "@/composables/useReaderText";
import { useReaderSearch } from "@/composables/useReaderSearch";

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
import ReadingScrubOverlay from "@/components/ReadingScrubOverlay.vue";
import ReadingBasicsTutorial from "@/components/reading-tutorial/ReadingBasicsTutorial.vue";
import SpotlightHint from "@/components/reading-tutorial/SpotlightHint.vue";
import SvgIcon from "@/components/SvgIcon.vue";
import type { TextTapPayload } from "@/components/text-paginator/tapZone";
import type { TextAction } from "@/text-processing-v3/readingAnnotations";
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

const navbarRef = useTemplateRef<InstanceType<typeof PrayersTextNavbar>>("navbar");
const pageNavToolbarRef = useTemplateRef<InstanceType<typeof PageNavigationToolbar>>("pageNavToolbar");
const chapterNavToolbarRef = useTemplateRef<InstanceType<typeof ChapterNavigationToolbar>>("chapterNavToolbar");
const bookmarkNavToolbarRef = useTemplateRef<InstanceType<typeof BookmarkNavigationToolbar>>("bookmarkNavToolbar");
const textPaginator = useTemplateRef<InstanceType<typeof TextPaginator>>("textPaginator");

const settingsStore = useSettingsStore();

// Панели читалки, скраббинг и нативное окружение устройства
const {
  isNavbarHidden,
  isPageNavHidden,
  readingBarsAnimate,
  isSliderScrubbing,
  isPageScrubbing,
  scrubPreviewPage,
  hideBarsInstant,
  hideBars,
  hideNavbar,
  showReadingBars,
  onPageScrubMove,
  onPageScrubSettle,
  onPageScrubEnd,
  onTextTouchStart,
  consumeMenusClosedByTouch,
} = useReadingChrome();

const { enter: enterReadingDevice, leave: leaveReadingDevice } = useReadingDevice({
  isNavbarHidden,
  isPageNavHidden,
  isSliderScrubbing,
  onVolumePrev: () => textPaginator.value?.slidePrev(),
  onVolumeNext: () => textPaginator.value?.slideNext(),
});

// Модальные окна и сноски
const isContentPopupOpened = ref(false);
const contentPopupInitialTab = ref<"content" | "bookmarks">("content");
const isTextSettingsSheetOpened = ref(false);
const footnoteHtml = ref("");
const isFootnoteSheetOpened = ref(false);

const openContentPopup = () => {
  contentPopupInitialTab.value = "content";
  isContentPopupOpened.value = true;
};

const openBookmarksList = () => {
  contentPopupInitialTab.value = "bookmarks";
  isContentPopupOpened.value = true;
};

const toggleTextSettingsSheet = () => {
  isTextSettingsSheetOpened.value = !isTextSettingsSheetOpened.value;
};

watch(isTextSettingsSheetOpened, (isOpen) => {
  if (isOpen) hideBars();
});

// Документ, язык и сноски
const {
  title,
  favoriteTitle,
  text,
  footnotes,
  currentLanguage,
  availableLanguages,
  isLoading,
  data,
} = useReaderText({
  initialTitle: props.initialTitle,
  load: props.load,
});

const navbarFavorite = computed<NavbarFavoriteConfig | null>(() => {
  if (!props.favorite) return null;
  return {
    type: props.favorite.type,
    meta: props.favorite.withMeta
      ? { title: favoriteTitle.value || title.value, url: props.itemUrl }
      : undefined,
  };
});

// Состояние пагинатора
const isTextCalculating = computed(() => textPaginator.value?.isCalculating || false);
const textTheme = computed(() => textPaginator.value?.theme || "light");
const headers = computed(() => textPaginator.value?.headers || []);
const totalPages = computed(() => textPaginator.value?.pagesCount || 0);
const progress = computed(() => textPaginator.value?.progress || 0);
const currentPage = computed(() => {
  const page = textPaginator.value?.currentPage;
  if (page) return page;
  return progressToPage(progress.value, totalPages.value);
});

// Прогресс чтения
const { initialProgress, flushProgress, resetProgress } = useReadingProgress({
  itemId: () => props.itemId,
  itemUrl: () => props.itemUrl,
  title,
  history: () => props.history,
  progress,
  totalPages,
  onResetToStart: () => {
    textPaginator.value?.goToPage(1, false);
  },
  onRestoreProgress: (restoredProgress) => {
    textPaginator.value?.setProgress(restoredProgress);
  },
});

// Главы и подзаголовок
const subtitlePage = computed(() => scrubPreviewPage.value ?? currentPage.value);
const {
  subtitle,
  isChapterNavActive,
  activeHeaderIndex,
  chapterPageIndices,
  activeChapterPageIndex,
  goToHeader,
  goToNextHeader,
  goToPrevHeader,
  closeChapterNav,
} = useChapterNavigation({
  headers,
  subtitlePage,
  onScrollToHeader: (index) => {
    textPaginator.value?.scrollToHeader(index);
  },
});

// Закладки
const {
  bookmarksForItem,
  currentPageBookmark,
  isBookmarkNavActive,
  activeBookmarkId,
  activeBookmarkIndex,
  goToBookmark,
  goToNextBookmark,
  goToPrevBookmark,
  closeBookmarkNav,
  closeToasts: closeBookmarkToasts,
  closeEditDialog: closeBookmarkEditDialog,
  onCornerTap,
  openEditDialog: openBookmarkEditDialog,
  deleteBookmarkWithUndo,
} = useBookmarks(props.itemId, currentPage, totalPages, {
  onGoToPage: (page) => {
    textPaginator.value?.goToPage(page, false);
  },
});

const bookmarkedPages = computed(() =>
  [...new Set(bookmarksForItem.value.map((bookmark) => bookmark.page))]
);

const showBookmarkCorner = computed(
  () =>
    Boolean(currentPageBookmark.value) &&
    isNavbarHidden.value &&
    settingsStore.pageMode !== "vertical" &&
    !isTextCalculating.value &&
    totalPages.value > 0
);

watch(isContentPopupOpened, (opened) => {
  if (opened) closeBookmarkToasts();
});

// Поиск по тексту
const {
  searchQuery,
  searchMatches,
  activeMatchId,
  activeMatchIndex,
  isSearchPageOpened,
  isSearchModeActive,
  getHighlightedPageHtml,
  openSearch,
  selectMatch,
  goToNextMatch,
  goToPrevMatch,
  closeSearch,
} = useReaderSearch({
  paginator: textPaginator,
  onBeforeSelectMatch: () => {
    closeBookmarkNav();
    closeChapterNav();
    hideBarsInstant();
  },
});

watch(currentLanguage, () => {
  isFootnoteSheetOpened.value = false;
  closeSearch();
  closeBookmarkNav();
  closeChapterNav();
  closeBookmarkToasts();
});

// Обучение и контекстные подсказки
const tutorial = useReadingTutorial();

const { activeHintTargets, closeActiveHint } = useReadingHints({
  tutorial,
  isNavbarHidden,
  isPageNavHidden,
  isChapterNavActive,
  isBookmarkNavActive,
  toolbars: {
    navbar: navbarRef,
    pageNav: pageNavToolbarRef,
    chapterNav: chapterNavToolbarRef,
    bookmarkNav: bookmarkNavToolbarRef,
  },
  onOpenSettings: () => {
    props.f7router.navigate("/settings/");
  },
});

// Жизненный цикл страницы Framework7
const onPageBeforeOut = () => {
  navbarRef.value?.closeMorePopup();
  // Sheet живёт с внешним backdrop вне страницы. destroy() его не закрывает,
  // и прозрачный backdrop остаётся поверх главной и съедает тапы.
  isTextSettingsSheetOpened.value = false;
  isFootnoteSheetOpened.value = false;
  closeBookmarkToasts();
  closeBookmarkEditDialog();
};

const onPageAfterOut = () => {
  flushProgress();
  leaveReadingDevice();
};

// Действия на странице чтения
const onFootnoteAnchor = (id: string) => {
  if (textPaginator.value?.scrollToAnchor(id)) {
    hideBarsInstant();
  }
};

const onTextAction = (action: TextAction) => {
  if (action.type === "footnote") {
    const html = footnotes.value[action.id];
    if (!html) return;
    footnoteHtml.value = html;
    isFootnoteSheetOpened.value = true;
    return;
  }
  onFootnoteAnchor(action.id);
};

const onTextPaginatorTap = (payload: TextTapPayload) => {
  // Касание, которое закрыло меню, только закрывает их: ни открыть снова,
  // ни пролистать страницу. click приходит уже после touchend.
  if (consumeMenusClosedByTouch()) {
    return;
  }

  if (!isNavbarHidden.value || !isPageNavHidden.value) {
    return;
  }

  if (
    tutorial.shouldShowBasicsTutorial.value &&
    !isLoading.value &&
    !isTextCalculating.value &&
    !isSearchModeActive.value &&
    !isBookmarkNavActive.value &&
    !isChapterNavActive.value
  ) {
    tutorial.startBasicsTutorial();
    return;
  }

  if (payload.type === "center") {
    showReadingBars();
  } else if (payload.type === "bookmark") {
    onCornerTap(payload.page);
  } else if (payload.type === "left" || payload.type === "top") {
    textPaginator.value?.slidePrev();
  } else if (payload.type === "right" || payload.type === "bottom") {
    textPaginator.value?.slideNext();
  }
};

const onPageSliderChange = (value: number) => {
  hideNavbar();
  textPaginator.value?.goToPage(value, false);
};

const navigateFromPopup = (closeSiblingNav: () => void, navigate: () => void) => {
  if (isSearchModeActive.value) {
    closeSearch();
  }
  closeSiblingNav();
  navigate();
  hideBarsInstant();
};

const onGoToBookmarkFromPopup = (id: string) => {
  navigateFromPopup(closeChapterNav, () => {
    if (settingsStore.isBookmarkNavToolbarEnabled) {
      goToBookmark(id);
    } else {
      closeBookmarkNav();
      const bookmark = bookmarksForItem.value.find((b) => b.id === id);
      if (bookmark) {
        textPaginator.value?.goToPage(bookmark.page, false);
      }
    }
  });
};

const onEditBookmarkFromPopup = (id: string) => {
  const bookmark = bookmarksForItem.value.find((b) => b.id === id);
  if (bookmark) {
    openBookmarkEditDialog(bookmark);
  }
};

const onGoToHeaderFromPopup = (index: number) => {
  navigateFromPopup(closeBookmarkNav, () => {
    if (settingsStore.isChapterNavToolbarEnabled) {
      goToHeader(index);
    } else {
      closeChapterNav();
      textPaginator.value?.scrollToHeader(index);
    }
  });
};

const onStartTutorial = () => {
  closeActiveHint();
  tutorial.resetAllTutorialFlags();
  hideBarsInstant();
  nextTick(() => {
    tutorial.startBasicsTutorial();
  });
};

const isBrightnessTouching = computed(() => navbarRef.value?.isBrightnessTouching || false);
</script>

<style scoped lang="less">
.page-content[class*="theme-"] {
  background-color: var(--reading-text-background-color);
}

.dark .page {
  --f7-bars-bg-color: var(--content-color-baige-5-no-opacity);
}

.bookmark-corner-indicator {
  position: absolute;
  top: calc(var(--f7-safe-area-top) + 4px);
  right: 0px;
  pointer-events: none;
  z-index: 6;
}
</style>
