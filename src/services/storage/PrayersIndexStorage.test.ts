import { beforeEach, describe, expect, it } from "vitest";
import { PrayersIndexStorage } from "@/services/storage/PrayersIndexStorage";
import { prayerElement, resetIndexedDB } from "@/test/helpers";

describe("PrayersIndexStorage", () => {
  it("getByParent возвращает только элементы с нужным parent", async () => {
    await resetIndexedDB();
    const storage = new PrayersIndexStorage();
    await storage.putAll([
      prayerElement(1, [10]),
      { ...prayerElement(2, [20]), parent: 20 },
      { ...prayerElement(3, [10]), parent: 10 },
    ]);

    const result = await storage.getByParent(10);
    expect(result.map((item) => item.id).sort()).toEqual([1, 3]);
  });
});
