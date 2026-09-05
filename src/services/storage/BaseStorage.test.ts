import { beforeEach, describe, expect, it } from "vitest";
import { MetadataStorage } from "@/services/storage/MetadataStorage";
import { resetIndexedDB } from "@/test/helpers";

describe("BaseStorage", () => {
  let storage: MetadataStorage;

  beforeEach(async () => {
    await resetIndexedDB();
    storage = new MetadataStorage();
  });

  it("get/put/putAll/delete/clear/getAll работают на сторе", async () => {
    await storage.put({ key: "a", value: 1, updatedAt: new Date() });
    expect(await storage.get("a")).toMatchObject({ key: "a", value: 1 });

    await storage.putAll([
      { key: "b", value: 2, updatedAt: new Date() },
      { key: "c", value: 3, updatedAt: new Date() },
    ]);
    expect((await storage.getAll()).map((item) => item.key).sort()).toEqual(["a", "b", "c"]);

    await storage.delete("b");
    expect(await storage.get("b")).toBeUndefined();

    await storage.clear();
    expect(await storage.getAll()).toEqual([]);
  });

  it("getMany возвращает записи в порядке ключей и undefined для отсутствующих", async () => {
    await storage.putAll([
      { key: "a", value: 1, updatedAt: new Date() },
      { key: "c", value: 3, updatedAt: new Date() },
    ]);

    const results = await storage.getMany(["c", "b", "a"]);

    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({ key: "c", value: 3 });
    expect(results[1]).toBeUndefined();
    expect(results[2]).toMatchObject({ key: "a", value: 1 });
  });
});
