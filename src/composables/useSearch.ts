import { computed, ref, shallowRef } from "vue";
import { searchApi, SearchServerError } from "@/services/api/SearchApi";
import type { SearchData, SearchItem } from "@/services/api/SearchApi";
import { isOnline } from "@/services/download/network";
import { searchLocal } from "@/services/search/localSearch";
import type { LocalSearchEntry } from "@/services/search/localSearch";

/** Макс. размер ответа сервера в канале ограничен, начинаем с 10. */
export const SEARCH_PAGE_SIZE = 10;

export type SearchState = "idle" | "loading" | "done" | "error";

/**
 * Состояние экрана поиска.
 *
 * Источник выбирается сам, без переключателя: онлайн — сервер (названия и тексты),
 * нет сети (или сервер недоступен) — локальный поиск по названиям из индекса.
 * Ответ сервера с `status: 'error'` в локальный поиск не уходит — это ошибка с повтором.
 */
export function useSearch(getLocalIndex: () => readonly LocalSearchEntry[]) {
  const query = ref("");
  const state = ref<SearchState>("idle");
  const items = shallowRef<SearchItem[]>([]);
  const total = ref(0);
  /** Откуда взяты текущие результаты. */
  const source = ref<"server" | "local">("server");
  const isLoadingMore = ref(false);
  const loadMoreFailed = ref(false);

  const submittedQuery = ref("");
  const page = ref(1);
  // Токен запроса: устаревшие ответы (пользователь успел отправить другой запрос) отбрасываются.
  let requestId = 0;

  /** Текст в поле отличается от того, по которому показаны результаты. */
  const isDirty = computed(() => query.value.trim() !== submittedQuery.value);
  const hasMore = computed(() => state.value === "done" && page.value * SEARCH_PAGE_SIZE < total.value);

  const reset = () => {
    state.value = "idle";
    items.value = [];
    total.value = 0;
    isLoadingMore.value = false;
    loadMoreFailed.value = false;
    page.value = 1;
  };

  const loadFirstPage = async (q: string): Promise<{ data: SearchData; from: "server" | "local" }> => {
    if (isOnline()) {
      try {
        return { data: await searchApi.search(q, 1, SEARCH_PAGE_SIZE), from: "server" };
      } catch (err) {
        if (err instanceof SearchServerError) throw err;
        // Сеть недоступна (таймаут, обрыв, HTTP-ошибка) — ищем локально.
      }
    }
    return { data: searchLocal(getLocalIndex(), q, 1, SEARCH_PAGE_SIZE), from: "local" };
  };

  const run = async (q: string) => {
    const id = ++requestId;
    submittedQuery.value = q;
    reset();

    if (!q) return;

    state.value = "loading";
    try {
      const { data, from } = await loadFirstPage(q);
      if (id !== requestId) return;
      source.value = from;
      items.value = data.items;
      total.value = data.total;
      state.value = "done";
    } catch (err) {
      if (id !== requestId) return;
      console.warn("Search failed:", err);
      state.value = "error";
    }
  };

  /** Отправить текущий запрос (лупа или Enter). */
  const submit = () => run(query.value.trim());

  /** Повторить последний запрос (после ошибки или чтобы снова попробовать сервер). */
  const retry = () => run(submittedQuery.value);

  const clear = () => {
    requestId++;
    query.value = "";
    submittedQuery.value = "";
    reset();
  };

  /** Подгрузка следующей страницы. После ошибки — только по явному `force`, чтобы не спамить запросами. */
  const loadMore = async (force = false) => {
    if (!hasMore.value || isLoadingMore.value || (loadMoreFailed.value && !force)) return;

    const id = requestId;
    const nextPage = page.value + 1;
    isLoadingMore.value = true;
    loadMoreFailed.value = false;
    try {
      const data =
        source.value === "local"
          ? searchLocal(getLocalIndex(), submittedQuery.value, nextPage, SEARCH_PAGE_SIZE)
          : await searchApi.search(submittedQuery.value, nextPage, SEARCH_PAGE_SIZE);
      if (id !== requestId) return;
      items.value = [...items.value, ...data.items];
      total.value = data.total;
      page.value = nextPage;
    } catch (err) {
      if (id !== requestId) return;
      console.warn("Search load more failed:", err);
      loadMoreFailed.value = true;
    } finally {
      if (id === requestId) isLoadingMore.value = false;
    }
  };

  return {
    query,
    state,
    items,
    total,
    source,
    isDirty,
    hasMore,
    isLoadingMore,
    loadMoreFailed,
    submit,
    retry,
    clear,
    loadMore,
  };
}
