import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { daysApi } from "@/services/api/DaysApi";
import { calendarDaysStorage } from "@/services/storage";
import { useCalendarStore } from "@/stores/calendar";
import { calendarDay } from "@/test/helpers";

vi.mock("@/services/storage", () => ({
  calendarDaysStorage: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("@/services/api/DaysApi", () => ({
  daysApi: {
    getDaysPage: vi.fn(),
  },
}));

describe("useCalendarStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(calendarDaysStorage!.get).mockResolvedValue(undefined);
    vi.mocked(calendarDaysStorage!.put).mockResolvedValue("20260101");
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
