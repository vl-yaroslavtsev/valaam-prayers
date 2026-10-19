import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatLastCheck } from "@/services/download/lastCheck";

describe("formatLastCheck", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 19, 17, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("без проверок", () => {
    expect(formatLastCheck(null)).toBe("Ещё не проверялось");
  });

  it("сегодня", () => {
    expect(formatLastCheck(new Date(2026, 9, 19, 14, 5))).toBe("Последняя проверка: сегодня, 14:05");
  });

  it("вчера", () => {
    expect(formatLastCheck(new Date(2026, 9, 18, 23, 59))).toBe("Последняя проверка: вчера, 23:59");
  });

  it("раньше в этом году без года", () => {
    expect(formatLastCheck(new Date(2026, 2, 3, 8, 0))).toBe("Последняя проверка: 3 марта, 08:00");
  });

  it("в прошлом году с годом", () => {
    expect(formatLastCheck(new Date(2025, 11, 31, 8, 0))).toBe("Последняя проверка: 31 декабря 2025, 08:00");
  });
});
