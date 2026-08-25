import { defineStore } from "pinia";
import { ref } from "vue";
import { bookmarksStorage } from "@/services/storage";

export interface Bookmark {
  id: string;
  itemId: string;
  progress: number;
  name: string;
  createdAt: Date;
}

const generateId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `bm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const useBookmarksStore = defineStore("bookmarks", () => {
  // State
  const bookmarks = ref<Bookmark[]>([]);
  const isInitialized = ref<boolean>(false);
  const isInitializing = ref<boolean>(false);

  // Данные для отмены удаления
  let dataToUndoDelete: { item: Bookmark; index: number } | null = null;

  const initStore = async () => {
    if (isInitialized.value || isInitializing.value) return;
    isInitializing.value = true;

    try {
      const cachedBookmarks = await bookmarksStorage?.getAll();
      if (cachedBookmarks) {
        bookmarks.value = cachedBookmarks;
      }
    } catch (error) {
      console.error("Failed to load bookmarks from cache:", error);
    } finally {
      isInitialized.value = true;
      isInitializing.value = false;
    }
  };

  // Getters
  const getBookmarksByItem = (itemId: string) =>
    bookmarks.value
      .filter((b) => b.itemId === itemId)
      .sort((a, b) => a.progress - b.progress);

  // Actions
  const addBookmark = async (itemId: string, progress: number): Promise<Bookmark> => {
    const existingCount = bookmarks.value.filter((b) => b.itemId === itemId).length;
    const newItem: Bookmark = {
      id: generateId(),
      itemId,
      progress,
      name: `Закладка ${existingCount + 1}`,
      createdAt: new Date(),
    };
    bookmarks.value.push(newItem);

    try {
      await bookmarksStorage?.put(newItem);
    } catch (error) {
      console.error("Failed to save bookmark to storage:", error);
    }

    return newItem;
  };

  const renameBookmark = async (id: string, name: string) => {
    const item = bookmarks.value.find((b) => b.id === id);
    if (!item) return;

    item.name = name;

    try {
      await bookmarksStorage?.put(item);
    } catch (error) {
      console.error("Failed to rename bookmark in storage:", error);
    }
  };

  const deleteBookmark = async (id: string) => {
    const index = bookmarks.value.findIndex((b) => b.id === id);
    if (index === -1) return;

    dataToUndoDelete = { item: bookmarks.value[index], index };
    bookmarks.value = bookmarks.value.filter((b) => b.id !== id);

    try {
      await bookmarksStorage?.delete(id);
    } catch (error) {
      console.error("Failed to delete bookmark from storage:", error);
    }
  };

  const undoDeleteBookmark = async () => {
    if (!dataToUndoDelete) return;
    const { item, index } = dataToUndoDelete;
    bookmarks.value.splice(index, 0, item);
    dataToUndoDelete = null;

    try {
      await bookmarksStorage?.put(item);
    } catch (error) {
      console.error("Failed to restore bookmark in storage:", error);
    }
  };

  return {
    // State
    bookmarks,
    isInitialized,
    // Getters
    getBookmarksByItem,
    // Actions
    initStore,
    addBookmark,
    renameBookmark,
    deleteBookmark,
    undoDeleteBookmark,
  };
});
