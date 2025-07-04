
import type { ValaamDB } from "./indexedDB";
import { BaseStorage } from "./BaseStorage";

export class SectionsStorage extends BaseStorage<"sections"> {
  constructor() {
    super("sections");
  }

  async getByParent(
    parentId: string
  ): Promise<ValaamDB["sections"]["value"][]> {
    return this.db.getAllFromIndex(this.name, "by-parent", parentId);
  }
} 


