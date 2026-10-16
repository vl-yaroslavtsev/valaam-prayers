import { describe, expect, it } from "vitest";
import { calendarDay } from "@/test/helpers";
import {
  buildDayText,
  buildReadingText,
  getDayTextId,
  getDayTextTitle,
  getDayTextUrl,
  isDayTextKind,
  parseReadingText,
} from "./dayText";

describe("id и адреса текстов дня", () => {
  it("id строится из кода дня и не пересекается между видами", () => {
    expect(getDayTextId("20261013", "thought")).toBe(202610131);
    expect(getDayTextId("20261013", "parabel")).toBe(202610132);
    expect(getDayTextId("20261013", "instructions")).toBe(202610133);
  });

  it("название содержит дату, адрес - код дня и вид", () => {
    expect(getDayTextTitle("20261013", "parabel")).toBe("Притча дня, 13 октября 2026");
    expect(getDayTextUrl("20261013", "instructions")).toBe("/days/20261013/text/instructions");
  });

  it("isDayTextKind принимает только известные виды", () => {
    expect(isDayTextKind("thought")).toBe(true);
    expect(isDayTextKind("toString")).toBe(false);
    expect(isDayTextKind(undefined)).toBe(false);
  });
});

describe("buildDayText", () => {
  it("притча и указания отдают HTML как есть, язык не выбирается", () => {
    const day = { ...calendarDay("20261013"), parabel: "<p>Притча</p>", instructions: "<p>Указания</p>" };

    const parabel = buildDayText(day, "parabel");
    expect(parabel.prayerText.text).toBe("<p>Притча</p>");
    expect(parabel.prayerText.lang).toEqual([]);

    expect(buildDayText(day, "instructions").prayerText.text).toBe("<p>Указания</p>");
  });

  it("мысль дня содержит картинку, подпись и текст", () => {
    const day = {
      ...calendarDay("20261013"),
      thought: {
        title: "Преподобный Силуан Афонский",
        text: "<p>Текст мысли</p>",
        picture: "/upload/a.jpg",
        picture_2x: null,
        picture_3x: null,
      },
    };

    const { text } = buildDayText(day, "thought").prayerText;

    expect(text).toContain('src="https://app.valaam.ru/upload/a.jpg"');
    expect(text).toContain("<em>Преподобный Силуан Афонский</em>");
    expect(text).toContain("<p>Текст мысли</p>");
  });

  it("мысль дня без картинки и подписи - только текст", () => {
    const day = {
      ...calendarDay("20261013"),
      thought: { title: null, text: "<p>Текст</p>", picture: null, picture_2x: null, picture_3x: null },
    };

    expect(buildDayText(day, "thought").prayerText.text.trim()).toBe("<p>Текст</p>");
  });
});

describe("parseReadingText", () => {
  const raw = [
    "#r#10:9 [Зач. 36] Я есмь дверь: _так_ & <b>",
    "#r#10:10 Вор приходит.",
    "",
    "#c#10:9 [Заⷱ҇ 36] А҆́зъ є҆́смь две́рь:",
    "#c#10:10 Та́ть не прихо́дитъ.",
  ].join("\n");

  it("разделяет русский и церковнославянский текст", () => {
    const { ru, cs } = parseReadingText(raw);
    expect(ru.split("\n")).toHaveLength(2);
    expect(cs.split("\n")).toHaveLength(2);
    expect(cs).toContain("<sup>10</sup> Та́ть не прихо́дитъ.");
  });

  it("номер стиха надстрочный, _слово_ - курсив, HTML экранируется", () => {
    expect(parseReadingText(raw).ru.split("\n")[0]).toBe(
      "<p><sup>9</sup> [Зач. 36] Я есмь дверь: <em>так</em> &amp; &lt;b&gt;</p>"
    );
  });

  it("текст без маркеров даёт пустой результат", () => {
    expect(parseReadingText("просто текст")).toEqual({ ru: "", cs: "" });
  });
});

describe("buildReadingText", () => {
  const day = {
    ...calendarDay("20261013"),
    readings: [{ id: 104555, name: "От Иоанна, 10:9–16", text: "#r#10:9 Я есмь дверь.\n\n#c#10:9 А҆́зъ є҆́смь." }],
  };

  it("находит чтение по id и отдаёт оба языка", () => {
    const reading = buildReadingText(day, 104555);

    expect(reading?.id).toBe(104555);
    expect(reading?.name).toBe("От Иоанна, 10:9–16");
    expect(reading?.url).toBe("/days/20261013/readings/104555");
    expect(reading?.prayerText.lang).toEqual(["cs", "ru"]);
  });

  it("неизвестный id - null", () => {
    expect(buildReadingText(day, 1)).toBeNull();
  });
});
