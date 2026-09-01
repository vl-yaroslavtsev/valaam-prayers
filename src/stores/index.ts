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
import { useDownloadsStore } from './downloads';
import { downloadManager } from '@/services/download/DownloadManager';
import { startAutoUpdate } from '@/services/download/AutoUpdate';

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
export * from "./downloads";

export async function initStores() {
  await initStorage();

  const settingsStore = useSettingsStore();
  const stores = [
    useCalendarStore(),
    usePrayersStore(),
    useSaintsStore(),
    useThoughtsStore(),
    useFavoritesStore(),
    useReadingHistoryStore(),
    settingsStore,
    useBookmarksStore(),
    useDownloadsStore(),
  ]

  await Promise.all(stores.map(store => store.initStore()));

  void downloadManager.resumeInterrupted();
  if (settingsStore.isAutoUpdateOfflineDataEnabled) {
    startAutoUpdate();
  }
}