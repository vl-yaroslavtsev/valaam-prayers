import { describe, expect, it } from "vitest";
import { DAY_CLASSES, buildDayStyles, getDaysRange, parseMarkers, toDateCode } from "./calendarMarkers";

describe("toDateCode", () => {
  it("форматирует локальную дату как YYYYMMDD", () => {
    expect(toDateCode(new Date(2026, 6, 7))).toBe("20260707");
    expect(toDateCode(new Date(2027, 0, 13))).toBe("20270113");
  });
});

describe("getDaysRange", () => {
  it("возвращает первый и последний день из API в локальном времени", () => {
    const range = getDaysRange({ "20260108": "w", "20180114": "g", "20270113": null });
    expect(range).toEqual({ min: new Date(2018, 0, 14), max: new Date(2027, 0, 13) });
  });

  it("без дней диапазона нет", () => {
    expect(getDaysRange({})).toBeNull();
  });
});

describe("parseMarkers", () => {
  it("день без маркеров (null и пустая строка) ничем не выделяется", () => {
    expect(parseMarkers(null)).toEqual({ backgrounds: [], outlines: [] });
    expect(parseMarkers("")).toEqual({ backgrounds: [], outlines: [] });
  });

  it("возвращает все фоны по убыванию приоритета, порядок букв не важен", () => {
    expect(parseMarkers("hwf").backgrounds).toEqual(["holiday", "week", "fast"]);
    expect(parseMarkers("fwh").backgrounds).toEqual(["holiday", "week", "fast"]);
    expect(parseMarkers("ef").backgrounds).toEqual(["easter", "fast"]);
    expect(parseMarkers("vh").backgrounds).toEqual(["holiday", "valaam"]);
    expect(parseMarkers("wvg").backgrounds).toEqual(["valaam", "week"]);
    expect(parseMarkers("fw").backgrounds).toEqual(["week", "fast"]);
    expect(parseMarkers("wl").backgrounds).toEqual(["week"]);
    expect(parseMarkers("l").backgrounds).toEqual(["week"]);
  });

  it("контуры собираются отдельно от фона, g приоритетнее c", () => {
    expect(parseMarkers("wvg")).toEqual({ backgrounds: ["valaam", "week"], outlines: ["great"] });
    expect(parseMarkers("gf")).toEqual({ backgrounds: ["fast"], outlines: ["great"] });
    expect(parseMarkers("cf")).toEqual({ backgrounds: ["fast"], outlines: ["memorial"] });
    expect(parseMarkers("cg").outlines).toEqual(["great", "memorial"]);
    expect(parseMarkers("c")).toEqual({ backgrounds: [], outlines: ["memorial"] });
  });
});

describe("buildDayStyles", () => {
  // 2026-07-06 - понедельник, 2026-07-12 - воскресенье
  it("дни без маркеров активны (пустой набор классов), отсутствующих в API нет в карте", () => {
    const styles = buildDayStyles({ "20260709": null });

    expect(styles.get("20260709")).toEqual([]);
    expect(styles.has("20260710")).toBe(false);
  });

  it("подряд идущие постные дни образуют плашку с краями на первом и последнем дне", () => {
    const styles = buildDayStyles({
      "20260706": "f",
      "20260707": "fg",
      "20260708": "f",
      "20260709": null,
    });

    expect(styles.get("20260706")).toEqual(["cal-band-fast", "cal-fast-start"]);
    expect(styles.get("20260707")).toEqual(["cal-band-fast", "cal-outline-great"]);
    expect(styles.get("20260708")).toEqual(["cal-band-fast", "cal-fast-end"]);
  });

  it("одиночный постный день — круглая плашка того же вида, что и многодневный пост", () => {
    const styles = buildDayStyles({ "20260715": "f", "20260714": null, "20260716": null });

    expect(styles.get("20260715")).toEqual(["cal-band-fast", "cal-fast-start", "cal-fast-end"]);
  });

  it("плашка разрывается на границе недельной строки (Пн/Вс)", () => {
    const styles = buildDayStyles({
      "20260711": "f",
      "20260712": "f",
      "20260713": "f",
      "20260714": "f",
    });

    expect(styles.get("20260711")).toContain("cal-fast-start");
    expect(styles.get("20260711")).not.toContain("cal-fast-end");
    expect(styles.get("20260712")).toContain("cal-fast-end");
    expect(styles.get("20260712")).not.toContain("cal-fast-start");
    expect(styles.get("20260713")).toContain("cal-fast-start");
    expect(styles.get("20260713")).not.toContain("cal-fast-end");
    expect(styles.get("20260714")).toContain("cal-fast-end");
  });

  it("плашка обрывается на границе месяца: соседние месяцы в календаре не раскрашиваются", () => {
    // 30 июля - четверг, 2 августа - воскресенье
    const styles = buildDayStyles({
      "20260730": "w",
      "20260731": "w",
      "20260801": "w",
      "20260802": "w",
    });

    expect(styles.get("20260730")).toContain("cal-week-start");
    expect(styles.get("20260730")).not.toContain("cal-week-end");
    expect(styles.get("20260731")).toContain("cal-week-end");
    expect(styles.get("20260731")).not.toContain("cal-week-start");
    expect(styles.get("20260801")).toContain("cal-week-start");
    expect(styles.get("20260801")).not.toContain("cal-week-end");
    expect(styles.get("20260802")).toContain("cal-week-end");
  });

  it("w и l образуют одну плашку седмицы, даже одиночный день седмицы остаётся плашкой-кругом", () => {
    const styles = buildDayStyles({
      "20260706": "w",
      "20260707": "l",
      "20260715": "w",
    });

    expect(styles.get("20260706")).toEqual(["cal-band-week", "cal-week-start"]);
    expect(styles.get("20260707")).toEqual(["cal-band-week", "cal-week-end"]);
    expect(styles.get("20260715")).toEqual(["cal-band-week", "cal-week-start", "cal-week-end"]);
  });

  it("круглый маркер рисуется поверх плашки и не разрывает её", () => {
    // 4 декабря 2026 — пятница, fh; 6 декабря — воскресенье, fv
    const styles = buildDayStyles({
      "20261203": "f",
      "20261204": "fh",
      "20261205": "f",
      "20261206": "fv",
    });

    expect(styles.get("20261203")).toEqual(["cal-band-fast", "cal-fast-start"]);
    expect(styles.get("20261204")).toEqual(["cal-band-fast", "cal-holiday"]);
    expect(styles.get("20261205")).toEqual(["cal-band-fast"]);
    expect(styles.get("20261206")).toEqual(["cal-band-fast", "cal-fast-end", "cal-valaam"]);
  });

  it("седмица и пост на одном дне дают две плашки: седмица в классах позже поста", () => {
    const styles = buildDayStyles({
      "20260706": "f",
      "20260707": "fw",
      "20260708": "f",
    });

    expect(styles.get("20260706")).toEqual(["cal-band-fast", "cal-fast-start"]);
    expect(styles.get("20260707")).toEqual([
      "cal-band-fast",
      "cal-band-week",
      "cal-week-start",
      "cal-week-end",
    ]);
    expect(styles.get("20260708")).toEqual(["cal-band-fast", "cal-fast-end"]);
  });

  it("круглые фоны, плашка и контур сочетаются", () => {
    const styles = buildDayStyles({ "20260711": "hf", "20260714": "wvg" });

    expect(styles.get("20260711")).toEqual([
      "cal-band-fast",
      "cal-fast-start",
      "cal-fast-end",
      "cal-holiday",
    ]);
    expect(styles.get("20260714")).toEqual([
      "cal-band-week",
      "cal-week-start",
      "cal-week-end",
      "cal-valaam",
      "cal-outline-great",
    ]);
  });

  it("все выдаваемые классы перечислены в DAY_CLASSES (иначе rangesClasses их не применит)", () => {
    const styles = buildDayStyles({
      "20260706": "e",
      "20260707": "h",
      "20260708": "v",
      "20260709": "gf",
      "20260710": "cf",
      "20260711": "f",
      "20260712": "f",
      "20260713": "w",
      "20260720": "f",
    });

    const known = new Set<string>(DAY_CLASSES);
    for (const classes of styles.values()) {
      for (const cssClass of classes) {
        expect(known.has(cssClass)).toBe(true);
      }
    }
  });
});
