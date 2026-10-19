import { nativeCall, NativeRpcError } from "@/services/native/nativeRpc";
import type { ValaamDB } from "../indexedDB";
import type { CalendarMarkersStore, MetadataStore, PrayerDetailsStore, TableStorage } from "../types";
import type { CalendarMarkersResponse } from "@/services/api/DaysApi";
import type { PrayerDownloadModuleId } from "@/services/download/types";

const SNAPSHOT_ID = "snapshot";

/**
 * Таблица нативной БД (docs/native-bridge-protocol.md, db.*).
 * dateFields: поля-даты, которые в нативке хранятся как ISO-строки и возвращаются в JS как Date.
 */
export class NativeTableStorage<K extends string | number, V extends object> implements TableStorage<K, V> {
  constructor(
    protected readonly table: string,
    private readonly dateFields: readonly string[] = []
  ) {}

  private revive(item: V): V {
    if (this.dateFields.length === 0) return item;
    const record = item as Record<string, unknown>;
    for (const field of this.dateFields) {
      const value = record[field];
      if (typeof value === "string") record[field] = new Date(value);
    }
    return item;
  }

  async get(key: K): Promise<V | undefined> {
    const item = await nativeCall("db.get", { table: this.table, key });
    return item ? this.revive(item as V) : undefined;
  }

  async getMany(keys: K[]): Promise<(V | undefined)[]> {
    if (keys.length === 0) return [];
    const items = await nativeCall("db.getMany", { table: this.table, keys });
    return items.map((item) => (item ? this.revive(item as V) : undefined));
  }

  async getAll(): Promise<V[]> {
    const items = await nativeCall("db.getAll", { table: this.table });
    return items.map((item) => this.revive(item as V));
  }

  async put(item: V): Promise<void> {
    await nativeCall("db.put", { table: this.table, item });
  }

  async putAll(items: V[]): Promise<void> {
    if (items.length === 0) return;
    await nativeCall("db.putAll", { table: this.table, items });
  }

  async delete(key: K): Promise<void> {
    await nativeCall("db.delete", { table: this.table, key });
  }

  async clear(): Promise<void> {
    await nativeCall("db.clear", { table: this.table });
  }

  async count(): Promise<number> {
    return nativeCall("db.count", { table: this.table });
  }
}

type MetadataItem = ValaamDB["metadata"]["value"];

export class NativeMetadataStorage extends NativeTableStorage<string, MetadataItem> implements MetadataStore {
  constructor() {
    super("metadata", ["updatedAt"]);
  }

  async getValue(key: string): Promise<any> {
    const item = await this.get(key);
    return item?.value;
  }

  async setValue(key: string, value: any): Promise<void> {
    await this.put({ key, value, updatedAt: new Date() });
  }

  async getLastSyncTime(syncKey: string): Promise<Date | null> {
    const timestamp = await this.getValue(`last_sync_${syncKey}`);
    return timestamp ? new Date(timestamp) : null;
  }

  async setLastSyncTime(syncKey: string, time: Date = new Date()): Promise<void> {
    await this.setValue(`last_sync_${syncKey}`, time.toISOString());
  }
}

type MarkersItem = ValaamDB["calendar-markers"]["value"];

export class NativeCalendarMarkersStorage
  extends NativeTableStorage<string, MarkersItem>
  implements CalendarMarkersStore
{
  constructor() {
    super("calendar-markers");
  }

  async getSnapshot(): Promise<CalendarMarkersResponse | undefined> {
    const record = await this.get(SNAPSHOT_ID);
    if (!record) return undefined;

    const { min, max, days } = record;
    return { min, max, days };
  }

  async saveSnapshot(snapshot: CalendarMarkersResponse): Promise<void> {
    await this.put({ id: SNAPSHOT_ID, ...snapshot });
  }
}

type PrayerDetailItem = ValaamDB["prayer-details"]["value"];

/** Тексты молитв качает нативка, поэтому удаление по модулю идёт через download.delete, а не отсюда */
export class NativePrayerDetailsStorage
  extends NativeTableStorage<number, PrayerDetailItem>
  implements PrayerDetailsStore
{
  constructor() {
    super("prayer-details");
  }

  async deleteByModule(_moduleId: PrayerDownloadModuleId): Promise<void> {
    throw new NativeRpcError("NOT_SUPPORTED", "deleteByModule недоступен в нативном режиме");
  }
}
