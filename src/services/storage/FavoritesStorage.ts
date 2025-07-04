import { BaseStorage } from "./BaseStorage";
import type { ValaamDB } from "./indexedDB";


export class FavoritesStorage extends BaseStorage<"favorites"> {
  constructor() {
    super("favorites");
  }

  async getByType(
    type: ValaamDB["favorites"]["value"]["type"]
  ): Promise<ValaamDB["favorites"]["value"][]> {
    return this.db.getAllFromIndex(this.name, "by-type", type);
  }
}
