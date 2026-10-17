import { describe, expect, it } from "vitest";
import { buildSaintLifeText, getSaintLifeId, getSaintLifeUrl } from "./saintText";
import { getDayTextId } from "@/components/calendar/dayText";

describe("saintText", () => {
  it("id жития не пересекается с id молитв и текстов дня", () => {
    // Наибольшие id: молитвы ~1.8 млн, святые ~1.5 млн
    expect(getSaintLifeId(3)).toBeGreaterThan(1_800_000);
    expect(getSaintLifeId(1_460_099)).toBeLessThan(getDayTextId("19000101", "thought"));
  });

  it("адрес жития", () => {
    expect(getSaintLifeUrl(99187)).toBe("/saints/99187/life");
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

    expect(text.id).toBe(getSaintLifeId(5));
    expect(text.name).toBe("Святой");
    expect(text.text).toBe("<p>Житие</p>");
  });
});
