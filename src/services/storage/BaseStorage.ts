import { toRaw } from "vue";
import { IDBPDatabase, StoreNames } from "idb";
import { getDB, ValaamDB } from "./indexedDB";

export class BaseStorage<T extends StoreNames<ValaamDB>> {
  protected name: T;
  protected db: IDBPDatabase<ValaamDB>;

  constructor(name: T) {
    this.name = name;
    this.db = getDB();
  } 

  async get(id: ValaamDB[T]['key']) {
    return this.db.get(this.name, id);
  }

  async getMany(ids: ValaamDB[T]['key'][]) {
    const tx = this.db.transaction(this.name, "readonly");
    const results = await Promise.all(ids.map((id) => tx.store.get(id)));
    await tx.done;
    return results;
  }

  async getAll() {
    return this.db.getAll(this.name);
  }

  async put(item: ValaamDB[T]['value']) {
    return this.db.put(this.name, toRaw(item));
  }

  async putAll(items: ValaamDB[T]['value'][]) {
    return Promise.all(items.map(item => this.db.put(this.name, toRaw(item))));
  }

  async delete(id: ValaamDB[T]['key']) {    
    return this.db.delete(this.name, id);
  }

  async clear() {
    return this.db.clear(this.name);
  }

}