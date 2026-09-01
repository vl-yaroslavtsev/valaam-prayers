import { BaseStorage } from "./BaseStorage";

/**
 * Дни календаря, скачанные для офлайн-доступа (наполняется только DownloadManager'ом)
 */
export class CalendarDaysStorage extends BaseStorage<"calendar-days"> {
  constructor() {
    super("calendar-days");
  }
}
