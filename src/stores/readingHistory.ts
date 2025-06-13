// stores/readingHistory.ts
import { defineStore } from "pinia";
import historyData from "../../test-data/reading-history.json";

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
    history: historyData.map((e) => {
      return { ...e, lastReadAt: new Date(e.lastReadAt) };
    }) as ReadingHistoryItem[],
    snapshot: {
      id: "",
      progress: 0,
      pages: 0,
      type: "prayers",
      lastReadAt: new Date(),
    } as ReadingHistoryItem,
  }),

  getters: {
    getItemProgress: (state) => (id: string) => {
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
    updateProgress(
      id: string,
      progress: number,
      pages?: number,
      type: ReadingType = "prayers"
    ) {
      const existingItem = this.history.find((item) => item.id === id);

      if (existingItem) {
        this.snapshot = { ...existingItem };
        existingItem.progress = progress;
        if (pages !== undefined) existingItem.pages = pages;
        existingItem.lastReadAt = new Date();
      } else {
        this.history.push({
          id,
          progress,
          pages: pages ?? 0,
          type,
          lastReadAt: new Date(),
        });
      }
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
