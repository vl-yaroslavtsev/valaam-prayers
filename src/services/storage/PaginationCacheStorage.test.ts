import { beforeEach, describe, expect, it } from "vitest";
import { PaginationCacheStorage } from "@/services/storage/PaginationCacheStorage";
import { paginationSettings, resetIndexedDB } from "@/test/helpers";

describe("PaginationCacheStorage", () => {
  beforeEach(async () => {
    await resetIndexedDB();
  });

  it("getCachedPages возвращает null и удаляет запись при несовпадении modifiedTs", async () => {
    const storage = new PaginationCacheStorage();
    await storage.setCachedPages(1, "ru", paginationSettings, ["p1"], [], 10);

    expect(await storage.getCachedPages(1, "ru", paginationSettings, 11)).toBeNull();
    expect(await storage.get("1_ru")).toBeUndefined();
  });

  it("для language cs хэш зависит от Cs-полей и не зависит от isTextBold", async () => {
    const storage = new PaginationCacheStorage();
    await storage.setCachedPages(1, "cs", paginationSettings, ["cs-page"], [], 1);

    expect(
      await storage.getCachedPages(1, "cs", { ...paginationSettings, isTextBold: true }, 1),
    ).toEqual({ pages: ["cs-page"], headers: [] });

    expect(
      await storage.getCachedPages(1, "cs", { ...paginationSettings, fontSizeCs: 99 }, 1),
    ).toBeNull();
    expect(await storage.get("1_cs")).toBeUndefined();
  });

  it("для остальных языков хэш зависит от isTextBold и не зависит от Cs-полей", async () => {
    const storage = new PaginationCacheStorage();
    await storage.setCachedPages(1, "ru", paginationSettings, ["ru-page"], [], 1);

    expect(
      await storage.getCachedPages(1, "ru", { ...paginationSettings, fontSizeCs: 99 }, 1),
    ).toEqual({ pages: ["ru-page"], headers: [] });

    expect(
      await storage.getCachedPages(1, "ru", { ...paginationSettings, isTextBold: true }, 1),
    ).toBeNull();
    expect(await storage.get("1_ru")).toBeUndefined();
  });

  it("setCachedPages + cleanupIfNeeded удаляет самые старые по accessedAt при превышении maxCacheSize", async () => {
    const storage = new PaginationCacheStorage(2);
    await storage.put({
      id: "1_ru",
      language: "ru",
      hash: "old",
      pages: ["a"],
      headers: [],
      accessedAt: new Date("2020-01-01T00:00:00.000Z"),
    });
    await storage.put({
      id: "2_ru",
      language: "ru",
      hash: "old",
      pages: ["b"],
      headers: [],
      accessedAt: new Date("2021-01-01T00:00:00.000Z"),
    });

    await storage.setCachedPages(3, "ru", paginationSettings, ["c"], [], 1);

    const ids = (await storage.getAll()).map((item) => item.id).sort();
    expect(ids).toEqual(["2_ru", "3_ru"]);
  });

  it("getCacheStats считает min/max accessedAt", async () => {
    const storage = new PaginationCacheStorage();
    expect(await storage.getCacheStats()).toEqual({
      totalItems: 0,
      maxSize: 100,
      oldestAccess: null,
      newestAccess: null,
    });

    const older = new Date("2022-01-01T00:00:00.000Z");
    const newer = new Date("2023-01-01T00:00:00.000Z");
    await storage.put({
      id: "1_ru",
      language: "ru",
      hash: "h",
      pages: ["a"],
      headers: [],
      accessedAt: older,
    });
    await storage.put({
      id: "2_ru",
      language: "ru",
      hash: "h",
      pages: ["b"],
      headers: [],
      accessedAt: newer,
    });

    const stats = await storage.getCacheStats();
    expect(stats.totalItems).toBe(2);
    expect(stats.oldestAccess?.toISOString()).toBe(older.toISOString());
    expect(stats.newestAccess?.toISOString()).toBe(newer.toISOString());
  });

  it("clearCache очищает все записи", async () => {
    const storage = new PaginationCacheStorage();
    await storage.setCachedPages(1, "ru", paginationSettings, ["p"], [], 1);
    await storage.clearCache();
    expect(await storage.getAll()).toEqual([]);
  });

  it("removeCachedPages удаляет запись для id и языка", async () => {
    const storage = new PaginationCacheStorage();
    await storage.setCachedPages(1, "ru", paginationSettings, ["p"], [], 1);
    await storage.setCachedPages(1, "cs", paginationSettings, ["q"], [], 1);

    await storage.removeCachedPages(1, "ru");

    expect(await storage.get("1_ru")).toBeUndefined();
    expect(await storage.get("1_cs")).toMatchObject({ id: "1_cs" });
  });
});
