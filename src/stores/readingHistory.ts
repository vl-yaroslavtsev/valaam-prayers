// stores/readingHistory.ts
import { defineStore } from "pinia";
import { readingHistoryStorage } from "../services/storage";

export type ReadingType =
  | "prayers"
  | "books"
  | "saints"
  | "readings"
  | "instructions";

export interface ReadingHistoryMeta {
  title: string;
  url: string;
}

export interface ReadingHistoryItem {
  id: string;
  progress: number;
  pages: number;
  type: ReadingType;
  lastReadAt: Date;
  /** Название и адрес для текстов без общего индекса (жития, указания, чтения дня) */
  title?: string;
  url?: string;
}

/** Типы истории, которые попадают в блок «Сейчас читаю» на главной */
const RECENT_READING_TYPES: ReadonlySet<ReadingType> = new Set([
  "prayers",
  "books",
  "saints",
  "instructions",
]);

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
    getRecentItems:
      (state) =>
      (count: number = 10) => {
        return state.history
          .filter((h) => RECENT_READING_TYPES.has(h.type))
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
        console.error("Failed to load reading history from cache:", error);
      } finally {
        this.isInitialized = true;
        this.isInitializing = false;
      }
    },

    async updateProgress(
      id: string,
      progress: number,
      pages?: number,
      type?: ReadingType,
      meta?: ReadingHistoryMeta
    ) {
      let item = this.history.find((item) => item.id === id);

      if (item) {
        this.snapshot = { ...item };
        item.progress = progress;
        if (type !== undefined) item.type = type;
        if (pages !== undefined) item.pages = pages;
        if (meta) {
          item.title = meta.title;
          item.url = meta.url;
        }
        item.lastReadAt = new Date();
      } else {
        item = {
          id,
          progress,
          pages: pages ?? 0,
          type: type ?? "prayers",
          lastReadAt: new Date(),
          ...meta,
        };
        this.history.push(item);
      }
      await readingHistoryStorage?.put(item);
    },

    resetProgress(id: string) {
      void this.updateProgress(id, 0);
    },

    undoResetProgress() {
      const snapshotId = this.snapshot.id;
      const item = this.history.find((item) => item.id === snapshotId);
      if (!item) return;

      item.progress = this.snapshot.progress;
    },
  },
});
