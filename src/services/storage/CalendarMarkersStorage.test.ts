import { beforeEach, describe, expect, it } from "vitest";
import { CalendarMarkersStorage } from "@/services/storage/CalendarMarkersStorage";
import { resetIndexedDB } from "@/test/helpers";

describe("CalendarMarkersStorage", () => {
  beforeEach(async () => {
    await resetIndexedDB();
  });

  it("getSnapshot возвращает undefined, пока снимок не сохранён", async () => {
    expect(await new CalendarMarkersStorage().getSnapshot()).toBeUndefined();
  });

  it("saveSnapshot сохраняет снимок, повторное сохранение его заменяет", async () => {
    const storage = new CalendarMarkersStorage();

    await storage.saveSnapshot({ min: 1, max: 2, days: { "20260101": "f", "20260102": null } });
    await storage.saveSnapshot({ min: 3, max: 4, days: { "20260103": "wvg" } });

    expect(await storage.getSnapshot()).toEqual({ min: 3, max: 4, days: { "20260103": "wvg" } });
  });
});
