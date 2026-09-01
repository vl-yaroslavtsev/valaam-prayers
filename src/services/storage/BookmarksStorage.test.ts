import { describe, expect, it } from "vitest";
import { BookmarksStorage } from "@/services/storage/BookmarksStorage";
import { resetIndexedDB } from "@/test/helpers";

describe("BookmarksStorage", () => {
  it("getByItem возвращает только закладки с нужным itemId", async () => {
    await resetIndexedDB();
    const storage = new BookmarksStorage();
    await storage.putAll([
      { id: "a", itemId: 10, progress: 0, name: "A", createdAt: new Date() },
      { id: "b", itemId: 20, progress: 1, name: "B", createdAt: new Date() },
      { id: "c", itemId: 10, progress: 2, name: "C", createdAt: new Date() },
    ]);

    const result = await storage.getByItem(10);
    expect(result.map((item) => item.id).sort()).toEqual(["a", "c"]);
  });
});
