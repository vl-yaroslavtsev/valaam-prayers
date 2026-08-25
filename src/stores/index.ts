import { createPinia } from 'pinia'
import { initStorage } from '../services/storage';
import { useCalendarStore } from './calendar';
import { usePrayersStore } from './prayers';
import { useSaintsStore } from './saints';
import { useThoughtsStore } from './thoughts';
import { useFavoritesStore } from './favorites';
import { useReadingHistoryStore } from './readingHistory';
import { useSettingsStore } from './settings';
import { useBookmarksStore } from './bookmarks';

export const pinia = createPinia()

export * from "./calendar";
export * from "./prayers";
export * from "./saints";
export * from "./thoughts";
export * from "./favorites";
export * from "./readingHistory";
export * from "./settings";
export * from "./components";
export * from "./bookmarks";

export async function initStores() {
  await initStorage();

  const stores = [
    useCalendarStore(),
    usePrayersStore(),
    useSaintsStore(),
    useThoughtsStore(),
    useFavoritesStore(),
    useReadingHistoryStore(),
    useSettingsStore(),
    useBookmarksStore(),
  ]

  await Promise.all(stores.map(store => store.initStore()));
}