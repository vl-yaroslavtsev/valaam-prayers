import { ref, computed, watch, type Ref } from "vue";
import { useSettingsStore } from "@/stores/settings";
import { useTextSearch } from "@/composables/useTextSearch";
import type TextPaginator from "@/components/TextPaginator.vue";

export type ReaderSearchPaginator = Pick<
  InstanceType<typeof TextPaginator>,
  "pages" | "goToPage" | "refreshDisplay" | "focusSearchMatch"
>;

export interface UseReaderSearchOptions {
  paginator: Readonly<Ref<ReaderSearchPaginator | null>>;
  onBeforeSelectMatch?: () => void;
}

/**
 * Композабл поиска по тексту читалки с синхронизацией пагинатора
 * (горизонтальный и вертикальный режимы).
 */
export function useReaderSearch({ paginator, onBeforeSelectMatch }: UseReaderSearchOptions) {
  const settingsStore = useSettingsStore();

  const pagesForSearch = computed<readonly string[]>(() => paginator.value?.pages || []);
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

  const isVerticalMode = () => settingsStore.pageMode === "vertical";

  const focusVerticalMatch = () => {
    paginator.value?.focusSearchMatch(
      activeMatch.value,
      searchMatches.value,
      searchQuery.value
    );
  };

  const openSearch = () => {
    isSearchPageOpened.value = true;
  };

  const selectMatch = (id: number) => {
    const wasSearchActive = isSearchModeActive.value;
    onBeforeSelectMatch?.();
    goToMatch(id);
    isSearchPageOpened.value = false;
    isSearchModeActive.value = true;

    if (isVerticalMode()) {
      if (wasSearchActive) {
        focusVerticalMatch();
      }
      return;
    }

    const match = searchMatches.value.find((m) => m.id === id);
    if (match) {
      paginator.value?.goToPage(match.page, false);
    }
  };

  const closeSearch = () => {
    isSearchModeActive.value = false;
    isSearchPageOpened.value = false;
    resetSearch();
  };

  watch(
    activeMatch,
    () => {
      if (!isSearchModeActive.value) return;
      if (isVerticalMode()) {
        if (isSearchPageOpened.value) return;
        focusVerticalMatch();
        return;
      }
      paginator.value?.refreshDisplay();
      if (activeMatch.value) {
        paginator.value?.goToPage(activeMatch.value.page, false);
      }
    },
    { flush: "post" }
  );

  watch(
    isSearchModeActive,
    (active) => {
      if (active && isVerticalMode()) return;
      paginator.value?.refreshDisplay();
    },
    { flush: "post" }
  );

  watch(
    isSearchPageOpened,
    (opened) => {
      if (opened || !isSearchModeActive.value || !isVerticalMode()) return;
      focusVerticalMatch();
    },
    { flush: "post" }
  );

  return {
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
  };
}
