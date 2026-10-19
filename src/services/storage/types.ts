import type { StoreNames } from "idb";
import type { ValaamDB } from "./indexedDB";
import type { CalendarMarkersResponse } from "@/services/api/DaysApi";
import type { PrayerDownloadModuleId } from "@/services/download/types";

/**
 * Общий контракт таблицы: его реализуют BaseStorage (IndexedDB) и NativeTableStorage (нативная БД).
 */
export interface TableStorage<K, V> {
  get(key: K): Promise<V | undefined>;
  getMany(keys: K[]): Promise<(V | undefined)[]>;
  getAll(): Promise<V[]>;
  put(item: V): Promise<unknown>;
  putAll(items: V[]): Promise<unknown>;
  delete(key: K): Promise<void>;
  clear(): Promise<void>;
}

export type StoreTable<T extends StoreNames<ValaamDB>> = TableStorage<ValaamDB[T]["key"], ValaamDB[T]["value"]>;

export interface MetadataStore extends StoreTable<"metadata"> {
  getValue(key: string): Promise<any>;
  setValue(key: string, value: any): Promise<void>;
  getLastSyncTime(syncKey: string): Promise<Date | null>;
  setLastSyncTime(syncKey: string, time?: Date): Promise<void>;
}

export interface CalendarMarkersStore extends StoreTable<"calendar-markers"> {
  getSnapshot(): Promise<CalendarMarkersResponse | undefined>;
  saveSnapshot(snapshot: CalendarMarkersResponse): Promise<void>;
}

export interface PrayerDetailsStore extends StoreTable<"prayer-details"> {
  deleteByModule(moduleId: PrayerDownloadModuleId): Promise<void>;
}
