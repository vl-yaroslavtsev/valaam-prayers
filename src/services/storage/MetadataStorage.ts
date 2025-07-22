import { BaseStorage } from "./BaseStorage";

export class MetadataStorage extends BaseStorage<"metadata"> {
  constructor() {
    super("metadata");
  }

  /**
   * Получает значение по ключу
   */
  async getValue(key: string): Promise<any> {
    const item = await this.get(key);
    return item?.value;
  }

  /**
   * Устанавливает значение по ключу
   */
  async setValue(key: string, value: any): Promise<void> {
    await this.put({
      key,
      value,
      updatedAt: new Date()
    });
  }

  /**
   * Получает время последней синхронизации
   */
  async getLastSyncTime(syncKey: string): Promise<Date | null> {
    const timestamp = await this.getValue(`last_sync_${syncKey}`);
    return timestamp ? new Date(timestamp) : null;
  }

  /**
   * Сохраняет время последней синхронизации
   */
  async setLastSyncTime(syncKey: string, time: Date = new Date()): Promise<void> {
    await this.setValue(`last_sync_${syncKey}`, time.toISOString());
  }
} 