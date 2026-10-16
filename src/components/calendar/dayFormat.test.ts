import { describe, expect, it } from "vitest";
import {
  buildSrcset,
  getDayHeader,
  getSectionTitle,
  getVisibleSections,
  htmlToText,
  parseDayCode,
  parseSaintLine,
  resolveImageUrl,
  rewriteReadingLinks,
  shiftDayCode,
} from "./dayFormat";

describe("shiftDayCode", () => {
  it("переходит через границы месяца и года", () => {
    expect(shiftDayCode("20261031", 1)).toBe("20261101");
    expect(shiftDayCode("20261231", 1)).toBe("20270101");
    expect(shiftDayCode("20260101", -1)).toBe("20251231");
  });

  it("учитывает високосный год", () => {
    expect(shiftDayCode("20280228", 1)).toBe("20280229");
  });
});

describe("getDayHeader", () => {
  it("возвращает число, месяц, день недели и старый стиль", () => {
    const header = getDayHeader("20261013");
    expect(header.day).toBe("13");
    expect(header.month).toBe("октября");
    expect(header.weekday).toBe("Вторник");
    expect(header.oldStyle).toBe("30 сентября по старому стилю");
    expect(header.fullDate).toBe("30 сентября / 13 октября 2026 г. Вторник.");
  });

  it("старый стиль переходит в предыдущий месяц", () => {
    expect(getDayHeader("20260101").oldStyle).toBe("19 декабря по старому стилю");
  });
});

describe("parseDayCode", () => {
  it("разбирает код в локальную дату", () => {
    const date = parseDayCode("20261013");
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 13]);
  });
});

describe("parseSaintLine", () => {
  it.each([
    ["{(+)}", "great"],
    ["{(+}", "vigil"],
    ["{+}", "polyeleos"],
    ["{(:.}", "doxology"],
    ["{(6}", "six"],
  ])("токен %s -> знак %s, токен вырезается", (token, sign) => {
    expect(parseSaintLine(`${token}<strong>Текст</strong>`)).toEqual({
      sign,
      html: "<strong>Текст</strong>",
    });
  });

  it("строка без токена остаётся как есть", () => {
    expect(parseSaintLine("Прмцц. <a href=\"/saints/1\">Рипсимии</a>")).toEqual({
      sign: null,
      html: "Прмцц. <a href=\"/saints/1\">Рипсимии</a>",
    });
  });

  it("токен не в начале строки не вырезается", () => {
    expect(parseSaintLine("текст {+}")).toEqual({ sign: null, html: "текст {+}" });
  });
});

describe("htmlToText", () => {
  it("убирает теги и схлопывает пробелы", () => {
    expect(htmlToText("<p>Один<br />\nдва</p>\n<p>три</p>")).toBe("Один два три");
  });
});

describe("картинки", () => {
  it("resolveImageUrl делает путь абсолютным", () => {
    expect(resolveImageUrl("/upload/a.jpg")).toBe("https://app.valaam.ru/upload/a.jpg");
    expect(resolveImageUrl("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
    expect(resolveImageUrl(null)).toBeNull();
  });

  it("buildSrcset пропускает отсутствующие размеры", () => {
    expect(buildSrcset("/a.jpg", null, "/c.jpg")).toBe(
      "https://app.valaam.ru/a.jpg 1x, https://app.valaam.ru/c.jpg 3x"
    );
    expect(buildSrcset(null, null, null)).toBeUndefined();
  });
});

describe("расписание чтений", () => {
  const section = (title: string | null, label: string | null = null) => ({
    title,
    label,
    items: [],
  });

  it("getSectionTitle соединяет title и label через « · »", () => {
    expect(getSectionTitle(section("Литургия", "Прп."))).toBe("Литургия · Прп.");
    expect(getSectionTitle(section(null, "Прп."))).toBe("Прп.");
    expect(getSectionTitle(section("Утреня"))).toBe("Утреня");
    expect(getSectionTitle(section(null))).toBeNull();
  });

  it("короткое расписание не сворачивается", () => {
    const schedule = { sections: [section("А"), section("Б"), section("В")], notes: null };
    const result = getVisibleSections(schedule, false);
    expect(result.isCollapsible).toBe(false);
    expect(result.sections).toHaveLength(3);
  });

  it("длинное расписание показывает первые три секции, а после «Показать все» - все", () => {
    const schedule = {
      sections: ["А", "Б", "В", "Г", "Д"].map((title) => section(title)),
      notes: null,
    };
    expect(getVisibleSections(schedule, false).sections).toHaveLength(3);
    expect(getVisibleSections(schedule, true).sections).toHaveLength(5);
    expect(getVisibleSections(schedule, false).isCollapsible).toBe(true);
  });

  it("rewriteReadingLinks добавляет код дня в ссылки на чтения", () => {
    expect(
      rewriteReadingLinks('<p><a href="/readings/105194">1 Кор. 16:13–24</a></p>', "20261013")
    ).toBe('<p><a href="/days/20261013/readings/105194">1 Кор. 16:13–24</a></p>');
  });
});
