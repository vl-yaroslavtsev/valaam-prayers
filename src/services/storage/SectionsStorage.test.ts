import { describe, expect, it } from "vitest";
import { SectionsStorage } from "@/services/storage/SectionsStorage";
import { prayerSection, resetIndexedDB } from "@/test/helpers";

describe("SectionsStorage", () => {
  it("getByParent возвращает только секции с нужным parent", async () => {
    await resetIndexedDB();
    const storage = new SectionsStorage();
    await storage.putAll([
      prayerSection(1, 842),
      prayerSection(2, 937),
      prayerSection(3, 842),
    ]);

    const result = await storage.getByParent(842);
    expect(result.map((item) => item.id).sort()).toEqual([1, 3]);
  });
});
