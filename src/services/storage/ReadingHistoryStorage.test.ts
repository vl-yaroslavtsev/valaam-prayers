import { describe, expect, it } from "vitest";
import { ReadingHistoryStorage } from "@/services/storage/ReadingHistoryStorage";
import { resetIndexedDB } from "@/test/helpers";

describe("ReadingHistoryStorage", () => {
  it("getRecent сортирует по by-last-read убыванию и уважает limit", async () => {
    await resetIndexedDB();
    const storage = new ReadingHistoryStorage();
    await storage.putAll([
      { id: 1, progress: 0, pages: 1, type: "prayers", lastReadAt: new Date("2026-01-01T00:00:00.000Z") },
      { id: 2, progress: 0, pages: 1, type: "prayers", lastReadAt: new Date("2026-03-01T00:00:00.000Z") },
      { id: 3, progress: 0, pages: 1, type: "books", lastReadAt: new Date("2026-02-01T00:00:00.000Z") },
    ]);

    const result = await storage.getRecent(2);
    expect(result.map((item) => item.id)).toEqual([2, 3]);
  });
});
