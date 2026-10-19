import { afterEach, describe, expect, it } from "vitest";
import * as storage from "@/services/storage";
import { initStorage } from "@/services/storage";
import defaultFavorites from "@/services/storage/data/defaultFavorites.json";
import { NativeTableStorage } from "@/services/storage/native/NativeTableStorage";
import { BaseStorage } from "@/services/storage/BaseStorage";
import { FakeNativeBackend } from "@/test/fakeNativeBackend";
import { resetIndexedDB } from "@/test/helpers";

/**
 * Один набор проверок на двух бэкендах: IndexedDB (браузер) и нативная БД (FakeNativeBackend в памяти).
 * Если поведение расходится, тест падает на одном из них.
 */
interface BackendSetup {
  name: string;
  setup(): Promise<void>;
  tableClass: typeof BaseStorage | typeof NativeTableStorage;
}

let uninstall: (() => void) | null = null;

const backends: BackendSetup[] = [
  {
    name: "IndexedDB",
    tableClass: BaseStorage,
    async setup() {
      await resetIndexedDB();
    },
  },
  {
    name: "нативная БД",
    tableClass: NativeTableStorage,
    async setup() {
      uninstall = new FakeNativeBackend().install({ platform: "android" });
      await resetIndexedDB();
    },
  },
];

afterEach(() => {
  uninstall?.();
  uninstall = null;
});

describe.each(backends)("хранилище: $name", ({ setup, tableClass }) => {
  it("выбирает свою реализацию", async () => {
    await setup();

    expect(storage.saintsIndexStorage).toBeInstanceOf(tableClass);
  });

  it("put/get/getAll/delete/clear", async () => {
    await setup();
    const saints = storage.saintsIndexStorage!;

    await saints.put({ id: 1, name: "Герман" });
    await saints.putAll([
      { id: 2, name: "Сергий" },
      { id: 3, name: "Савватий" },
    ]);

    expect(await saints.get(1)).toEqual({ id: 1, name: "Герман" });
    expect(await saints.get(99)).toBeUndefined();
    expect(await saints.getAll()).toHaveLength(3);

    await saints.put({ id: 1, name: "Герман Валаамский" });
    expect(await saints.get(1)).toEqual({ id: 1, name: "Герман Валаамский" });

    await saints.delete(2);
    expect(await saints.get(2)).toBeUndefined();

    await saints.clear();
    expect(await saints.getAll()).toEqual([]);
  });

  it("getMany сохраняет порядок и отдаёт undefined для отсутствующих", async () => {
    await setup();
    const saints = storage.saintsIndexStorage!;
    await saints.putAll([
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ]);

    expect(await saints.getMany([2, 99, 1])).toEqual([{ id: 2, name: "B" }, undefined, { id: 1, name: "A" }]);
    expect(await saints.getMany([])).toEqual([]);
  });

  it("putAll пустого массива ничего не ломает", async () => {
    await setup();

    await expect(storage.saintsIndexStorage!.putAll([])).resolves.not.toThrow();
  });

  it("сохраняет неизвестные поля и вложенные данные", async () => {
    await setup();
    const details = storage.saintDetailsStorage!;
    const item = {
      id: 7,
      name: "Святой",
      sort: 1,
      type: "saint",
      text: "<p>текст</p>",
      picture: "/upload/a.jpg",
      prayers_id: null,
      akathist_id: [1, 2],
      canon_id: [],
      minea_id: [],
      hagiography_id: [],
      memo_days: [{ day: "0101", title: "x" }],
      modified_ts: 5,
      extra_unknown_field: { nested: [1, "a", null] },
    };

    await details.put(item as never);

    expect(await details.get(7)).toEqual(item);
  });

  it("даты закладок и истории возвращаются как Date", async () => {
    await setup();
    const createdAt = new Date("2026-03-01T10:20:30.000Z");
    const lastReadAt = new Date("2026-03-02T11:00:00.000Z");

    await storage.bookmarksStorage!.put({ id: "b1", itemId: 5, progress: 0.5, name: "Закладка", createdAt });
    await storage.readingHistoryStorage!.put({ id: 5, progress: 0.1, pages: 10, type: "prayers", lastReadAt });

    const bookmark = await storage.bookmarksStorage!.get("b1");
    const history = await storage.readingHistoryStorage!.get(5);
    expect(bookmark?.createdAt).toBeInstanceOf(Date);
    expect(bookmark?.createdAt.getTime()).toBe(createdAt.getTime());
    expect(history?.lastReadAt).toBeInstanceOf(Date);
    expect(history?.lastReadAt.getTime()).toBe(lastReadAt.getTime());
    expect((await storage.bookmarksStorage!.getAll())[0].createdAt).toBeInstanceOf(Date);
  });

  it("metadata: значения и время синхронизации", async () => {
    await setup();
    const metadata = storage.metadataStorage!;

    expect(await metadata.getValue("missing")).toBeUndefined();
    await metadata.setValue("download_size_saints", 1234);
    expect(await metadata.getValue("download_size_saints")).toBe(1234);

    expect(await metadata.getLastSyncTime("saints")).toBeNull();
    const time = new Date("2026-05-01T00:00:00.000Z");
    await metadata.setLastSyncTime("saints", time);
    expect((await metadata.getLastSyncTime("saints"))?.toISOString()).toBe(time.toISOString());

    const stored = await metadata.get("download_size_saints");
    expect(stored?.updatedAt).toBeInstanceOf(Date);
  });

  it("calendar-markers: снимок хранится одной записью", async () => {
    await setup();
    const markers = storage.calendarMarkersStorage!;
    const snapshot = { min: "20260101", max: "20261231", days: { "20260101": 1 } } as never;

    expect(await markers.getSnapshot()).toBeUndefined();
    await markers.saveSnapshot(snapshot);

    expect(await markers.getSnapshot()).toEqual(snapshot);
    expect(await markers.getAll()).toHaveLength(1);
  });

  it("избранное по умолчанию засевается один раз", async () => {
    await setup();
    const favorites = storage.favoritesStorage!;

    expect(await favorites.getAll()).toHaveLength(defaultFavorites.length);

    await favorites.clear();
    await initStorage();

    expect(await storage.favoritesStorage!.getAll()).toEqual([]);
  });

  it("thoughts и pagination-cache всегда в IndexedDB", async () => {
    await setup();

    expect(storage.thoughtsIndexStorage).toBeInstanceOf(BaseStorage);
    expect(storage.paginationCacheStorage).toBeInstanceOf(BaseStorage);
  });
});

describe("выбор бэкенда", () => {
  it("если рукопожатие не прошло, остаётся IndexedDB", async () => {
    const backend = new FakeNativeBackend();
    uninstall = backend.install({ capabilities: ["download"] });
    await resetIndexedDB();

    expect(storage.saintsIndexStorage).toBeInstanceOf(BaseStorage);
    expect(backend.callsOf("db.getAll")).toEqual([]);
  });

  it("нативная таблица неизвестна нативке: ошибка доходит до вызывающего", async () => {
    uninstall = new FakeNativeBackend().install();
    await resetIndexedDB();
    const unknown = new NativeTableStorage<number, { id: number }>("pagination-cache");

    await expect(unknown.get(1)).rejects.toMatchObject({ code: "UNKNOWN_TABLE" });
  });
});
