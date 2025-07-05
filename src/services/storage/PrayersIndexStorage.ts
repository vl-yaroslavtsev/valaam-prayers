import type { ValaamDB } from "./indexedDB";
import { BaseStorage } from "./BaseStorage";

export class PrayersIndexStorage extends BaseStorage<"prayers-index"> {
  constructor() {
    super("prayers-index");
  }

  async getByParent(
    parentId: string
  ): Promise<ValaamDB["prayers-index"]["value"][]> {
    return this.db.getAllFromIndex(this.name, "by-parent", parentId);
  }
} 


