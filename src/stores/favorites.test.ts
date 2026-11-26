import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { favoritesStorage } from "@/services/storage";
import { useFavoritesStore } from "@/stores/favorites";

vi.mock("@/services/storage", () => ({
  favoritesStorage: {
    getAll: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    putAll: vi.fn(),
  },
}));

describe("useFavoritesStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(favoritesStorage!.getAll).mockResolvedValue([]);
    vi.mocked(favoritesStorage!.delete).mockResolvedValue(undefined);
    vi.mocked(favoritesStorage!.put).mockResolvedValue("id");
    vi.mocked(favoritesStorage!.putAll).mockResolvedValue([]);
  });

  it("initStore подхватывает кэш", async () => {
    vi.mocked(favoritesStorage!.getAll).mockResolvedValue([
      { id: "prayer:1", type: "prayers", sort: 0 },
    ]);

    const store = useFavoritesStore();
    await store.initStore();

    expect(store.favorites).toEqual([{ id: "prayer:1", type: "prayers", sort: 0 }]);
  });

  it("addFavorite обновляет state и storage и не путает одинаковые числовые id разных сущностей", async () => {
    const store = useFavoritesStore();
    await store.addFavorite("saint:5", "saints");
    await store.addFavorite("prayer:5", "prayers");

    expect(store.isFavorite("saint:5")).toBe(true);
    expect(store.isFavorite("prayer:5")).toBe(true);
    expect(store.favorites).toHaveLength(2);
    expect(favoritesStorage!.putAll).toHaveBeenCalled();
  });

  it("deleteFavorite обновляет state и storage, undo восстанавливает", async () => {
    vi.mocked(favoritesStorage!.getAll).mockResolvedValue([
      { id: "saint:5", type: "saints", sort: 0 },
    ]);
    const store = useFavoritesStore();
    await store.initStore();

    await store.deleteFavorite("saint:5");
    expect(store.isFavorite("saint:5")).toBe(false);
    expect(favoritesStorage!.delete).toHaveBeenCalledWith("saint:5");

    await store.undoDeleteFavorite();
    expect(store.isFavorite("saint:5")).toBe(true);
    expect(favoritesStorage!.put).toHaveBeenCalledWith({
      id: "saint:5",
      type: "saints",
      sort: 0,
    });
  });

  it("addFavorite сохраняет точные типы и метаданные для текстов календаря", async () => {
    const store = useFavoritesStore();
    await store.addFavorite("prayer:1641", "bible");
    await store.addFavorite("day:20261013:thought", "thoughts", {
      title: "Прп. Силуан, 13 октября 2026",
      url: "/days/20261013/text/thought",
    });
    await store.addFavorite("day:20261013:parable", "parables", {
      title: "Притча дня, 13 октября 2026",
      url: "/days/20261013/text/parable",
    });
    await store.addFavorite("reading:20261013:104555", "readings", {
      title: "От Иоанна, 10:9–16",
      url: "/days/20261013/readings/104555",
    });
    await store.addFavorite("day:20261013:instructions", "instructions", {
      title: "Богослужебные указания, 13 октября 2026",
      url: "/days/20261013/text/instructions",
    });

    expect(store.getFavoritesByType("bible").map((item) => item.id)).toEqual(["prayer:1641"]);
    expect(store.getFavoritesByType("thoughts")[0]).toMatchObject({
      id: "day:20261013:thought",
      type: "thoughts",
      title: "Прп. Силуан, 13 октября 2026",
      url: "/days/20261013/text/thought",
    });
    expect(store.getFavoritesByType("parables").map((item) => item.id)).toEqual([
      "day:20261013:parable",
    ]);
    expect(store.getFavoritesByType("readings").map((item) => item.id)).toEqual([
      "reading:20261013:104555",
    ]);
    expect(store.getFavoritesByType("instructions").map((item) => item.id)).toEqual([
      "day:20261013:instructions",
    ]);
  });
});
