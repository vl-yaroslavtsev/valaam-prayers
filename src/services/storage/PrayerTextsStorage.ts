import { BaseStorage } from "./BaseStorage";
import type { PrayerDownloadModuleId } from "@/services/download/types";

export class PrayerDetailsStorage extends BaseStorage<"prayer-details"> {
  constructor() {
    super("prayer-details");
  }

  async deleteByModule(moduleId: PrayerDownloadModuleId): Promise<void> {
    const tx = this.db.transaction(this.name, "readwrite");
    const keys = await tx.store.index("by-module").getAllKeys(moduleId);
    for (const key of keys) tx.store.delete(key);
    await tx.done;
  }
}
