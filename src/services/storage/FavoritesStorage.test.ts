import { describe, expect, it } from "vitest";
import { FavoritesStorage } from "@/services/storage/FavoritesStorage";
import { resetIndexedDB } from "@/test/helpers";

describe("FavoritesStorage", () => {
  it("getByType возвращает только элементы с нужным type", async () => {
    await resetIndexedDB();
    const storage = new FavoritesStorage();
    await storage.clear();
    await storage.putAll([
      { id: "prayer:1", type: "prayers", sort: 0 },
      { id: "saint:2", type: "saints", sort: 1 },
      { id: "prayer:3", type: "prayers", sort: 2 },
    ]);

    const result = await storage.getByType("prayers");
    expect(result.map((item) => item.id).sort()).toEqual(["prayer:1", "prayer:3"]);
  });
});
