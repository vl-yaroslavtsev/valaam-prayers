import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { bookmarksStorage } from "@/services/storage";
import { useBookmarksStore } from "@/stores/bookmarks";
import { bookmarkProgressToPage, pageToProgress, progressToPage, useBookmarks } from "@/composables/useBookmarks";

vi.mock("@/services/storage", () => ({
  bookmarksStorage: {
    getAll: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("bookmark page mapping", () => {
  it("возвращает страницу, с которой сохранили закладку", () => {
    for (const total of [2, 5, 12, 27, 40]) {
      for (let page = 1; page <= total; page += 1) {
        expect(bookmarkProgressToPage(pageToProgress(page, total), total)).toBe(page);
      }
    }
  });

  it("прогресс 16-й страницы из 27 через floor попадает на 15-ю", () => {
    const atPage16 = pageToProgress(16, 27);
    expect(atPage16 * 26).toBeLessThan(15);
    expect(progressToPage(atPage16, 27)).toBe(15);
    expect(bookmarkProgressToPage(pageToProgress(15, 27), 27)).toBe(15);
    expect(bookmarkProgressToPage(atPage16, 27)).toBe(16);
  });

  it("не относит границу страницы на предыдущую, в отличие от floor", () => {
    const progress = pageToProgress(32, 40);
    expect(progressToPage(progress, 40)).toBe(31);
    expect(bookmarkProgressToPage(progress, 40)).toBe(32);
  });

  it("не сдвигает закладку на предыдущую страницу из-за погрешности float", () => {
    const total = 12;
    const progress = pageToProgress(5, total);
    const justBelow = progress * (total - 1) - 1e-10;
    const nudged = justBelow / (total - 1);
    expect(bookmarkProgressToPage(nudged, total)).toBe(5);
  });
});

describe("useBookmarks current page", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(bookmarksStorage!.getAll).mockResolvedValue([]);
    vi.mocked(bookmarksStorage!.put).mockResolvedValue("id");
    vi.mocked(bookmarksStorage!.delete).mockResolvedValue(undefined);
  });

  it("не показывает закладку 15-й страницы из 27 на 16-й", async () => {
    const store = useBookmarksStore();
    const currentPage = ref(15);
    const totalPages = ref(27);
    const { currentPageBookmark } = useBookmarks("prayer:1", currentPage, totalPages);

    await store.addBookmark("prayer:1", pageToProgress(15, 27));

    expect(currentPageBookmark.value?.page).toBe(15);
    currentPage.value = 16;
    expect(currentPageBookmark.value).toBeNull();
  });
});
