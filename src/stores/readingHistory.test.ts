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
    vi.mocked(readingHistoryStorage!.put).mockResolvedValue("id");
  });

  it("initStore подхватывает кэш", async () => {
    const cached = {
      id: "prayer:1",
      progress: 3,
      pages: 10,
      type: "prayers" as const,
      lastReadAt: new Date("2026-01-01"),
    };
    vi.mocked(readingHistoryStorage!.getAll).mockResolvedValue([cached]);

    const store = useReadingHistoryStore();
    await store.initStore();

    expect(store.getItem("prayer:1")?.progress).toBe(3);
  });

  it("updateProgress обновляет state и storage", async () => {
    const store = useReadingHistoryStore();
    await store.updateProgress("prayer:7", 2, 5, "books");

    expect(store.getItem("prayer:7")).toMatchObject({
      id: "prayer:7",
      progress: 2,
      pages: 5,
      type: "books",
    });
    expect(readingHistoryStorage!.put).toHaveBeenCalled();
  });

  it("undoResetProgress восстанавливает прогресс после resetProgress", async () => {
    const store = useReadingHistoryStore();
    await store.updateProgress("prayer:7", 4, 10);
    store.resetProgress("prayer:7");
    await vi.waitFor(() => expect(store.getItem("prayer:7")?.progress).toBe(0));

    store.undoResetProgress();
    expect(store.getItem("prayer:7")?.progress).toBe(4);
  });

  it("resetProgress сохраняет тип и метаданные записи (житие, указания, чтения)", async () => {
    const store = useReadingHistoryStore();
    await store.updateProgress("saint-life:5", 0.6, 12, "saints", {
      title: "Свт. Николай",
      url: "/saints/5/life",
    });

    store.resetProgress("saint-life:5");
    await vi.waitFor(() => expect(store.getItem("saint-life:5")?.progress).toBe(0));

    expect(store.getItem("saint-life:5")).toMatchObject({
      id: "saint-life:5",
      progress: 0,
      pages: 12,
      type: "saints",
      title: "Свт. Николай",
      url: "/saints/5/life",
    });
  });

  it("getRecentItems показывает жития и указания, но исключает чтения Писания", async () => {
    vi.mocked(readingHistoryStorage!.getAll).mockResolvedValue([
      {
        id: "prayer:1",
        progress: 0.5,
        pages: 10,
        type: "prayers",
        lastReadAt: new Date("2026-10-10T10:00:00Z"),
      },
      {
        id: "saint-life:5",
        progress: 0.3,
        pages: 20,
        type: "saints",
        title: "Свт. Николай",
        url: "/saints/5/life",
        lastReadAt: new Date("2026-10-12T10:00:00Z"),
      },
      {
        id: "reading:20261013:104555",
        progress: 0.7,
        pages: 4,
        type: "readings",
        title: "От Иоанна, 10:9–16",
        url: "/days/20261013/readings/104555",
        lastReadAt: new Date("2026-10-14T10:00:00Z"),
      },
      {
        id: "day:20261013:instructions",
        progress: 0.2,
        pages: 8,
        type: "instructions",
        title: "Богослужебные указания, 13 октября 2026",
        url: "/days/20261013/text/instructions",
        lastReadAt: new Date("2026-10-13T10:00:00Z"),
      },
    ]);

    const store = useReadingHistoryStore();
    await store.initStore();

    // Прогресс чтения Писания сохранён и доступен по id
    expect(store.getItem("reading:20261013:104555")?.progress).toBe(0.7);

    // Но в «Сейчас читаю» попадают только молитвы, книги, жития и указания
    expect(store.getRecentItems(10).map((item) => item.id)).toEqual([
      "day:20261013:instructions",
      "saint-life:5",
      "prayer:1",
    ]);
  });
});
