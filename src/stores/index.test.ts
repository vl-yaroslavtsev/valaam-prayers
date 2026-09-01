import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { initStorage } from "@/services/storage";
import { downloadManager } from "@/services/download/DownloadManager";
import { startAutoUpdate } from "@/services/download/AutoUpdate";
import { initStores } from "@/stores/index";

/**
 * stores/components.ts — реестр ссылок на смонтированные Vue-компоненты
 * (framework7 UI), не бизнес-логика. Unit-тестами не покрываем.
 */

const { mocks } = vi.hoisted(() => ({
  mocks: {
    initStorage: vi.fn().mockResolvedValue(undefined),
    resumeInterrupted: vi.fn(),
    startAutoUpdate: vi.fn(),
    initStore: vi.fn().mockResolvedValue(undefined),
    isAutoUpdateOfflineDataEnabled: true,
  },
}));

vi.mock("@/services/storage", () => ({
  initStorage: mocks.initStorage,
}));

vi.mock("@/services/download/DownloadManager", () => ({
  downloadManager: {
    resumeInterrupted: mocks.resumeInterrupted,
  },
}));

vi.mock("@/services/download/AutoUpdate", () => ({
  startAutoUpdate: mocks.startAutoUpdate,
}));

vi.mock("@/stores/calendar", () => ({
  useCalendarStore: () => ({ initStore: mocks.initStore }),
}));
vi.mock("@/stores/prayers", () => ({
  usePrayersStore: () => ({ initStore: mocks.initStore }),
}));
vi.mock("@/stores/saints", () => ({
  useSaintsStore: () => ({ initStore: mocks.initStore }),
}));
vi.mock("@/stores/thoughts", () => ({
  useThoughtsStore: () => ({ initStore: mocks.initStore }),
}));
vi.mock("@/stores/favorites", () => ({
  useFavoritesStore: () => ({ initStore: mocks.initStore }),
}));
vi.mock("@/stores/readingHistory", () => ({
  useReadingHistoryStore: () => ({ initStore: mocks.initStore }),
}));
vi.mock("@/stores/settings", () => ({
  useSettingsStore: () => ({
    initStore: mocks.initStore,
    get isAutoUpdateOfflineDataEnabled() {
      return mocks.isAutoUpdateOfflineDataEnabled;
    },
  }),
}));
vi.mock("@/stores/bookmarks", () => ({
  useBookmarksStore: () => ({ initStore: mocks.initStore }),
}));
vi.mock("@/stores/downloads", () => ({
  useDownloadsStore: () => ({ initStore: mocks.initStore }),
}));

describe("initStores", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mocks.isAutoUpdateOfflineDataEnabled = true;
    mocks.initStore.mockClear();
    mocks.resumeInterrupted.mockClear();
    mocks.startAutoUpdate.mockClear();
  });

  it("вызывает initStore у всех store, resumeInterrupted всегда, startAutoUpdate только если флаг включён", async () => {
    await initStores();

    expect(initStorage).toHaveBeenCalled();
    expect(mocks.initStore).toHaveBeenCalledTimes(9);
    expect(downloadManager.resumeInterrupted).toHaveBeenCalled();
    expect(startAutoUpdate).toHaveBeenCalled();
  });

  it("не запускает startAutoUpdate если isAutoUpdateOfflineDataEnabled === false", async () => {
    mocks.isAutoUpdateOfflineDataEnabled = false;

    await initStores();

    expect(downloadManager.resumeInterrupted).toHaveBeenCalled();
    expect(startAutoUpdate).not.toHaveBeenCalled();
  });
});
