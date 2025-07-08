import { createPinia } from 'pinia'
import { initStorage } from '../services/storage';
import { useCalendarStore } from './calendar';
import { usePrayersStore } from './prayers';
import { useSaintsStore } from './saints';
import { useThoughtsStore } from './thoughts';
import { useFavoritesStore } from './favorites';
import { useReadingHistoryStore } from './readingHistory';
import { useSettingsStore } from './settings';

export const pinia = createPinia()

export * from "./calendar";
export * from "./prayers";
export * from "./saints";
export * from "./thoughts";
export * from "./favorites";
export * from "./readingHistory";
export * from "./settings";
export * from "./components"; 

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
  ]

  await Promise.all(stores.map(store => store.initStore()));
}