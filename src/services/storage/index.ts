import { initDB } from "./indexedDB";
import { FavoritesStorage } from "./FavoritesStorage";
import { PrayersStorage } from "./PrayersStorage";
import { SectionsStorage } from "./SectionsStorage";
import { PrayerTextsStorage } from "./PrayerTextsStorage";
import { ReadingHistoryStorage } from "./ReadingHistoryStorage";

let initStorageError: Error | null = null;

let prayersStorage: PrayersStorage | null = null;
let sectionsStorage: SectionsStorage | null = null;
let prayerTextsStorage: PrayerTextsStorage | null = null;
let favoritesStorage: FavoritesStorage | null = null;
let readingHistoryStorage: ReadingHistoryStorage | null = null;

async function initStorage() {
  try {
    await initDB();
  } catch (error) {
    initStorageError = error as Error;
    throw error;
  }

  prayersStorage = new PrayersStorage();
  sectionsStorage = new SectionsStorage();
  prayerTextsStorage = new PrayerTextsStorage();
  favoritesStorage = new FavoritesStorage();
  readingHistoryStorage = new ReadingHistoryStorage();
}

export {
  initStorage,
  initStorageError,
  prayersStorage,
  sectionsStorage,
  prayerTextsStorage,
  favoritesStorage,
  readingHistoryStorage,
};
