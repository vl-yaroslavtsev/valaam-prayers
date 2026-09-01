import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { readingHistoryStorage } from "@/services/storage";
import { useReadingHistoryStore } from "@/stores/readingHistory";

vi.mock("@/services/storage", () => ({
  readingHistoryStorage: {
    getAll: vi.fn(),
    put: vi.fn(),
  },
}));

describe("useReadingHistoryStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(readingHistoryStorage!.getAll).mockResolvedValue([]);
    vi.mocked(readingHistoryStorage!.put).mockResolvedValue(0);
  });

  it("initStore подхватывает кэш", async () => {
    const cached = {
      id: 1,
      progress: 3,
      pages: 10,
      type: "prayers" as const,
      lastReadAt: new Date("2026-01-01"),
    };
    vi.mocked(readingHistoryStorage!.getAll).mockResolvedValue([cached]);

    const store = useReadingHistoryStore();
    await store.initStore();

    expect(store.getItem(1)?.progress).toBe(3);
  });

  it("updateProgress обновляет state и storage", async () => {
    const store = useReadingHistoryStore();
    await store.updateProgress(7, 2, 5, "books");

    expect(store.getItem(7)).toMatchObject({ id: 7, progress: 2, pages: 5, type: "books" });
    expect(readingHistoryStorage!.put).toHaveBeenCalled();
  });

  it("undoResetProgress восстанавливает прогресс после resetProgress", async () => {
    const store = useReadingHistoryStore();
    await store.updateProgress(7, 4, 10);
    store.resetProgress(7);
    await vi.waitFor(() => expect(store.getItem(7)?.progress).toBe(0));

    store.undoResetProgress();
    expect(store.getItem(7)?.progress).toBe(4);
  });
});
