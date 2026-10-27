import { describe, expect, it } from "vitest";
import { getCalendarDownloadRange, getCalendarRetentionBoundary, hasCalendarRangeGrown } from "@/services/download/calendarRange";

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

describe("рост диапазона загрузки календаря", () => {
  it("не растёт в течение церковного года", () => {
    expect(hasCalendarRangeGrown(new Date(2026, 1, 1), new Date(2026, 9, 27))).toBe(false);
    expect(hasCalendarRangeGrown(new Date(2026, 9, 27), new Date(2026, 11, 31))).toBe(false);
  });

  it("растёт 1 января, когда в диапазон входит следующий церковный год", () => {
    expect(hasCalendarRangeGrown(new Date(2026, 11, 31), new Date(2027, 0, 5))).toBe(true);
    expect(hasCalendarRangeGrown(new Date(2026, 9, 27), new Date(2027, 0, 1))).toBe(true);
  });

  it("не растёт 14 января: диапазон только сужается слева", () => {
    expect(hasCalendarRangeGrown(new Date(2027, 0, 5), new Date(2027, 0, 14))).toBe(false);
  });

  it("растёт при пропущенной зиме: последняя синхронизация в прошлом церковном году", () => {
    expect(hasCalendarRangeGrown(new Date(2026, 5, 1), new Date(2027, 2, 1))).toBe(true);
  });
});

describe("граница хранения дней календаря", () => {
  it("оставляет текущий год и два предыдущих", () => {
    expect(getCalendarRetentionBoundary(new Date(2026, 7, 15))).toBe("20240101");
    expect(getCalendarRetentionBoundary(new Date(2026, 0, 5))).toBe("20240101");
    expect(getCalendarRetentionBoundary(new Date(2027, 0, 1))).toBe("20250101");
  });
});
