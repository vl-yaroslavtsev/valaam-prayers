import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { daysApi } from "@/services/api/DaysApi";
import { prayersApi } from "@/services/api/PrayersApi";
import { saintsApi } from "@/services/api/SaintsApi";
import {
  calendarDaysStorage,
  calendarIconsStorage,
  prayerDetailsStorage,
  saintDetailsStorage,
  saintIconsStorage,
  sectionsStorage,
} from "@/services/storage";
import { getModule } from "@/services/download/modules";
import type { DownloadContext, DownloadModuleId, ModuleDownloadState } from "@/services/download/types";
import { calendarDay, makeNav, prayerDetail, prayerSection, prayerText, resetIndexedDB, saintDetail } from "@/test/helpers";

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
  getCalendarIconSize: () => "s",
  getSaintIconSize: () => "m",
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

    it("download пишет moduleId в prayer-details", async () => {
      await sectionsStorage?.putAll([prayerSection(100, 842)]);
      vi.mocked(prayersApi.getPrayersPage).mockResolvedValue({
        items: [prayerText(1)],
        nav: makeNav(1, 1),
        byteSize: 1,
      });

      await getModule("molitvoslov").download(createCtx("molitvoslov"));

      expect(await prayerDetailsStorage?.get(1)).toMatchObject({ id: 1, moduleId: "molitvoslov" });
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

    it("в dev скачивает через локальный /upload, а в кэш кладёт абсолютный URL", async () => {
      vi.stubEnv("MODE", "development");
      const url = "https://app.valaam.ru/upload/a.jpg?size=1";
      const fetchMock = vi.fn().mockImplementation(() => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      const ctx = createCtx("saintIcons", {
        state: { iconListComplete: true, pendingIconUrls: [url] },
      });
      await getModule("saintIcons").download(ctx);

      expect(fetchMock).toHaveBeenCalledWith("/upload/a.jpg?size=1", expect.any(Object));
      expect(await saintIconsStorage?.hasIcon(url)).toBe(true);
      vi.unstubAllEnvs();
    });

    it("повторяет 502 и сохраняет иконку со следующей попытки", async () => {
      const url = "https://app.valaam.ru/upload/retry.jpg";
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 502 }))
        .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      const ctx = createCtx("saintIcons", {
        state: { iconListComplete: true, pendingIconUrls: [url] },
      });
      await getModule("saintIcons").download(ctx);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(await saintIconsStorage?.hasIcon(url)).toBe(true);
      expect(ctx.state.pendingIconUrls).toEqual([]);
    });

    it("не повторяет ответ 404", async () => {
      const url = "https://app.valaam.ru/upload/missing.jpg";
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
      vi.stubGlobal("fetch", fetchMock);

      const ctx = createCtx("saintIcons", {
        state: { iconListComplete: true, pendingIconUrls: [url] },
      });
      await expect(getModule("saintIcons").download(ctx)).rejects.toThrow("HTTP 404");
      expect(fetchMock).toHaveBeenCalledTimes(1);
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

    it("remove() очищает только кэш своего модуля", async () => {
      const url = "https://app.valaam.ru/icon.png";
      await saintIconsStorage?.putIcon(url, new Blob([new Uint8Array([1])]));
      await calendarIconsStorage?.putIcon(url, new Blob([new Uint8Array([2])]));

      await getModule("saintIcons").remove();

      expect(await saintIconsStorage?.hasIcon(url)).toBe(false);
      expect(await calendarIconsStorage?.hasIcon(url)).toBe(true);
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
      expect(vi.mocked(saintsApi.getSaintsIconsPage).mock.calls[0][0]).toBe("m");
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
      expect(vi.mocked(daysApi.getDaysIconsPage).mock.calls[0][2]).toBe("s");
    });
  });

  describe("календарь", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("1–13 января передаёт в счётчики и списки дней и икон диапазон двух церковных лет", async () => {
      vi.setSystemTime(new Date(2026, 0, 5));
      vi.mocked(daysApi.getDaysCount).mockResolvedValue({ count: 1, size: 10 });
      vi.mocked(daysApi.getDaysIconsCount).mockResolvedValue({ count: 1, size: 10 });
      vi.mocked(daysApi.getDaysPage).mockResolvedValue({ items: [], nav: makeNav(1, 1), byteSize: 1 });
      vi.mocked(daysApi.getDaysIconsPage).mockResolvedValue({ items: [], nav: makeNav(1, 1), byteSize: 1 });

      await getModule("calendar").getSize();
      await getModule("calendarIcons").getSize();
      await getModule("calendar").download(createCtx("calendar"));
      await getModule("calendarIcons").download(createCtx("calendarIcons"));

      expect(vi.mocked(daysApi.getDaysCount).mock.calls[0].slice(0, 2)).toEqual(["20250114", "20270113"]);
      expect(vi.mocked(daysApi.getDaysPage).mock.calls[0].slice(0, 2)).toEqual(["20250114", "20270113"]);
      expect(vi.mocked(daysApi.getDaysIconsCount).mock.calls[0].slice(0, 2)).toEqual(["20250114", "20270113"]);
      expect(vi.mocked(daysApi.getDaysIconsPage).mock.calls[0].slice(0, 2)).toEqual(["20250114", "20270113"]);
    });

    it("с 14 января передаёт диапазон одного церковного года", async () => {
      vi.setSystemTime(new Date(2026, 7, 15));
      vi.mocked(daysApi.getDaysCount).mockResolvedValue({ count: 1, size: 10 });
      const since = new Date("2026-02-01T00:00:00.000Z");

      await getModule("calendar").getSize(since);

      expect(vi.mocked(daysApi.getDaysCount)).toHaveBeenCalledWith("20260114", "20270113", since);
    });

    it("после успешной загрузки удаляет дни старше границы и оставляет границу", async () => {
      vi.setSystemTime(new Date(2026, 7, 15));
      await calendarDaysStorage?.putAll([calendarDay("20231231"), calendarDay("20240101")]);
      vi.mocked(daysApi.getDaysPage).mockResolvedValue({
        items: [calendarDay("20260815")],
        nav: makeNav(1, 1),
        byteSize: 1,
      });

      await getModule("calendar").download(createCtx("calendar"));

      expect(await calendarDaysStorage?.get("20231231")).toBeUndefined();
      expect(await calendarDaysStorage?.get("20240101")).toMatchObject({ code: "20240101" });
      expect(await calendarDaysStorage?.get("20260815")).toMatchObject({ code: "20260815" });
    });

    it("обрыв загрузки не удаляет старые дни", async () => {
      vi.setSystemTime(new Date(2026, 7, 15));
      await calendarDaysStorage?.put(calendarDay("20231231"));
      vi.mocked(daysApi.getDaysPage).mockRejectedValue(new DOMException("Aborted", "AbortError"));

      await expect(getModule("calendar").download(createCtx("calendar"))).rejects.toMatchObject({ name: "AbortError" });

      expect(await calendarDaysStorage?.get("20231231")).toMatchObject({ code: "20231231" });
    });
  });

  describe("remove() секционных модулей", () => {
    async function seedByModule() {
      await prayerDetailsStorage?.putAll([
        prayerDetail(1, "molitvoslov"),
        prayerDetail(2, "molitvoslov"),
        prayerDetail(3, "liturgicalBooks"),
        prayerDetail(4, "spiritualLiterature"),
      ]);
    }

    it("удаляет только записи molitvoslov по индексу by-module", async () => {
      await seedByModule();

      await getModule("molitvoslov").remove();

      expect(await prayerDetailsStorage?.get(1)).toBeUndefined();
      expect(await prayerDetailsStorage?.get(2)).toBeUndefined();
      expect(await prayerDetailsStorage?.get(3)).toMatchObject({ id: 3, moduleId: "liturgicalBooks" });
      expect(await prayerDetailsStorage?.get(4)).toMatchObject({ id: 4, moduleId: "spiritualLiterature" });
    });

    it("удаляет только записи liturgicalBooks по индексу by-module", async () => {
      await seedByModule();

      await getModule("liturgicalBooks").remove();

      expect(await prayerDetailsStorage?.get(3)).toBeUndefined();
      expect(await prayerDetailsStorage?.get(1)).toMatchObject({ id: 1, moduleId: "molitvoslov" });
      expect(await prayerDetailsStorage?.get(2)).toMatchObject({ id: 2, moduleId: "molitvoslov" });
      expect(await prayerDetailsStorage?.get(4)).toMatchObject({ id: 4, moduleId: "spiritualLiterature" });
    });

    it("удаляет только записи spiritualLiterature по индексу by-module", async () => {
      await seedByModule();

      await getModule("spiritualLiterature").remove();

      expect(await prayerDetailsStorage?.get(4)).toBeUndefined();
      expect(await prayerDetailsStorage?.get(1)).toMatchObject({ id: 1, moduleId: "molitvoslov" });
      expect(await prayerDetailsStorage?.get(2)).toMatchObject({ id: 2, moduleId: "molitvoslov" });
      expect(await prayerDetailsStorage?.get(3)).toMatchObject({ id: 3, moduleId: "liturgicalBooks" });
    });
  });
});
