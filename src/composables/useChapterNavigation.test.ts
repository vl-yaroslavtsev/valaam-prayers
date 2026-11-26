import { nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSettingsStore } from "@/stores/settings";
import type { PaginationCacheItemHeader } from "@/services/storage/PaginationCacheStorage";
import { getSubtitleForPage, useChapterNavigation } from "@/composables/useChapterNavigation";

const sampleHeaders: PaginationCacheItemHeader[] = [
  { level: 2, text: "Глава 1", page: 2 },
  { level: 3, text: "Раздел 1.1", page: 2 },
  { level: 3, text: "Раздел 1.2", page: 5 },
  { level: 2, text: "Глава 2", page: 8 },
];

describe("getSubtitleForPage", () => {
  it("возвращает пустой список до первого заголовка и при пустом списке", () => {
    expect(getSubtitleForPage([], 1)).toEqual([]);
    expect(getSubtitleForPage(sampleHeaders, 1)).toEqual([]);
  });

  it("возвращает родительский h2 вместе с текущим h3", () => {
    expect(getSubtitleForPage(sampleHeaders, 2)).toEqual(["Глава 1", "Раздел 1.1"]);
    expect(getSubtitleForPage(sampleHeaders, 6)).toEqual(["Глава 1", "Раздел 1.2"]);
  });

  it("возвращает только h2, если последний заголовок уровня 2", () => {
    expect(getSubtitleForPage(sampleHeaders, 8)).toEqual(["Глава 2"]);
  });

  it("возвращает только h3, если перед ним нет h2", () => {
    const onlyH3: PaginationCacheItemHeader[] = [{ level: 3, text: "Подраздел", page: 1 }];
    expect(getSubtitleForPage(onlyH3, 1)).toEqual(["Подраздел"]);
  });
});

describe("useChapterNavigation", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("в горизонтальном режиме объединяет заголовки на одной странице и циклично листает", async () => {
    const settingsStore = useSettingsStore();
    settingsStore.setPageMode("horizontal");

    const headers = ref<PaginationCacheItemHeader[]>(sampleHeaders);
    const subtitlePage = ref(1);
    const onScrollToHeader = vi.fn();

    const nav = useChapterNavigation({ headers, subtitlePage, onScrollToHeader });

    expect(nav.chapterPageIndices.value).toEqual([0, 2, 3]);

    nav.goToHeader(1);
    await nextTick();
    expect(nav.isChapterNavActive.value).toBe(true);
    expect(nav.activeChapterPageIndex.value).toBe(0);
    expect(onScrollToHeader).toHaveBeenLastCalledWith(1);

    nav.goToNextHeader();
    await nextTick();
    expect(nav.activeHeaderIndex.value).toBe(2);
    expect(nav.activeChapterPageIndex.value).toBe(1);
    expect(onScrollToHeader).toHaveBeenLastCalledWith(2);

    nav.goToPrevHeader();
    nav.goToPrevHeader();
    await nextTick();
    expect(nav.activeHeaderIndex.value).toBe(3);
    expect(nav.activeChapterPageIndex.value).toBe(2);
  });

  it("в вертикальном режиме учитывает каждый заголовок отдельно", () => {
    const settingsStore = useSettingsStore();
    settingsStore.setPageMode("vertical");

    const headers = ref<PaginationCacheItemHeader[]>(sampleHeaders);
    const subtitlePage = ref(5);
    const nav = useChapterNavigation({
      headers,
      subtitlePage,
      onScrollToHeader: vi.fn(),
    });

    expect(nav.chapterPageIndices.value).toEqual([0, 1, 2, 3]);
    expect(nav.subtitle.value).toEqual(["Глава 1", "Раздел 1.2"]);

    nav.goToHeader(0);
    nav.goToNextHeader();
    expect(nav.activeHeaderIndex.value).toBe(1);
    expect(nav.activeChapterPageIndex.value).toBe(1);
  });

  it("игнорирует выход за границы, поджимает индекс при сокращении заголовков и закрывается при пустом списке или отключении панели", async () => {
    const settingsStore = useSettingsStore();
    const headers = ref<PaginationCacheItemHeader[]>(sampleHeaders);
    const subtitlePage = ref(2);
    const nav = useChapterNavigation({
      headers,
      subtitlePage,
      onScrollToHeader: vi.fn(),
    });

    nav.goToHeader(-1);
    nav.goToHeader(99);
    expect(nav.isChapterNavActive.value).toBe(false);

    nav.goToHeader(3);
    headers.value = sampleHeaders.slice(0, 2);
    await nextTick();
    expect(nav.activeHeaderIndex.value).toBe(1);

    headers.value = [];
    await nextTick();
    expect(nav.isChapterNavActive.value).toBe(false);
    expect(nav.activeHeaderIndex.value).toBe(-1);

    headers.value = sampleHeaders;
    nav.goToHeader(2);
    settingsStore.setIsChapterNavToolbarEnabled(false);
    await nextTick();
    expect(nav.isChapterNavActive.value).toBe(false);
  });

  it("goToPrevHeader и goToNextHeader корректно работают при current = -1", () => {
    const settingsStore = useSettingsStore();
    settingsStore.setPageMode("horizontal");

    const nav = useChapterNavigation({
      headers: ref(sampleHeaders),
      subtitlePage: ref(1),
      onScrollToHeader: vi.fn(),
    });

    nav.goToPrevHeader();
    expect(nav.activeHeaderIndex.value).toBe(3);

    nav.closeChapterNav();
    nav.goToNextHeader();
    expect(nav.activeHeaderIndex.value).toBe(0);
  });
});
