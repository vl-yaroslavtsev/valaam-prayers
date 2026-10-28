import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatLastReadAt } from "@/components/formatLastReadAt";

describe("formatLastReadAt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 19, 17, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("сегодня со временем", () => {
    expect(formatLastReadAt(new Date(2026, 9, 19, 23, 20))).toBe("Сегодня в 23:20");
  });

  it("вчера со временем", () => {
    expect(formatLastReadAt(new Date(2026, 9, 18, 13, 50))).toBe("Вчера в 13:50");
  });

  it("вчера на стыке года", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 9, 0, 0));
    expect(formatLastReadAt(new Date(2025, 11, 31, 23, 20))).toBe("Вчера в 23:20");
  });

  it("раньше в этом году без года", () => {
    expect(formatLastReadAt(new Date(2026, 9, 17, 8, 0))).toBe("17 октября в 08:00");
  });

  it("в прошлом году с годом", () => {
    expect(formatLastReadAt(new Date(2025, 9, 26, 8, 0))).toBe("26 октября 2025 в 08:00");
  });
});
