import { BaseStorage } from "./BaseStorage";
import type { CalendarMarkersResponse } from "@/services/api/DaysApi";

const SNAPSHOT_ID = "snapshot";

/**
 * Раскраска дней календаря (/days/calendar) для офлайн-доступа.
 * API отдаёт полный снимок без инкрементальной синхронизации, поэтому снимок хранится одной записью.
 */
export class CalendarMarkersStorage extends BaseStorage<"calendar-markers"> {
  constructor() {
    super("calendar-markers");
  }

  async getSnapshot(): Promise<CalendarMarkersResponse | undefined> {
    const record = await this.get(SNAPSHOT_ID);
    if (!record) return undefined;

    const { min, max, days } = record;
    return { min, max, days };
  }

  async saveSnapshot(snapshot: CalendarMarkersResponse): Promise<void> {
    await this.put({ id: SNAPSHOT_ID, ...snapshot });
  }
}
