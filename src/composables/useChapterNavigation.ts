import { ref, computed, watch, type Ref } from "vue";
import { useSettingsStore } from "@/stores/settings";
import type { PaginationCacheItemHeader } from "@/services/storage/PaginationCacheStorage";

export interface UseChapterNavigationOptions {
  headers: Readonly<Ref<readonly PaginationCacheItemHeader[]>>;
  /** Страница, для которой вычисляется подзаголовок (текущая или превью ползунка) */
  subtitlePage: Readonly<Ref<number>>;
  onScrollToHeader: (index: number) => void;
}

/**
 * Вычисляет цепочку заголовков для указанной страницы (последний заголовок <= page
 * и его родительский заголовок уровня 2, если текущий глубже).
 */
export function getSubtitleForPage(
  headers: readonly PaginationCacheItemHeader[],
  page: number
): string[] {
  let currentIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].page <= page) {
      currentIndex = i;
    } else {
      break;
    }
  }
  if (currentIndex < 0) return [];

  const current = headers[currentIndex];
  if (current.level === 2) return [current.text];

  for (let i = currentIndex - 1; i >= 0; i--) {
    if (headers[i].level === 2) {
      return [headers[i].text, current.text];
    }
  }
  return [current.text];
}

/**
 * Композабл навигации по главам (заголовкам) и подзаголовка текущей страницы читалки.
 */
export function useChapterNavigation({
  headers,
  subtitlePage,
  onScrollToHeader,
}: UseChapterNavigationOptions) {
  const settingsStore = useSettingsStore();

  const subtitle = computed<string[]>(() =>
    getSubtitleForPage(headers.value, subtitlePage.value)
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

  const stepHeader = (delta: 1 | -1) => {
    const steps = chapterPageIndices.value;
    if (steps.length <= 1) return;
    const current = activeChapterPageIndex.value;
    const next =
      current < 0
        ? delta > 0
          ? 0
          : steps.length - 1
        : (current + delta + steps.length) % steps.length;
    activeHeaderIndex.value = steps[next];
  };

  const goToNextHeader = () => stepHeader(1);
  const goToPrevHeader = () => stepHeader(-1);

  const closeChapterNav = () => {
    isChapterNavActive.value = false;
    activeHeaderIndex.value = -1;
  };

  watch(
    [activeHeaderIndex, isChapterNavActive],
    () => {
      if (!isChapterNavActive.value) return;
      onScrollToHeader(activeHeaderIndex.value);
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

  watch(
    () => settingsStore.isChapterNavToolbarEnabled,
    (enabled) => {
      if (!enabled) {
        closeChapterNav();
      }
    }
  );

  return {
    subtitle,
    isChapterNavActive,
    activeHeaderIndex,
    chapterPageIndices,
    activeChapterPageIndex,
    goToHeader,
    goToNextHeader,
    goToPrevHeader,
    closeChapterNav,
  };
}
