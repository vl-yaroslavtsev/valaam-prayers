import { initDB } from "./indexedDB";
import defaultFavorites from "./data/defaultFavorites.json";
import { FavoritesStorage } from "./FavoritesStorage";
import { PrayersIndexStorage } from "./PrayersIndexStorage";
import { SectionsStorage } from "./SectionsStorage";
import { PrayerDetailsStorage } from "./PrayerTextsStorage";
import { SaintsIndexStorage } from "./SaintsIndexStorage";
import { SaintDetailsStorage } from "./SaintDetailsStorage";
import { ThoughtsIndexStorage } from "./ThoughtsIndexStorage";
import { ThoughtDetailsStorage } from "./ThoughtDetailsStorage";
import { ReadingHistoryStorage } from "./ReadingHistoryStorage";
import { MetadataStorage } from "./MetadataStorage";
import { PaginationCacheStorage } from "./PaginationCacheStorage";
import { BookmarksStorage } from "./BookmarksStorage";
import { CalendarDaysStorage } from "./CalendarDaysStorage";
import { CalendarMarkersStorage } from "./CalendarMarkersStorage";
import { CALENDAR_ICONS_CACHE, IconCacheStorage, SAINT_ICONS_CACHE } from "./IconCacheStorage";
import { DownloadProgressStorage } from "./DownloadProgressStorage";
import {
  NativeCalendarMarkersStorage,
  NativeMetadataStorage,
  NativePrayerDetailsStorage,
  NativeTableStorage,
} from "./native/NativeTableStorage";
import { ensureNativeBridge } from "@/services/native/nativeRpc";
import type { ValaamDB } from "./indexedDB";
import type { CalendarMarkersStore, MetadataStore, PrayerDetailsStore, StoreTable } from "./types";

let initStorageError: Error | null = null;

let prayersIndexStorage: StoreTable<"prayers-index"> | null = null;
let sectionsStorage: StoreTable<"prayer-sections"> | null = null;
let prayerDetailsStorage: PrayerDetailsStore | null = null;
let saintsIndexStorage: StoreTable<"saints-index"> | null = null;
let saintDetailsStorage: StoreTable<"saint-details"> | null = null;
let thoughtsIndexStorage: ThoughtsIndexStorage | null = null;
let thoughtDetailsStorage: ThoughtDetailsStorage | null = null;
let favoritesStorage: StoreTable<"favorites"> | null = null;
let readingHistoryStorage: StoreTable<"reading-history"> | null = null;
let metadataStorage: MetadataStore | null = null;
let paginationCacheStorage: PaginationCacheStorage | null = null;
let bookmarksStorage: StoreTable<"bookmarks"> | null = null;
let calendarDaysStorage: StoreTable<"calendar-days"> | null = null;
let calendarMarkersStorage: CalendarMarkersStore | null = null;
let calendarIconsStorage: IconCacheStorage | null = null;
let saintIconsStorage: IconCacheStorage | null = null;
let downloadProgressStorage: DownloadProgressStorage | null = null;

/** Ключ в metadata: избранное по умолчанию уже засеяно (в IDB это делает upgrade() в indexedDB.ts) */
const FAVORITES_SEEDED_KEY = "native_favorites_seeded";

/** Нативная БД: контент и данные пользователя. В IDB остаются pagination-cache, thoughts-* и (в браузере) всё остальное. */
function initNativeStorage(): void {
  prayersIndexStorage = new NativeTableStorage<number, ValaamDB["prayers-index"]["value"]>("prayers-index");
  sectionsStorage = new NativeTableStorage<number, ValaamDB["prayer-sections"]["value"]>("prayer-sections");
  prayerDetailsStorage = new NativePrayerDetailsStorage();
  saintsIndexStorage = new NativeTableStorage<number, ValaamDB["saints-index"]["value"]>("saints-index");
  saintDetailsStorage = new NativeTableStorage<number, ValaamDB["saint-details"]["value"]>("saint-details");
  favoritesStorage = new NativeTableStorage<number, ValaamDB["favorites"]["value"]>("favorites");
  readingHistoryStorage = new NativeTableStorage<number, ValaamDB["reading-history"]["value"]>(
    "reading-history",
    ["lastReadAt"]
  );
  metadataStorage = new NativeMetadataStorage();
  bookmarksStorage = new NativeTableStorage<string, ValaamDB["bookmarks"]["value"]>("bookmarks", ["createdAt"]);
  calendarDaysStorage = new NativeTableStorage<string, ValaamDB["calendar-days"]["value"]>("calendar-days");
  calendarMarkersStorage = new NativeCalendarMarkersStorage();
}

async function seedNativeFavorites(): Promise<void> {
  if (!favoritesStorage || !metadataStorage) return;
  if (await metadataStorage.getValue(FAVORITES_SEEDED_KEY)) return;

  if ((await favoritesStorage.getAll()).length === 0) {
    await favoritesStorage.putAll(defaultFavorites as ValaamDB["favorites"]["value"][]);
  }
  await metadataStorage.setValue(FAVORITES_SEEDED_KEY, true);
}

function initIdbStorage(): void {
  prayersIndexStorage = new PrayersIndexStorage();
  sectionsStorage = new SectionsStorage();
  prayerDetailsStorage = new PrayerDetailsStorage();
  saintsIndexStorage = new SaintsIndexStorage();
  saintDetailsStorage = new SaintDetailsStorage();
  favoritesStorage = new FavoritesStorage();
  readingHistoryStorage = new ReadingHistoryStorage();
  metadataStorage = new MetadataStorage();
  bookmarksStorage = new BookmarksStorage();
  calendarDaysStorage = new CalendarDaysStorage();
  calendarMarkersStorage = new CalendarMarkersStorage();
}

async function initStorage() {
  try {
    // IDB нужен всегда: в нём остаются thoughts-*, pagination-cache, а в браузере и всё остальное
    await initDB();
  } catch (error) {
    initStorageError = error as Error;
    throw error;
  }

  thoughtsIndexStorage = new ThoughtsIndexStorage();
  thoughtDetailsStorage = new ThoughtDetailsStorage();
  paginationCacheStorage = new PaginationCacheStorage();
  calendarIconsStorage = new IconCacheStorage(CALENDAR_ICONS_CACHE);
  saintIconsStorage = new IconCacheStorage(SAINT_ICONS_CACHE);
  downloadProgressStorage = new DownloadProgressStorage();

  if (await ensureNativeBridge("db")) {
    initNativeStorage();
    await seedNativeFavorites();
  } else {
    initIdbStorage();
  }
}

export {
  initStorage,
  initStorageError,
  prayersIndexStorage,
  sectionsStorage,
  prayerDetailsStorage,
  saintsIndexStorage,
  saintDetailsStorage,
  thoughtsIndexStorage,
  thoughtDetailsStorage,
  favoritesStorage,
  readingHistoryStorage,
  metadataStorage,
  paginationCacheStorage,
  bookmarksStorage,
  calendarDaysStorage,
  calendarMarkersStorage,
  calendarIconsStorage,
  saintIconsStorage,
  downloadProgressStorage,
};
