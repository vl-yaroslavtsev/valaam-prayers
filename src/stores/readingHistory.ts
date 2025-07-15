// stores/readingHistory.ts
import { defineStore } from "pinia";
import { readingHistoryStorage } from "../services/storage";

type ReadingType = "prayers" | "books" | "saints";

interface ReadingHistoryItem {
  id: string;
  progress: number;
  pages: number;
  type: ReadingType;
  lastReadAt: Date;
}

export const useReadingHistoryStore = defineStore("readingHistory", {
  state: () => ({
    history: [] as ReadingHistoryItem[],
    snapshot: {
      id: "",
      progress: 0,
      pages: 0,
      type: "prayers",
      lastReadAt: new Date(),
    } as ReadingHistoryItem,
    isInitialized: false,
    isInitializing: false,
  }),

  getters: {
    getItem: (state) => (id: string) => {
      return state.history.find((item) => item.id === id);
    },
    getLastItems:
      (state) =>
      (type: ReadingType | "all" = "all", count: number = 10) => {
        let history = [...state.history];

        if (type != "all") {
          history = history.filter((h) => h.type === type);
        }

        return history
          .sort((a, b) => b.lastReadAt.getTime() - a.lastReadAt.getTime())
          .slice(0, count);
      },
  },

  actions: {
    async initStore() {
      if (this.isInitialized || this.isInitializing) return;
      this.isInitializing = true;

      try {
        const cachedHistory = await readingHistoryStorage?.getAll();
        if (cachedHistory) {
          this.history = cachedHistory;
        }
      } catch (error) {
        console.error('Failed to load reading history from cache:', error);
      } finally {
        this.isInitialized = true;
        this.isInitializing = false;
      }
    },

    async updateProgress(
      id: string,
      progress: number,
      pages?: number,
      type: ReadingType = "prayers"
    ) {
      let item = this.history.find((item) => item.id === id);

      if (item) {
        this.snapshot = { ...item };
        item.progress = progress;
        if (pages !== undefined) item.pages = pages;
        item.lastReadAt = new Date();
      } else {
        item = {
          id,
          progress,
          pages: pages ?? 0,
          type,
          lastReadAt: new Date(),
        };
        this.history.push(item);
      }
      await readingHistoryStorage?.put(item);
    },

    resetProgress(id: string) {
      this.updateProgress(id, 0);
    },

    undoResetProgress() {
      const snapshotId = this.snapshot.id;
      const item = this.history.find((item) => item.id === snapshotId);
      if (!item) return;

      item.progress = this.snapshot.progress;
    },
  },
});
