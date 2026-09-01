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
    vi.mocked(favoritesStorage!.put).mockResolvedValue(0);
    vi.mocked(favoritesStorage!.putAll).mockResolvedValue([]);
  });

  it("initStore подхватывает кэш", async () => {
    vi.mocked(favoritesStorage!.getAll).mockResolvedValue([{ id: 1, type: "prayers", sort: 0 }]);

    const store = useFavoritesStore();
    await store.initStore();

    expect(store.favorites).toEqual([{ id: 1, type: "prayers", sort: 0 }]);
  });

  it("addFavorite обновляет state и storage", async () => {
    const store = useFavoritesStore();
    await store.addFavorite(5, "saints");

    expect(store.isFavorite(5)).toBe(true);
    expect(favoritesStorage!.putAll).toHaveBeenCalled();
  });

  it("deleteFavorite обновляет state и storage, undo восстанавливает", async () => {
    vi.mocked(favoritesStorage!.getAll).mockResolvedValue([{ id: 5, type: "saints", sort: 0 }]);
    const store = useFavoritesStore();
    await store.initStore();

    await store.deleteFavorite(5);
    expect(store.isFavorite(5)).toBe(false);
    expect(favoritesStorage!.delete).toHaveBeenCalledWith(5);

    await store.undoDeleteFavorite();
    expect(store.isFavorite(5)).toBe(true);
    expect(favoritesStorage!.put).toHaveBeenCalledWith({ id: 5, type: "saints", sort: 0 });
  });
});
