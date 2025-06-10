// stores/readingHistory.ts
import { defineStore } from "pinia";
import historyData from '../../test-data/reading-history.json';

interface ReadingHistoryItem {
  id: string;
  progress: number;
  pages: number;
}

export const useReadingHistoryStore = defineStore("readingHistory", {
  state: () => ({
    history: historyData as ReadingHistoryItem[],
    snapshot: {
      id: '',
      progress: 0,
      pages: 0
    } as ReadingHistoryItem
  }),

  getters: {
    getItemProgress: (state) => (id: string) => {
      return state.history.find((item) => item.id === id);
    },
  },

  actions: {
    updateProgress(id: string, progress: number, pages: number) {
      const existingItem = this.history.find((item) => item.id === id);

      if (existingItem) {
        this.snapshot = {...existingItem};
        existingItem.progress = progress;
        existingItem.pages = pages;
      } else {
        this.history.push({
          id,
          progress,
          pages,
        });
      }
    },

    resetProgress(id: string) {
      this.updateProgress(id, 0, 0);
    },

    undoResetProgress() {
      const snapshotId = this.snapshot.id;
      const item = this.history.find((item) => item.id === snapshotId);
      if (!item) return;

      item.progress = this.snapshot.progress;
      item.pages = this.snapshot.pages;
    }
  },
});