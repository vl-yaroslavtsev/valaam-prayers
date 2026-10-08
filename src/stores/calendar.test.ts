import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { daysApi } from "@/services/api/DaysApi";
import { calendarDaysStorage, calendarMarkersStorage } from "@/services/storage";
import { useCalendarStore } from "@/stores/calendar";
import { calendarDay } from "@/test/helpers";

vi.mock("@/services/storage", () => ({
  calendarDaysStorage: {
    get: vi.fn(),
    put: vi.fn(),
  },
  calendarMarkersStorage: {
    getSnapshot: vi.fn(),
    saveSnapshot: vi.fn(),
  },
}));

vi.mock("@/services/api/DaysApi", () => ({
  daysApi: {
    getDaysPage: vi.fn(),
    getCalendarMarkers: vi.fn(),
  },
}));

const cachedSnapshot = { min: 1, max: 2, days: { "20260101": "f" } };
const freshSnapshot = { min: 3, max: 4, days: { "20260101": "f", "20260102": null } };

describe("useCalendarStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(calendarDaysStorage!.get).mockResolvedValue(undefined);
    vi.mocked(calendarDaysStorage!.put).mockResolvedValue("20260101");
    vi.mocked(calendarMarkersStorage!.getSnapshot).mockResolvedValue(undefined);
    vi.mocked(calendarMarkersStorage!.saveSnapshot).mockResolvedValue(undefined);
  });

  describe("раскраска дней (markers)", () => {
    it("initStore сначала берёт снимок из кэша, затем обновляет его с сервера и сохраняет", async () => {
      vi.mocked(calendarMarkersStorage!.getSnapshot).mockResolvedValue(cachedSnapshot);
      let resolveFresh!: (snapshot: typeof freshSnapshot) => void;
      vi.mocked(daysApi.getCalendarMarkers).mockReturnValue(
        new Promise((resolve) => {
          resolveFresh = resolve;
        }),
      );
      const store = useCalendarStore();

      await store.initStore();
      expect(store.markers).toEqual(cachedSnapshot);

      resolveFresh(freshSnapshot);
      await vi.waitFor(() => expect(store.markers).toEqual(freshSnapshot));
      expect(calendarMarkersStorage!.saveSnapshot).toHaveBeenCalledWith(freshSnapshot);
      expect(store.markersError).toBeNull();
    });

    it("при ошибке сети остаётся кэш и ошибка не показывается", async () => {
      vi.mocked(calendarMarkersStorage!.getSnapshot).mockResolvedValue(cachedSnapshot);
      vi.mocked(daysApi.getCalendarMarkers).mockRejectedValue(new Error("offline"));
      const store = useCalendarStore();

      await store.initStore();
      await vi.waitFor(() => expect(daysApi.getCalendarMarkers).toHaveBeenCalled());
      await vi.waitFor(() => expect(store.isMarkersLoading).toBe(false));

      expect(store.markers).toEqual(cachedSnapshot);
      expect(store.markersError).toBeNull();
      expect(calendarMarkersStorage!.saveSnapshot).not.toHaveBeenCalled();
    });

    it("без кэша и без сети выставляет markersError, повторная попытка его сбрасывает", async () => {
      vi.mocked(daysApi.getCalendarMarkers).mockRejectedValueOnce(new Error("offline"));
      const store = useCalendarStore();

      await store.refreshMarkers();
      expect(store.markers).toBeNull();
      expect(store.markersError).toBe("offline");

      vi.mocked(daysApi.getCalendarMarkers).mockResolvedValueOnce(freshSnapshot);
      await store.refreshMarkers();
      expect(store.markers).toEqual(freshSnapshot);
      expect(store.markersError).toBeNull();
    });

    it("ошибка записи в кэш не ломает загрузку", async () => {
      vi.mocked(daysApi.getCalendarMarkers).mockResolvedValue(freshSnapshot);
      vi.mocked(calendarMarkersStorage!.saveSnapshot).mockRejectedValue(new Error("quota"));
      const store = useCalendarStore();

      await store.refreshMarkers();

      expect(store.markers).toEqual(freshSnapshot);
      expect(store.markersError).toBeNull();
    });
  });

  it("getDayByCode при наличии кэша не вызывает сеть", async () => {
    const cached = calendarDay("20260101");
    vi.mocked(calendarDaysStorage!.get).mockResolvedValue(cached);

    const result = await useCalendarStore().getDayByCode("20260101");

    expect(result).toEqual(cached);
    expect(daysApi.getDaysPage).not.toHaveBeenCalled();
  });

  it("getDayByCode при отсутствии кэша идёт в сеть и не пишет в IndexedDB", async () => {
    const fromNetwork = calendarDay("20260102");
    vi.mocked(daysApi.getDaysPage).mockResolvedValue({
      items: [fromNetwork],
      nav: { page_count: 1, page_num: 1, page_size: 1, record_count: 1, nav_num: 1 },
      byteSize: 1,
    });

    const result = await useCalendarStore().getDayByCode("20260102");

    expect(result).toEqual(fromNetwork);
    expect(daysApi.getDaysPage).toHaveBeenCalledWith("20260102", "20260102", 1, 1);
    expect(calendarDaysStorage!.put).not.toHaveBeenCalled();
  });
});
