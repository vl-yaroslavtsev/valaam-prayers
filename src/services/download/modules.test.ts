import { beforeEach, describe, expect, it, vi } from "vitest";
import { daysApi } from "@/services/api/DaysApi";
import { prayersApi } from "@/services/api/PrayersApi";
import { saintsApi } from "@/services/api/SaintsApi";
import {
  prayerDetailsStorage,
  prayersIndexStorage,
  saintDetailsStorage,
  saintIconsStorage,
  sectionsStorage,
} from "@/services/storage";
import { getModule } from "@/services/download/modules";
import type { DownloadContext, DownloadModuleId, ModuleDownloadState } from "@/services/download/types";
import { makeNav, prayerElement, prayerSection, prayerText, resetIndexedDB, saintDetail } from "@/test/helpers";

vi.mock("@/services/api/DaysApi", () => ({
  daysApi: {
    getDaysCount: vi.fn(),
    getDaysPage: vi.fn(),
    getDaysIconsCount: vi.fn(),
    getDaysIconsPage: vi.fn(),
  },
}));

vi.mock("@/services/api/PrayersApi", () => ({
  prayersApi: {
    getPrayersCount: vi.fn(),
    getPrayersPage: vi.fn(),
  },
}));

vi.mock("@/services/api/SaintsApi", () => ({
  saintsApi: {
    getSaintsCount: vi.fn(),
    getSaintsPage: vi.fn(),
    getSaintsIconsCount: vi.fn(),
    getSaintsIconsPage: vi.fn(),
  },
}));

vi.mock("@/services/download/device", () => ({
  getIconSize: () => "s",
}));

function createCtx(
  moduleId: DownloadModuleId,
  options: { signal?: AbortSignal; state?: Partial<ModuleDownloadState> } = {},
): DownloadContext {
  const state: ModuleDownloadState = {
    moduleId,
    status: "downloading",
    totalBytes: 0,
    downloadedBytes: 0,
    updatedAt: Date.now(),
    ...options.state,
  };
  return {
    signal: options.signal ?? new AbortController().signal,
    state,
    onBytes: vi.fn(),
    checkpoint: vi.fn(async (patch) => {
      Object.assign(state, patch);
    }),
  };
}

describe("download modules", () => {
  beforeEach(async () => {
    await resetIndexedDB();
  });

  describe("list-модуль (saints)", () => {
    it("останавливается на page > totalPages и чекпоинтит currentPage", async () => {
      vi.mocked(saintsApi.getSaintsPage).mockImplementation(async (page) => ({
        items: [saintDetail(page)],
        nav: makeNav(2, page),
        byteSize: 10,
      }));

      const ctx = createCtx("saints");
      await getModule("saints").download(ctx);

      expect(vi.mocked(saintsApi.getSaintsPage).mock.calls.map((call) => call[0])).toEqual([1, 2]);
      expect(ctx.state.listState).toEqual({ currentPage: 2, totalPages: 2 });
      expect(await saintDetailsStorage?.get(2)).toMatchObject({ id: 2 });
    });

    it("резюмирует с listState.currentPage, а не с нуля", async () => {
      vi.mocked(saintsApi.getSaintsPage).mockImplementation(async (page) => ({
        items: [saintDetail(page)],
        nav: makeNav(3, page),
        byteSize: 10,
      }));

      const ctx = createCtx("saints", {
        state: { listState: { currentPage: 1, totalPages: 3 } },
      });
      await getModule("saints").download(ctx);

      expect(vi.mocked(saintsApi.getSaintsPage).mock.calls.map((call) => call[0])).toEqual([2, 3]);
    });

    it("при AbortSignal.abort() посреди цикла выбрасывает AbortError и не делает следующий запрос", async () => {
      const controller = new AbortController();
      vi.mocked(saintsApi.getSaintsPage).mockImplementation(async () => {
        controller.abort();
        return { items: [saintDetail(1)], nav: makeNav(5, 1), byteSize: 10 };
      });

      const ctx = createCtx("saints", { signal: controller.signal });
      await expect(getModule("saints").download(ctx)).rejects.toMatchObject({ name: "AbortError" });
      expect(saintsApi.getSaintsPage).toHaveBeenCalledTimes(1);
    });
  });

  describe("molitvoslov", () => {
    it("sectionIds = дети раздела 842 минус 937", async () => {
      await sectionsStorage?.putAll([
        prayerSection(842, null),
        prayerSection(100, 842),
        prayerSection(101, 842),
        prayerSection(937, 842),
        prayerSection(200, 100),
      ]);
      vi.mocked(prayersApi.getPrayersCount).mockResolvedValue({ count: 1, size: 10 });

      await getModule("molitvoslov").getSize();

      const sectionIds = vi.mocked(prayersApi.getPrayersCount).mock.calls.map((call) => call[0]);
      expect(sectionIds.sort()).toEqual([100, 101]);
    });
  });

  describe("createIconModule", () => {
    it("не повторяет фазу A при iconListComplete === true", async () => {
      const ctx = createCtx("saintIcons", {
        state: { iconListComplete: true, pendingIconUrls: [] },
      });

      await getModule("saintIcons").download(ctx);

      expect(saintsApi.getSaintsIconsPage).not.toHaveBeenCalled();
    });

    it("не скачивает URL, для которых hasIcon === true", async () => {
      const url = "https://app.valaam.ru/already.png";
      await saintIconsStorage?.putIcon(url, new Blob([new Uint8Array([1, 2, 3])]));
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const ctx = createCtx("saintIcons", {
        state: { iconListComplete: true, pendingIconUrls: [url] },
      });
      await getModule("saintIcons").download(ctx);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(ctx.state.pendingIconUrls).toEqual([]);
    });

    it("дедуплицирует URL через Set на фазе A", async () => {
      vi.mocked(saintsApi.getSaintsIconsPage).mockResolvedValue({
        items: [
          { id: 1, url: "/icon.png" },
          { id: 2, url: "/icon.png" },
        ],
        nav: makeNav(1, 1),
        byteSize: 1,
      });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(() => new Response(new Uint8Array([1, 2, 3]), { status: 200 })),
      );

      const ctx = createCtx("saintIcons");
      await getModule("saintIcons").download(ctx);

      const pendingCheckpoints = vi
        .mocked(ctx.checkpoint)
        .mock.calls.map(([patch]) => patch.pendingIconUrls)
        .filter(Boolean);
      expect(pendingCheckpoints[0]).toEqual(["https://app.valaam.ru/icon.png"]);
    });

    it("для calendarIcons собирает url и prayers_url", async () => {
      vi.mocked(daysApi.getDaysIconsPage).mockResolvedValue({
        items: [{ id: 1, code: "20260101", url: "/day.png", prayers_url: "/prayer.png" }],
        nav: makeNav(1, 1),
        byteSize: 1,
      });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(() => new Response(new Uint8Array([1]), { status: 200 })),
      );

      const ctx = createCtx("calendarIcons");
      await getModule("calendarIcons").download(ctx);

      expect(ctx.state.pendingIconUrls).toEqual([]);
      expect(ctx.state.totalIconUrls).toBe(2);
    });
  });

  describe("remove() секционных модулей", () => {
    async function seedNestedTree() {
      await sectionsStorage?.putAll([
        prayerSection(842, null),
        prayerSection(100, 842),
        prayerSection(200, 100),
        prayerSection(937, 842),
        prayerSection(300, 937),
        prayerSection(976, null),
        prayerSection(400, 976),
      ]);
      await prayersIndexStorage?.putAll([
        prayerElement(1, [200]),
        prayerElement(2, [100]),
        prayerElement(3, [300]),
        prayerElement(4, [400]),
      ]);
      await prayerDetailsStorage?.putAll([prayerText(1), prayerText(2), prayerText(3), prayerText(4)]);
    }

    it("удаляет элементы молитвослова на любой глубине, не трогая книги и литературу", async () => {
      await seedNestedTree();

      await getModule("molitvoslov").remove();

      expect(await prayerDetailsStorage?.get(1)).toBeUndefined();
      expect(await prayerDetailsStorage?.get(2)).toBeUndefined();
      expect(await prayerDetailsStorage?.get(3)).toMatchObject({ id: 3 });
      expect(await prayerDetailsStorage?.get(4)).toMatchObject({ id: 4 });
    });

    it("удаляет вложенные элементы богослужебных книг, не трогая молитвослов", async () => {
      await seedNestedTree();

      await getModule("liturgicalBooks").remove();

      expect(await prayerDetailsStorage?.get(3)).toBeUndefined();
      expect(await prayerDetailsStorage?.get(1)).toMatchObject({ id: 1 });
      expect(await prayerDetailsStorage?.get(2)).toMatchObject({ id: 2 });
      expect(await prayerDetailsStorage?.get(4)).toMatchObject({ id: 4 });
    });

    it("удаляет вложенные элементы духовной литературы, не трогая молитвослов", async () => {
      await seedNestedTree();

      await getModule("spiritualLiterature").remove();

      expect(await prayerDetailsStorage?.get(4)).toBeUndefined();
      expect(await prayerDetailsStorage?.get(1)).toMatchObject({ id: 1 });
      expect(await prayerDetailsStorage?.get(2)).toMatchObject({ id: 2 });
      expect(await prayerDetailsStorage?.get(3)).toMatchObject({ id: 3 });
    });
  });
});
