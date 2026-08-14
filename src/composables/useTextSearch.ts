import { ref, shallowRef, computed, watch, type Ref } from 'vue';
import {
  buildPageSentenceIndex,
  searchInSentenceIndex,
  highlightPageHtml,
  type PageSentenceIndex,
  type SearchMatch,
} from '@/text-processing';

/**
 * Композабл поиска по тексту текущей молитвы/раздела.
 *
 * pages — HTML-страницы из TextPaginator (после пагинации). Индекс предложений
 * (дорогая DOM-операция) пересчитывается только при изменении pages, сам поиск
 * по запросу — дёшево (строковые операции), можно вызывать на каждое нажатие клавиши.
 */
export function useTextSearch(pages: Ref<readonly string[]>) {
  const query = ref('');
  const activeMatchId = ref<number | null>(null);

  const sentenceIndex = shallowRef<PageSentenceIndex[]>([]);
  watch(pages, (newPages) => {
    sentenceIndex.value = buildPageSentenceIndex(newPages);
  }, { immediate: true });

  const matches = computed<SearchMatch[]>(() => searchInSentenceIndex(sentenceIndex.value, query.value));

  // Кэш подсветки "все совпадения без активного" по странице — пересчитывается
  // при смене query/pages, что позволяет не парсить HTML заново на каждый next/prev
  let highlightCache = new Map<number, string>();
  let highlightCacheQuery = '';

  const invalidateHighlightCache = () => {
    highlightCache = new Map<number, string>();
    highlightCacheQuery = query.value;
  };

  watch([query, pages], invalidateHighlightCache);

  watch(matches, (newMatches) => {
    if (newMatches.length === 0) {
      activeMatchId.value = null;
      return;
    }
    if (activeMatchId.value === null || !newMatches.some((m) => m.id === activeMatchId.value)) {
      activeMatchId.value = newMatches[0].id;
    }
  });

  const activeMatchIndex = computed(() => matches.value.findIndex((m) => m.id === activeMatchId.value));
  const activeMatch = computed<SearchMatch | null>(() => {
    const idx = activeMatchIndex.value;
    return idx >= 0 ? matches.value[idx] : null;
  });

  const goToMatch = (id: number) => {
    activeMatchId.value = id;
  };

  const goToNextMatch = () => {
    if (matches.value.length === 0) return;
    const idx = (activeMatchIndex.value + 1 + matches.value.length) % matches.value.length;
    activeMatchId.value = matches.value[idx].id;
  };

  const goToPrevMatch = () => {
    if (matches.value.length === 0) return;
    const idx = (activeMatchIndex.value - 1 + matches.value.length) % matches.value.length;
    activeMatchId.value = matches.value[idx].id;
  };

  /**
   * Трансформация HTML страницы с подсветкой всех совпадений query, для передачи
   * в TextPaginator как highlightTransform.
   */
  const getHighlightedPageHtml = (html: string, pageIndex: number): string => {
    if (!query.value.trim()) return html;

    if (highlightCacheQuery !== query.value) {
      invalidateHighlightCache();
    }

    const pageNumber = pageIndex + 1;
    const isActivePage = activeMatch.value?.page === pageNumber;

    if (isActivePage) {
      // Активная страница пересчитывается каждый раз без кэша — чтобы класс -active
      // оказался на нужном совпадении; остальные страницы кэшируются
      return highlightPageHtml(html, query.value, activeMatch.value!.ordinalOnPage);
    }

    const cached = highlightCache.get(pageIndex);
    if (cached !== undefined) return cached;

    const highlighted = highlightPageHtml(html, query.value);
    highlightCache.set(pageIndex, highlighted);
    return highlighted;
  };

  const resetSearch = () => {
    query.value = '';
    activeMatchId.value = null;
  };

  return {
    query,
    matches,
    activeMatchId,
    activeMatchIndex,
    activeMatch,
    goToMatch,
    goToNextMatch,
    goToPrevMatch,
    getHighlightedPageHtml,
    resetSearch,
  };
}
