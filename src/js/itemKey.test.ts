import { describe, expect, it } from "vitest";
import {
  getDayTextKey,
  getPrayerItemKey,
  getReadingKey,
  getSaintKey,
  getSaintLifeKey,
  parsePrayerItemKey,
  parseSaintKey,
} from "./itemKey";

describe("itemKey", () => {
  it("разводит одинаковые числовые id разных сущностей по пространствам имён", () => {
    const keys = new Set([
      getPrayerItemKey(5),
      getSaintKey(5),
      getSaintLifeKey(5),
      getReadingKey("20261013", 5),
      getDayTextKey("20261013", "thought"),
      getDayTextKey("20261013", "parable"),
      getDayTextKey("20261013", "instructions"),
    ]);

    expect(keys.size).toBe(7);
  });

  it("корректно разбирает ключи молитв и святых", () => {
    expect(parsePrayerItemKey("prayer:47166")).toBe(47166);
    expect(parsePrayerItemKey("saint:47166")).toBeNull();
    expect(parsePrayerItemKey("prayer:")).toBeNull();
    expect(parsePrayerItemKey("prayer:abc")).toBeNull();

    expect(parseSaintKey("saint:83820")).toBe(83820);
    expect(parseSaintKey("saint-life:83820")).toBeNull();
    expect(parseSaintKey("prayer:83820")).toBeNull();
    expect(parseSaintKey(83820 as unknown as string)).toBeNull();
  });
});
