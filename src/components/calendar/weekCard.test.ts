import { describe, expect, it } from "vitest";
import { calendarDay } from "@/test/helpers";
import { buildWeekSaintsHtml, buildWeekTitleHtml, getWeekCardStyle } from "./weekCard";

describe("getWeekCardStyle", () => {
  it("день без маркеров - без фона и контура", () => {
    expect(getWeekCardStyle(null)).toEqual({ background: "none", outline: null });
    expect(getWeekCardStyle("")).toEqual({ background: "none", outline: null });
  });

  it.each([
    ["f", "fast"],
    ["w", "week"],
    ["l", "week"],
    ["v", "valaam"],
    ["h", "holiday"],
  ])("маркер %s -> фон %s", (marker, background) => {
    expect(getWeekCardStyle(marker).background).toBe(background);
  });

  it("Пасха красится как двунадесятый праздник", () => {
    expect(getWeekCardStyle("e").background).toBe("holiday");
  });

  it("при нескольких фонах побеждает самый приоритетный, как у круга в месяце", () => {
    expect(getWeekCardStyle("fwv").background).toBe("valaam");
    expect(getWeekCardStyle("fh").background).toBe("holiday");
    expect(getWeekCardStyle("fe").background).toBe("holiday");
  });

  it("контур не отменяет фон; великий праздник важнее поминовения", () => {
    expect(getWeekCardStyle("fc")).toEqual({ background: "fast", outline: "memorial" });
    expect(getWeekCardStyle("cg")).toEqual({ background: "none", outline: "great" });
  });
});

describe("buildWeekTitleHtml", () => {
  it("неделя и глас через точку; HTML недели остаётся как есть", () => {
    const day = { ...calendarDay("20260101"), week: 'Седмица <a href="/x">2-я</a>', tone: 4 };
    expect(buildWeekTitleHtml(day)).toBe('Седмица <a href="/x">2-я</a>. Глас 4.');
  });

  it("без гласа и без недели - только то, что есть", () => {
    expect(buildWeekTitleHtml({ ...calendarDay("20260101"), week: "Сырная седмица" })).toBe(
      "Сырная седмица."
    );
    expect(buildWeekTitleHtml({ ...calendarDay("20260101"), tone: 2 })).toBe("Глас 2.");
    expect(buildWeekTitleHtml(calendarDay("20260101"))).toBe("");
  });
});

describe("buildWeekSaintsHtml", () => {
  it("склеивает строки всех блоков и вырезает знаки праздников", () => {
    const day = {
      ...calendarDay("20260101"),
      saints_blocks: [
        ["{(6}Сщмч. <a href=\"/saints/1\">Киприана</a> (304)", "Блж. Андрея (936)"],
        ["{+}<strong>Мц. Александры</strong> (1938)"],
      ],
    };
    expect(buildWeekSaintsHtml(day)).toBe(
      'Сщмч. <a href="/saints/1">Киприана</a> (304) Блж. Андрея (936) <strong>Мц. Александры</strong> (1938)'
    );
  });

  it("без святых - пустая строка", () => {
    expect(buildWeekSaintsHtml(calendarDay("20260101"))).toBe("");
  });
});
