import { beforeEach, describe, expect, it } from "vitest";
import { closeDB, getDB } from "@/services/storage/indexedDB";
import { initStorage, metadataStorage } from "@/services/storage";
import { resetIndexedDB } from "@/test/helpers";

const EXPECTED_STORES = [
  "prayers-index",
  "prayer-sections",
  "favorites",
  "saints-index",
  "saint-details",
  "thoughts-index",
  "thought-details",
  "metadata",
  "prayer-details",
  "reading-history",
  "pagination-cache",
  "bookmarks",
  "calendar-days",
  "calendar-icons",
  "saint-icons",
  "download-progress",
] as const;

describe("indexedDB", () => {
  beforeEach(async () => {
    await resetIndexedDB();
  });

  it("upgrade идемпотентен: все сторы создаются, повторное открытие не теряет данные", async () => {
    const names = Array.from(getDB().objectStoreNames);
    for (const store of EXPECTED_STORES) {
      expect(names).toContain(store);
    }

    await metadataStorage?.setValue("keep", "yes");
    closeDB();
    await initStorage();

    const again = Array.from(getDB().objectStoreNames);
    for (const store of EXPECTED_STORES) {
      expect(again).toContain(store);
    }
    expect(await metadataStorage?.getValue("keep")).toBe("yes");
  });

  it("prayer-details имеет индекс by-module", () => {
    const indexNames = getDB().transaction("prayer-details").store.indexNames;
    expect(Array.from(indexNames)).toContain("by-module");
  });
});
