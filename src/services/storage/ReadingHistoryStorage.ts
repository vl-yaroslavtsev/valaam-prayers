import type { ValaamDB } from "./indexedDB";
import { BaseStorage } from "./BaseStorage";

export class ReadingHistoryStorage extends BaseStorage<"reading-history"> {
  constructor() {
    super("reading-history");
  }

  /**
   * Получить недавнюю историю чтения
   */
  async getRecent(limit: number = 20): Promise<ValaamDB['reading-history']['value'][]> {
    const tx = this.db.transaction(this.name, 'readonly');
    const index = tx.store.index('by-last-read');
    
    const histories: ValaamDB['reading-history']['value'][] = [];
    let cursor = await index.openCursor(null, 'prev');
    
    while (cursor && histories.length < limit) {
      histories.push(cursor.value);
      cursor = await cursor.continue();
    }
    
    return histories;
  }


  /**
   * Обновить позицию чтения
   */
  async updateProgress(id: string, progress: number, pages: number = 0): Promise<void> {
    const existingHistory = await this.get(id);
    const now = new Date();
    
    if (existingHistory) {
      // Обновляем существующую запись
      existingHistory.progress = progress;
      if (pages) {
        existingHistory.pages = pages;
      }
      existingHistory.lastReadAt = now;
      await this.put(existingHistory);
    }
  }
}