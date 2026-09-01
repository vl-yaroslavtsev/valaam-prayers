import type { ApiNav } from "@/services/api/types";
import { daysApi } from "@/services/api/DaysApi";
import type { CalendarDayApiElement } from "@/services/api/DaysApi";
import { prayersApi } from "@/services/api/PrayersApi";
import type { PrayerTextApiResponse } from "@/services/api/PrayersApi";
import { saintsApi } from "@/services/api/SaintsApi";
import type { SaintDetailApiElement } from "@/services/api/SaintsApi";
import {
  calendarDaysStorage,
  calendarIconsStorage,
  prayerDetailsStorage,
  prayersIndexStorage,
  saintDetailsStorage,
  saintIconsStorage,
  sectionsStorage,
} from "@/services/storage";
import { getIconSize } from "@/services/download/device";
import type { DownloadContext, DownloadModule, DownloadModuleId } from "@/services/download/types";

const MOLITVOSLOV_ROOT_SECTION_ID = 842;
const LITURGICAL_BOOKS_SECTION_ID = 937;
const SPIRITUAL_LITERATURE_SECTION_ID = 976;

const PAGE_SIZE = 100;
const MEDIA_BASE_URL = "https://app.valaam.ru";

function toAbsoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${MEDIA_BASE_URL}${path}`;
}

function getCurrentYearRange(): { fromDate: string; toDate: string } {
  const year = new Date().getFullYear();
  return { fromDate: `${year}0101`, toDate: `${year}1231` };
}

/**
 * Разделы 1-го уровня раздела 842 (Молитвослов), кроме 937 (Богослужебные книги).
 * Вычисляется динамически по данным, уже загруженным основной синхронизацией молитв
 * (usePrayersStore/sectionsStorage), а не хардкодится.
 */
async function getMolitvoslovSectionIds(): Promise<number[]> {
  const sections = (await sectionsStorage?.getAll()) ?? [];
  return sections
    .filter((section) => section.parent === MOLITVOSLOV_ROOT_SECTION_ID && section.id !== LITURGICAL_BOOKS_SECTION_ID)
    .map((section) => section.id);
}

/**
 * Удаляет из prayer-details все элементы, принадлежащие любому из переданных разделов.
 * prayers-index/prayer-sections (общий навигационный индекс приложения) не трогаются.
 */
async function removePrayerSectionsData(sectionIds: number[]): Promise<void> {
  if (sectionIds.length === 0) return;
  const elements = (await prayersIndexStorage?.getAll()) ?? [];
  const idsToRemove = elements
    .filter((element) => element.parents.some((parentId) => sectionIds.includes(parentId)))
    .map((element) => element.id);
  await Promise.all(idsToRemove.map((id) => prayerDetailsStorage?.delete(id)));
}

type PageFetcher<T> = (
  page: number,
  pageSize: number,
  since: Date | undefined,
  signal: AbortSignal,
  onBytes: (bytes: number) => void
) => Promise<{ items: T[]; nav: ApiNav }>;

interface ListModuleConfig<T> {
  id: DownloadModuleId;
  getCount: (since?: Date) => Promise<number>;
  fetchPage: PageFetcher<T>;
  saveItems: (items: T[]) => Promise<void>;
  remove: () => Promise<void>;
}

/**
 * Модуль на основе одного постраничного списка (Календарь, Святые).
 */
function createListModule<T>(config: ListModuleConfig<T>): DownloadModule {
  return {
    id: config.id,
    getSize: config.getCount,
    async download(ctx: DownloadContext) {
      let page = (ctx.state.listState?.currentPage ?? 0) + 1;
      let totalPages = ctx.state.listState?.totalPages ?? Infinity;

      while (page <= totalPages) {
        if (ctx.signal.aborted) throw new DOMException("Aborted", "AbortError");
        const { items, nav } = await config.fetchPage(page, PAGE_SIZE, ctx.since, ctx.signal, ctx.onBytes);
        totalPages = nav.page_count;
        await config.saveItems(items);
        await ctx.checkpoint({ listState: { currentPage: page, totalPages } });
        page++;
      }
    },
    remove: config.remove,
  };
}

interface SectionsModuleConfig {
  id: DownloadModuleId;
  getSectionIds: () => Promise<number[]>;
  getSectionCount: (sectionId: number, since?: Date) => Promise<number>;
  fetchSectionPage: (
    sectionId: number,
    page: number,
    pageSize: number,
    since: Date | undefined,
    signal: AbortSignal,
    onBytes: (bytes: number) => void
  ) => Promise<{ items: PrayerTextApiResponse[]; nav: ApiNav }>;
  saveItems: (items: PrayerTextApiResponse[]) => Promise<void>;
  removeBySectionIds: (sectionIds: number[]) => Promise<void>;
}

/**
 * Модуль на основе нескольких разделов молитв (Молитвослов - динамический список разделов;
 * Богослужебные книги/Духовная литература - фиксированный один раздел).
 */
function createPrayerSectionsModule(config: SectionsModuleConfig): DownloadModule {
  return {
    id: config.id,
    async getSize(since) {
      const sectionIds = await config.getSectionIds();
      const sizes = await Promise.all(sectionIds.map((id) => config.getSectionCount(id, since)));
      return sizes.reduce((sum, size) => sum + size, 0);
    },
    async download(ctx: DownloadContext) {
      const sectionIds = await config.getSectionIds();
      let sectionStates = ctx.state.sectionStates;

      if (!sectionStates || sectionStates.length !== sectionIds.length) {
        sectionStates = sectionIds.map((sectionId) => ({ sectionId, currentPage: 0, totalPages: null }));
        await ctx.checkpoint({ sectionStates, currentSectionIndex: 0 });
      }

      for (let sectionIndex = ctx.state.currentSectionIndex ?? 0; sectionIndex < sectionStates.length; sectionIndex++) {
        const sectionState = sectionStates[sectionIndex];
        let page = sectionState.currentPage + 1;
        let totalPages = sectionState.totalPages ?? Infinity;

        while (page <= totalPages) {
          if (ctx.signal.aborted) throw new DOMException("Aborted", "AbortError");
          const { items, nav } = await config.fetchSectionPage(
            sectionState.sectionId,
            page,
            PAGE_SIZE,
            ctx.since,
            ctx.signal,
            ctx.onBytes
          );
          totalPages = nav.page_count;
          await config.saveItems(items);

          sectionState.currentPage = page;
          sectionState.totalPages = totalPages;
          await ctx.checkpoint({ sectionStates: [...sectionStates], currentSectionIndex: sectionIndex });
          page++;
        }
      }
    },
    async remove() {
      const sectionIds = await config.getSectionIds();
      await config.removeBySectionIds(sectionIds);
    },
  };
}

interface IconModuleConfig {
  id: DownloadModuleId;
  getCount: (since?: Date) => Promise<number>;
  fetchIconListPage: (
    page: number,
    pageSize: number,
    since: Date | undefined,
    signal: AbortSignal,
    onBytes: (bytes: number) => void
  ) => Promise<{ urls: string[]; nav: ApiNav }>;
  getStorage: () => { putIcon: (url: string, blob: Blob) => Promise<void>; hasIcon: (url: string) => Promise<boolean>; clear: () => Promise<void> };
}

/**
 * Двухфазный модуль скачивания иконок (Иконы календаря, Иконы святых):
 * фаза A - постранично собираем список URL, фаза B - скачиваем сами файлы.
 */
function createIconModule(config: IconModuleConfig): DownloadModule {
  return {
    id: config.id,
    getSize: config.getCount,
    async download(ctx: DownloadContext) {
      if (!ctx.state.iconListComplete) {
        let page = (ctx.state.iconListState?.currentPage ?? 0) + 1;
        let totalPages = ctx.state.iconListState?.totalPages ?? Infinity;
        const collected = new Set(ctx.state.pendingIconUrls ?? []);

        while (page <= totalPages) {
          if (ctx.signal.aborted) throw new DOMException("Aborted", "AbortError");
          const { urls, nav } = await config.fetchIconListPage(page, PAGE_SIZE, ctx.since, ctx.signal, ctx.onBytes);
          totalPages = nav.page_count;
          for (const url of urls) collected.add(url);

          await ctx.checkpoint({
            iconListState: { currentPage: page, totalPages },
            pendingIconUrls: Array.from(collected),
            totalIconUrls: collected.size,
          });
          page++;
        }

        await ctx.checkpoint({ iconListComplete: true });
      }

      const storage = config.getStorage();
      const pending = [...(ctx.state.pendingIconUrls ?? [])];

      while (pending.length > 0) {
        if (ctx.signal.aborted) throw new DOMException("Aborted", "AbortError");
        const url = pending[0];

        const alreadyDownloaded = await storage.hasIcon(url);
        if (!alreadyDownloaded) {
          const response = await fetch(url, { signal: ctx.signal });
          if (!response.ok) {
            throw new Error(`Failed to download icon ${url}: HTTP ${response.status}`);
          }
          const blob = await response.blob();
          await storage.putIcon(url, blob);
          ctx.onBytes(blob.size);
        }

        pending.shift();
        await ctx.checkpoint({ pendingIconUrls: [...pending] });
      }
    },
    async remove() {
      await config.getStorage().clear();
    },
  };
}

const calendarModule = createListModule<CalendarDayApiElement>({
  id: "calendar",
  getCount: async (since) => {
    const { fromDate, toDate } = getCurrentYearRange();
    const { size } = await daysApi.getDaysCount(fromDate, toDate, since);
    return size;
  },
  fetchPage: async (page, pageSize, since, signal, onBytes) => {
    const { fromDate, toDate } = getCurrentYearRange();
    return daysApi.getDaysPage(fromDate, toDate, page, pageSize, { since, signal, onBytes });
  },
  saveItems: async (items) => {
    await calendarDaysStorage?.putAll(items);
  },
  remove: async () => {
    await calendarDaysStorage?.clear();
  },
});

const calendarIconsModule = createIconModule({
  id: "calendarIcons",
  getCount: async (since) => {
    const { fromDate, toDate } = getCurrentYearRange();
    const { size } = await daysApi.getDaysIconsCount(fromDate, toDate, getIconSize(), since);
    return size;
  },
  fetchIconListPage: async (page, pageSize, since, signal, onBytes) => {
    const { fromDate, toDate } = getCurrentYearRange();
    const { items, nav } = await daysApi.getDaysIconsPage(fromDate, toDate, getIconSize(), page, pageSize, {
      since,
      signal,
      onBytes,
    });
    const urls: string[] = [];
    for (const item of items) {
      if (item.url) urls.push(toAbsoluteUrl(item.url));
      if (item.prayers_url) urls.push(toAbsoluteUrl(item.prayers_url));
    }
    return { urls, nav };
  },
  getStorage: () => calendarIconsStorage!,
});

const saintsModule = createListModule<SaintDetailApiElement>({
  id: "saints",
  getCount: async (since) => (await saintsApi.getSaintsCount(since)).size,
  fetchPage: (page, pageSize, since, signal, onBytes) => saintsApi.getSaintsPage(page, pageSize, { since, signal, onBytes }),
  saveItems: async (items) => {
    await saintDetailsStorage?.putAll(items);
  },
  remove: async () => {
    await saintDetailsStorage?.clear();
  },
});

const saintIconsModule = createIconModule({
  id: "saintIcons",
  getCount: async (since) => (await saintsApi.getSaintsIconsCount(getIconSize(), since)).size,
  fetchIconListPage: async (page, pageSize, since, signal, onBytes) => {
    const { items, nav } = await saintsApi.getSaintsIconsPage(getIconSize(), page, pageSize, { since, signal, onBytes });
    const urls = items.filter((item) => item.url).map((item) => toAbsoluteUrl(item.url));
    return { urls, nav };
  },
  getStorage: () => saintIconsStorage!,
});

const liturgicalBooksModule = createPrayerSectionsModule({
  id: "liturgicalBooks",
  getSectionIds: async () => [LITURGICAL_BOOKS_SECTION_ID],
  getSectionCount: async (sectionId, since) => (await prayersApi.getPrayersCount(sectionId, since)).size,
  fetchSectionPage: (sectionId, page, pageSize, since, signal, onBytes) =>
    prayersApi.getPrayersPage(sectionId, page, pageSize, { since, signal, onBytes }),
  saveItems: async (items) => {
    await prayerDetailsStorage?.putAll(items);
  },
  removeBySectionIds: removePrayerSectionsData,
});

const spiritualLiteratureModule = createPrayerSectionsModule({
  id: "spiritualLiterature",
  getSectionIds: async () => [SPIRITUAL_LITERATURE_SECTION_ID],
  getSectionCount: async (sectionId, since) => (await prayersApi.getPrayersCount(sectionId, since)).size,
  fetchSectionPage: (sectionId, page, pageSize, since, signal, onBytes) =>
    prayersApi.getPrayersPage(sectionId, page, pageSize, { since, signal, onBytes }),
  saveItems: async (items) => {
    await prayerDetailsStorage?.putAll(items);
  },
  removeBySectionIds: removePrayerSectionsData,
});

const molitvoslovModule = createPrayerSectionsModule({
  id: "molitvoslov",
  getSectionIds: getMolitvoslovSectionIds,
  getSectionCount: async (sectionId, since) => (await prayersApi.getPrayersCount(sectionId, since)).size,
  fetchSectionPage: (sectionId, page, pageSize, since, signal, onBytes) =>
    prayersApi.getPrayersPage(sectionId, page, pageSize, { since, signal, onBytes }),
  saveItems: async (items) => {
    await prayerDetailsStorage?.putAll(items);
  },
  removeBySectionIds: removePrayerSectionsData,
});

const MODULES: Record<DownloadModuleId, DownloadModule> = {
  calendar: calendarModule,
  calendarIcons: calendarIconsModule,
  molitvoslov: molitvoslovModule,
  spiritualLiterature: spiritualLiteratureModule,
  liturgicalBooks: liturgicalBooksModule,
  saints: saintsModule,
  saintIcons: saintIconsModule,
};

export function getModule(moduleId: DownloadModuleId): DownloadModule {
  return MODULES[moduleId];
}
