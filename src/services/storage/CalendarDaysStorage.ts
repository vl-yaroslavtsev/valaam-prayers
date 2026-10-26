import { BaseStorage } from "./BaseStorage";

/**
 * Дни календаря, скачанные для офлайн-доступа (наполняется только браузерным DownloadManager).
 * Ключ стора IndexedDB — `code` (`YYYYMMDD`), поэтому диапазон ключей совпадает с порядком дат.
 */
export class CalendarDaysStorage extends BaseStorage<"calendar-days"> {
  constructor() {
    super("calendar-days");
  }

  async deleteBefore(beforeCode: string): Promise<void> {
    const tx = this.db.transaction(this.name, "readwrite");
    await tx.store.delete(IDBKeyRange.upperBound(beforeCode, true));
    await tx.done;
  }
}
