import { BaseStorage } from "./BaseStorage";
import type { ValaamDB } from "./indexedDB";

export class BookmarksStorage extends BaseStorage<"bookmarks"> {
  constructor() {
    super("bookmarks");
  }

  async getByItem(
    itemId: string
  ): Promise<ValaamDB["bookmarks"]["value"][]> {
    return this.db.getAllFromIndex(this.name, "by-item", itemId);
  }
}
