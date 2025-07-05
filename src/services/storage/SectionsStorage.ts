import type { ValaamDB } from "./indexedDB";
import { BaseStorage } from "./BaseStorage";

export class SectionsStorage extends BaseStorage<"prayer-sections"> {
  constructor() {
    super("prayer-sections");
  }

  async getByParent(
    parentId: string
  ): Promise<ValaamDB["sections"]["value"][]> {
    return this.db.getAllFromIndex(this.name, "by-parent", parentId);
  }
} 


