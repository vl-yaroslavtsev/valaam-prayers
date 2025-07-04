import type { ValaamDB } from "./indexedDB";
import { BaseStorage } from "./BaseStorage";

export class PrayersStorage extends BaseStorage<"prayers"> {
  constructor() {
    super("prayers");
  }

  async getByParent(
    parentId: string
  ): Promise<ValaamDB["prayers"]["value"][]> {
    return this.db.getAllFromIndex(this.name, "by-parent", parentId);
  }
} 


