import { beforeEach, describe, expect, it } from "vitest";
import { MetadataStorage } from "@/services/storage/MetadataStorage";
import { resetIndexedDB } from "@/test/helpers";

describe("MetadataStorage", () => {
  let storage: MetadataStorage;

  beforeEach(async () => {
    await resetIndexedDB();
    storage = new MetadataStorage();
  });

  describe("getValue/setValue", () => {
    it("пишет и читает значение по ключу", async () => {
      await storage.setValue("theme", "dark");
      expect(await storage.getValue("theme")).toBe("dark");
    });
  });

  describe("getLastSyncTime/setLastSyncTime", () => {
    it("возвращает null при отсутствии ключа", async () => {
      expect(await storage.getLastSyncTime("saints")).toBeNull();
    });

    it("сохраняет дату через ISO и восстанавливает Date", async () => {
      const time = new Date("2026-03-15T10:20:30.123Z");
      await storage.setLastSyncTime("saints", time);

      const stored = await storage.get("last_sync_saints");
      expect(stored?.value).toBe(time.toISOString());

      const restored = await storage.getLastSyncTime("saints");
      expect(restored).toBeInstanceOf(Date);
      expect(restored?.toISOString()).toBe(time.toISOString());
    });
  });
});
