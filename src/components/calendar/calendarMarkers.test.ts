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
    expect(parseMarkers(null)).toEqual({ background: null, outline: null });
    expect(parseMarkers("")).toEqual({ background: null, outline: null });
  });

  it("порядок букв в строке не важен: побеждает самый приоритетный фон", () => {
    expect(parseMarkers("hwf").background).toBe("holiday");
    expect(parseMarkers("fwh").background).toBe("holiday");
    expect(parseMarkers("ef").background).toBe("easter");
    expect(parseMarkers("vh").background).toBe("holiday");
    expect(parseMarkers("wvg").background).toBe("valaam");
    expect(parseMarkers("fw").background).toBe("week");
    expect(parseMarkers("wl").background).toBe("week");
    expect(parseMarkers("l").background).toBe("week");
  });

  it("контур выбирается отдельно от фона: g приоритетнее c", () => {
    expect(parseMarkers("wvg")).toEqual({ background: "valaam", outline: "great" });
    expect(parseMarkers("gf")).toEqual({ background: "fast", outline: "great" });
    expect(parseMarkers("cf")).toEqual({ background: "fast", outline: "memorial" });
    expect(parseMarkers("cg").outline).toBe("great");
    expect(parseMarkers("c")).toEqual({ background: null, outline: "memorial" });
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

    expect(styles.get("20260706")).toEqual(["cal-band", "cal-band-fast", "cal-band-start"]);
    expect(styles.get("20260707")).toEqual(["cal-band", "cal-band-fast", "cal-outline-great"]);
    expect(styles.get("20260708")).toEqual(["cal-band", "cal-band-fast", "cal-band-end"]);
  });

  it("одиночный постный день - серо-бежевый круг, без плашки", () => {
    const styles = buildDayStyles({ "20260715": "f", "20260714": null, "20260716": null });

    expect(styles.get("20260715")).toEqual(["cal-fast-single"]);
  });

  it("плашка разрывается на границе недельной строки (Пн/Вс)", () => {
    const styles = buildDayStyles({
      "20260711": "f",
      "20260712": "f",
      "20260713": "f",
      "20260714": "f",
    });

    expect(styles.get("20260711")).toContain("cal-band-start");
    expect(styles.get("20260711")).not.toContain("cal-band-end");
    expect(styles.get("20260712")).toContain("cal-band-end");
    expect(styles.get("20260712")).not.toContain("cal-band-start");
    expect(styles.get("20260713")).toContain("cal-band-start");
    expect(styles.get("20260713")).not.toContain("cal-band-end");
    expect(styles.get("20260714")).toContain("cal-band-end");
  });

  it("плашка обрывается на границе месяца: соседние месяцы в календаре не раскрашиваются", () => {
    // 30 июля - четверг, 2 августа - воскресенье
    const styles = buildDayStyles({
      "20260730": "w",
      "20260731": "w",
      "20260801": "w",
      "20260802": "w",
    });

    expect(styles.get("20260730")).toContain("cal-band-start");
    expect(styles.get("20260730")).not.toContain("cal-band-end");
    expect(styles.get("20260731")).toContain("cal-band-end");
    expect(styles.get("20260731")).not.toContain("cal-band-start");
    expect(styles.get("20260801")).toContain("cal-band-start");
    expect(styles.get("20260801")).not.toContain("cal-band-end");
    expect(styles.get("20260802")).toContain("cal-band-end");
  });

  it("w и l образуют одну плашку седмицы, даже одиночный день седмицы остаётся плашкой-кругом", () => {
    const styles = buildDayStyles({
      "20260706": "w",
      "20260707": "l",
      "20260715": "w",
    });

    expect(styles.get("20260706")).toEqual(["cal-band", "cal-band-week", "cal-band-start"]);
    expect(styles.get("20260707")).toEqual(["cal-band", "cal-band-week", "cal-band-end"]);
    expect(styles.get("20260715")).toEqual(["cal-band", "cal-band-week", "cal-band-start", "cal-band-end"]);
  });

  it("день с более приоритетным фоном прерывает плашку и сам не входит в неё", () => {
    const styles = buildDayStyles({
      "20260706": "f",
      "20260707": "fv",
      "20260708": "f",
      "20260709": "ef",
    });

    expect(styles.get("20260706")).toEqual(["cal-fast-single"]);
    expect(styles.get("20260707")).toEqual(["cal-valaam"]);
    expect(styles.get("20260708")).toEqual(["cal-fast-single"]);
    expect(styles.get("20260709")).toEqual(["cal-easter"]);
  });

  it("круглые фоны и контуры сочетаются; праздник побеждает пост", () => {
    const styles = buildDayStyles({ "20260711": "hf", "20260714": "wvg" });

    expect(styles.get("20260711")).toEqual(["cal-holiday"]);
    expect(styles.get("20260714")).toEqual(["cal-valaam", "cal-outline-great"]);
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
