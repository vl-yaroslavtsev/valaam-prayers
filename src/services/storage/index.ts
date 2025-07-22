import { initDB } from "./indexedDB";
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

let initStorageError: Error | null = null;

let prayersIndexStorage: PrayersIndexStorage | null = null;
let sectionsStorage: SectionsStorage | null = null;
let prayerDetailsStorage: PrayerDetailsStorage | null = null;
let saintsIndexStorage: SaintsIndexStorage | null = null;
let saintDetailsStorage: SaintDetailsStorage | null = null;
let thoughtsIndexStorage: ThoughtsIndexStorage | null = null;
let thoughtDetailsStorage: ThoughtDetailsStorage | null = null;
let favoritesStorage: FavoritesStorage | null = null;
let readingHistoryStorage: ReadingHistoryStorage | null = null;
let metadataStorage: MetadataStorage | null = null;

async function initStorage() {
  try {
    await initDB();
  } catch (error) {
    initStorageError = error as Error;
    throw error;
  }

  prayersIndexStorage = new PrayersIndexStorage();
  sectionsStorage = new SectionsStorage();
  prayerDetailsStorage = new PrayerDetailsStorage();
  saintsIndexStorage = new SaintsIndexStorage();
  saintDetailsStorage = new SaintDetailsStorage();
  thoughtsIndexStorage = new ThoughtsIndexStorage();
  thoughtDetailsStorage = new ThoughtDetailsStorage();
  favoritesStorage = new FavoritesStorage();
  readingHistoryStorage = new ReadingHistoryStorage();
  metadataStorage = new MetadataStorage();
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
};
