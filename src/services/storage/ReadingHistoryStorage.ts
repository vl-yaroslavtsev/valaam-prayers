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
}