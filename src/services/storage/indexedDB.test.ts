import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
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
  "calendar-markers",
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

  it("при апгрейде удаляет сторы иконок и сохраняет остальные данные", async () => {
    closeDB();
    Object.defineProperty(globalThis, "indexedDB", {
      value: new IDBFactory(),
      writable: true,
      configurable: true,
    });

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("valaam-prayers", 8);
      request.onupgradeneeded = () => {
        const database = request.result;
        database.createObjectStore("calendar-icons", { keyPath: "url" });
        database.createObjectStore("saint-icons", { keyPath: "url" });
        const metadata = database.createObjectStore("metadata", { keyPath: "key" });
        metadata.put({ key: "keep", value: "yes", updatedAt: new Date() });
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    await initStorage();

    const names = Array.from(getDB().objectStoreNames);
    expect(names).not.toContain("calendar-icons");
    expect(names).not.toContain("saint-icons");
    expect(names).toContain("download-progress");
    expect(await metadataStorage?.getValue("keep")).toBe("yes");
  });
});
