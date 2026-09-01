import { describe, expect, it } from "vitest";
import { PrayerDetailsStorage } from "@/services/storage/PrayerTextsStorage";
import { prayerDetail, resetIndexedDB } from "@/test/helpers";

describe("PrayerDetailsStorage", () => {
  it("deleteByModule удаляет только записи с нужным moduleId", async () => {
    await resetIndexedDB();
    const storage = new PrayerDetailsStorage();
    await storage.putAll([
      prayerDetail(1, "molitvoslov"),
      prayerDetail(2, "liturgicalBooks"),
      prayerDetail(3, "molitvoslov"),
    ]);

    await storage.deleteByModule("molitvoslov");

    expect(await storage.get(1)).toBeUndefined();
    expect(await storage.get(3)).toBeUndefined();
    expect(await storage.get(2)).toMatchObject({ id: 2, moduleId: "liturgicalBooks" });
  });
});
