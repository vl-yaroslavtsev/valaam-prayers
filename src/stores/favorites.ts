import { defineStore } from "pinia";
import { computed, ref } from "vue";
import favoritesData from "../../test-data/favorites.json";

export type TabType = "prayers" | "books" | "saints" | "thoughts" | "bible";

export interface FavoritesItem {
  id: string;
  title: string;
  url: string;
  lang?: Array<"ру" | "цс" | "гр">;
  progress?: number;
  pages?: number;
  type: TabType;
  sort: number;
}

export const useFavoritesStore = defineStore("favorites", () => {
  // State
  const favorites = ref<FavoritesItem[]>(favoritesData as FavoritesItem[]);

  // Данные для отмены операций
  let dataToUndoDelete: { item: FavoritesItem; index: number };
  let dataToUndoResetProgress: {
    item: FavoritesItem;
    progress: number;
    pages: number;
  };

  // Getters
  const getFavoritesByType = (type: TabType) =>
    favorites.value
      .filter((item) => item.type === type)
      .sort((a, b) => a.sort - b.sort);

  // const getFavoritesByType = computed(() => {
  //   const sortedFavorites = favorites.value.sort((a, b) => a.sort - b.sort);
  //   return (type: TabType) => sortedFavorites.filter((item) => item.type === type);
  // });

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

  const resetFavoriteProgress = (id: string) => {
    const index = favorites.value.findIndex((p) => p.id === id);
    if (index !== -1) {
      const item = favorites.value[index];
      dataToUndoResetProgress = {
        item,
        progress: item.progress || 0,
        pages: item.pages || 0,
      };
      item.progress = 0;
      item.pages = 0;
    }
  };

  const undoResetFavoriteProgress = () => {
    if (dataToUndoResetProgress) {
      const { item, progress, pages } = dataToUndoResetProgress;
      item.progress = progress;
      item.pages = pages;
    }
  };

  const sortFavorite = (id: string, from: number, to: number) => {
    const index = favorites.value.findIndex((p) => p.id === id);
    if (index === -1) return;

    const item = favorites.value[index];
    const type = item.type;
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
    resetFavoriteProgress,
    undoResetFavoriteProgress,
    sortFavorite,
  };
});
