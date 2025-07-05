import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { favoritesStorage } from "@/services/storage";

export type FavoriteType =
  | "prayers"
  | "books"
  | "saints"
  | "thoughts";

export interface FavoritesItem {
  id: string;
  type: FavoriteType;
  sort: number;
}

export const useFavoritesStore = defineStore("favorites", () => {
  
  // State
  const favorites = ref<FavoritesItem[]>([]);
  const isInitialized = ref<boolean>(false);
  const isInitializing = ref<boolean>(false);

  // Данные для отмены операций
  let dataToUndoDelete: { item: FavoritesItem; index: number };

  const initStore = async () => {
    if (isInitialized.value || isInitializing.value) return;
    isInitializing.value = true;

    try {
      const cachedFavorites = await favoritesStorage?.getAll();
      if (cachedFavorites) {
        favorites.value = cachedFavorites;
      }
    } catch (error) {
      console.error('Failed to load favorites from cache:', error);
    } finally {
      isInitialized.value = true;
      isInitializing.value = false;
    }
  };

  // Getters
  const getFavoritesByType = (type: FavoriteType) =>
    favorites.value
      .filter((item) => item.type === type)
      .sort((a, b) => a.sort - b.sort);

  // Actions
  const deleteFavorite = async (id: string) => {
    const index = favorites.value.findIndex((p) => p.id === id);
    if (index !== -1) {
      dataToUndoDelete = { item: favorites.value[index], index };
      favorites.value = favorites.value.filter((p) => p.id !== id);
      
      // Удаляем из IndexedDB
      try {
        await favoritesStorage?.delete(id);
      } catch (error) {
        console.error('Failed to delete favorite from storage:', error);
      }
    }
  };

  const undoDeleteFavorite = async () => {
    if (dataToUndoDelete) {
      const { item, index } = dataToUndoDelete;
      favorites.value.splice(index, 0, item);

      // Сохраняем в IndexedDB
      try {
        await favoritesStorage?.put(item);
      } catch (error) {
        console.error('Failed to save favorite to storage:', error);
      }
    }
  };

  const addFavorite = async (id: string, type: FavoriteType) => {
    const item = favorites.value.find((p) => p.id === id);
    if (item) return;

    const newItem: FavoritesItem = {
      id,
      type,
      sort: -1,
    };
    favorites.value.push(newItem);
    const itemsByType = favorites.value
      .filter((p) => p.type === type)
      .sort((a, b) => a.sort - b.sort);
    itemsByType.forEach((p, i) => {
      p.sort = i;
    });

    // Сохраняем в IndexedDB
    try {
      await favoritesStorage?.putAll(itemsByType);
    } catch (error) {
      console.error('Failed to save favorite to storage:', error);
    }
  };

  const isFavorite = (id: string) => {
    return !!favorites.value.find((p) => p.id === id);
  };

  const moveFavorite = async (id: string, from: number, to: number) => {
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

    // Сохраняем в IndexedDB
    try {
      await favoritesStorage?.putAll(itemsByType);
    } catch (error) {
      console.error('Failed to save favorite to storage:', error);
    }
  };

  initStore();

  return {
    // State
    favorites,
    isInitialized,
    // Getters
    getFavoritesByType,
    isFavorite,
    // Actions
    addFavorite,
    deleteFavorite,
    undoDeleteFavorite,
    moveFavorite,
  };
});
