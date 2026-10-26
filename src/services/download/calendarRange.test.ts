import { describe, expect, it } from "vitest";
import { getCalendarDownloadRange, getCalendarRetentionBoundary } from "@/services/download/calendarRange";

describe("диапазон загрузки календаря", () => {
  it("1–13 января качает с 14 января прошлого года по 13 января следующего", () => {
    expect(getCalendarDownloadRange(new Date(2026, 0, 5))).toEqual({
      fromDate: "20250114",
      toDate: "20270113",
    });
    expect(getCalendarDownloadRange(new Date(2026, 0, 1))).toEqual({
      fromDate: "20250114",
      toDate: "20270113",
    });
    expect(getCalendarDownloadRange(new Date(2026, 0, 13))).toEqual({
      fromDate: "20250114",
      toDate: "20270113",
    });
  });

  it("с 14 января качает с 14 января текущего года по 13 января следующего", () => {
    expect(getCalendarDownloadRange(new Date(2026, 0, 14))).toEqual({
      fromDate: "20260114",
      toDate: "20270113",
    });
    expect(getCalendarDownloadRange(new Date(2026, 7, 15))).toEqual({
      fromDate: "20260114",
      toDate: "20270113",
    });
    expect(getCalendarDownloadRange(new Date(2026, 11, 31))).toEqual({
      fromDate: "20260114",
      toDate: "20270113",
    });
  });
});

describe("граница хранения дней календаря", () => {
  it("оставляет текущий год и два предыдущих", () => {
    expect(getCalendarRetentionBoundary(new Date(2026, 7, 15))).toBe("20240101");
    expect(getCalendarRetentionBoundary(new Date(2026, 0, 5))).toBe("20240101");
    expect(getCalendarRetentionBoundary(new Date(2027, 0, 1))).toBe("20250101");
  });
});
