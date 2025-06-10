import { defineStore } from "pinia";
import { computed, ref } from "vue";
import favoritesData from "../../test-data/favorites.json";

export type TabType = "prayers" | "books" | "saints" | "thoughts" | "bible";

export interface FavoritesItem {
  id: string;
  name: string;
  type: TabType;
  sort: number;
}

export const useFavoritesStore = defineStore("favorites", () => {
  // State
  const favorites = ref<FavoritesItem[]>(favoritesData as FavoritesItem[]);

  // Данные для отмены операций
  let dataToUndoDelete: { item: FavoritesItem; index: number };

  // Getters
  const getFavoritesByType = (type: TabType) =>
    favorites.value
      .filter((item) => item.type === type)
      .sort((a, b) => a.sort - b.sort);

  // Actions
  const deleteFavorite = (id: string) => {
    const index = favorites.value.findIndex((p) => p.id === id);
    if (index !== -1) {
      dataToUndoDelete = { item: favorites.value[index], index };
      favorites.value = favorites.value.filter((p) => p.id !== id);
    }
  };

  const undoDeleteFavorite = () => {
    if (dataToUndoDelete) {
      const { item, index } = dataToUndoDelete;
      favorites.value.splice(index, 0, item);
    }
  };

  const moveFavorite = (id: string, from: number, to: number) => {
    const item = favorites.value.find((p) => p.id === id);
    if (!item) return;

    const { type } = item;
    const itemsByType = favorites.value
      .filter((p) => p.type === type)
      .sort((a, b) => a.sort - b.sort);
    const [removedItem] = itemsByType.splice(from, 1);
    itemsByType.splice(to, 0, removedItem);
    itemsByType.forEach((p, i) => {
      p.sort = i;
    });
  };

  return {
    // State
    favorites,
    // Getters
    getFavoritesByType,
    // Actions
    deleteFavorite,
    undoDeleteFavorite,
    moveFavorite,
  };
});
