import { describe, expect, it } from "vitest";
import {
  buildSaintLifeText,
  getSaintLifeId,
  getSaintLifeUrl,
  resolveSaintLifeReaderConfig,
} from "./saintText";
import { getDayTextId } from "@/components/calendar/dayText";
import { getPrayerItemKey, getSaintKey } from "@/js/itemKey";

describe("saintText", () => {
  it("строковый ключ жития не пересекается с молитвами, карточками святых и текстами дня", () => {
    expect(getSaintLifeId(5)).toBe("saint-life:5");
    expect(getSaintLifeId(5)).not.toBe(getSaintKey(5));
    expect(getSaintLifeId(5)).not.toBe(getPrayerItemKey(5));
    expect(getSaintLifeId(5)).not.toBe(getDayTextId("20261013", "thought"));
  });

  it("адрес жития", () => {
    expect(getSaintLifeUrl(99187)).toBe("/saints/99187/life");
  });

  it("resolveSaintLifeReaderConfig отключает избранное и включает историю с метаданными", () => {
    const config = resolveSaintLifeReaderConfig("99187", "Свт. Николай");

    expect(config).toEqual({
      saintId: 99187,
      itemId: "saint-life:99187",
      initialTitle: "Свт. Николай",
      itemUrl: "/saints/99187/life",
      favorite: null,
      history: { type: "saints", withMeta: true },
    });

    expect(() => resolveSaintLifeReaderConfig(undefined)).toThrow();
  });

  it("строит текст для читалки из карточки святого", () => {
    const text = buildSaintLifeText({
      id: 5,
      name: "Святой",
      life: "<p>Житие</p>",
      picture: null,
      picture2x: null,
      picture3x: null,
      prayerId: null,
      akathistIds: [],
      canonIds: [],
      mineaIds: [],
      hagiographyIds: [],
      memoDays: [],
    });

    expect(text.id).toBe(5);
    expect(text.name).toBe("Святой");
    expect(text.text).toBe("<p>Житие</p>");
  });
});
