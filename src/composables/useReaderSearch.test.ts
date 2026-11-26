import { nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSettingsStore } from "@/stores/settings";
import { useReaderSearch, type ReaderSearchPaginator } from "@/composables/useReaderSearch";

const createMockPaginator = (pages: string[]) => {
  const paginator: ReaderSearchPaginator = {
    pages,
    goToPage: vi.fn(),
    refreshDisplay: vi.fn(),
    focusSearchMatch: vi.fn(),
  };
  return paginator;
};

describe("useReaderSearch", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("в горизонтальном режиме переходит на страницу совпадения и обновляет отображение", async () => {
    const settingsStore = useSettingsStore();
    settingsStore.setPageMode("horizontal");

    const paginator = createMockPaginator([
      "<p>Господи помилуй.</p>",
      "<p>Господи спаси.</p>",
    ]);
    const onBeforeSelectMatch = vi.fn();

    const search = useReaderSearch({
      paginator: ref(paginator),
      onBeforeSelectMatch,
    });

    search.openSearch();
    expect(search.isSearchPageOpened.value).toBe(true);

    search.searchQuery.value = "Господи";
    await nextTick();
    expect(search.searchMatches.value.length).toBe(2);

    const secondMatch = search.searchMatches.value[1];
    search.selectMatch(secondMatch.id);
    await nextTick();

    expect(onBeforeSelectMatch).toHaveBeenCalledTimes(1);
    expect(search.isSearchPageOpened.value).toBe(false);
    expect(search.isSearchModeActive.value).toBe(true);
    expect(paginator.goToPage).toHaveBeenCalledWith(2, false);
    expect(paginator.refreshDisplay).toHaveBeenCalled();

    search.goToPrevMatch();
    await nextTick();
    expect(paginator.goToPage).toHaveBeenLastCalledWith(1, false);

    search.closeSearch();
    await nextTick();
    expect(search.isSearchModeActive.value).toBe(false);
    expect(search.searchQuery.value).toBe("");
  });

  it("в вертикальном режиме фокусирует совпадение после закрытия страницы поиска", async () => {
    const settingsStore = useSettingsStore();
    settingsStore.setPageMode("vertical");

    const paginator = createMockPaginator([
      "<p>Молитва утренняя.</p>",
      "<p>Молитва вечерняя.</p>",
    ]);

    const search = useReaderSearch({ paginator: ref(paginator) });

    search.openSearch();
    search.searchQuery.value = "Молитва";
    await nextTick();

    const firstId = search.searchMatches.value[0].id;
    search.selectMatch(firstId);
    await nextTick();

    expect(paginator.focusSearchMatch).toHaveBeenCalled();
    expect(paginator.goToPage).not.toHaveBeenCalled();
  });
});
