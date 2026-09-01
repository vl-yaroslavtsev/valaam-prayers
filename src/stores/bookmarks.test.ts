import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { bookmarksStorage } from "@/services/storage";
import { useBookmarksStore } from "@/stores/bookmarks";

vi.mock("@/services/storage", () => ({
  bookmarksStorage: {
    getAll: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("useBookmarksStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(bookmarksStorage!.getAll).mockResolvedValue([]);
    vi.mocked(bookmarksStorage!.put).mockResolvedValue("id");
    vi.mocked(bookmarksStorage!.delete).mockResolvedValue(undefined);
  });

  it("initStore подхватывает кэш", async () => {
    const cached = {
      id: "bm-1",
      itemId: 10,
      progress: 2,
      name: "Закладка 1",
      createdAt: new Date(),
    };
    vi.mocked(bookmarksStorage!.getAll).mockResolvedValue([cached]);

    const store = useBookmarksStore();
    await store.initStore();

    expect(store.getBookmarksByItem(10)).toEqual([cached]);
  });

  it("addBookmark обновляет state и storage", async () => {
    const store = useBookmarksStore();
    const created = await store.addBookmark(10, 3);

    expect(store.bookmarks).toHaveLength(1);
    expect(created.itemId).toBe(10);
    expect(bookmarksStorage!.put).toHaveBeenCalledWith(created);
  });

  it("deleteBookmark обновляет state и storage, undo восстанавливает", async () => {
    const store = useBookmarksStore();
    const created = await store.addBookmark(10, 3);

    await store.deleteBookmark(created.id);
    expect(store.bookmarks).toHaveLength(0);
    expect(bookmarksStorage!.delete).toHaveBeenCalledWith(created.id);

    await store.undoDeleteBookmark();
    expect(store.bookmarks).toHaveLength(1);
    expect(bookmarksStorage!.put).toHaveBeenCalledWith(created);
  });
});
