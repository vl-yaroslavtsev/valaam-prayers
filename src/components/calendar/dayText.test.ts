import { describe, expect, it } from "vitest";
import { calendarDay } from "@/test/helpers";
import {
  buildDayText,
  buildReadingText,
  getDayTextId,
  getDayTextTitle,
  getDayTextUrl,
  getReadingItemId,
  getThoughtFavoriteTitle,
  isDayTextKind,
  parseReadingText,
  resolveDayTextReaderConfig,
} from "./dayText";

describe("id и адреса текстов дня", () => {
  it("строковый id строится из кода дня и вида", () => {
    expect(getDayTextId("20261013", "thought")).toBe("day:20261013:thought");
    expect(getDayTextId("20261013", "parable")).toBe("day:20261013:parable");
    expect(getDayTextId("20261013", "instructions")).toBe("day:20261013:instructions");
    expect(getReadingItemId("20261013", 104555)).toBe("reading:20261013:104555");
  });

  it("название содержит дату, адрес - код дня и вид", () => {
    expect(getDayTextTitle("20261013", "parable")).toBe("Притча дня, 13 октября 2026");
    expect(getDayTextUrl("20261013", "instructions")).toBe("/days/20261013/text/instructions");
  });

  it("isDayTextKind принимает только известные виды", () => {
    expect(isDayTextKind("thought")).toBe(true);
    expect(isDayTextKind("parable")).toBe(true);
    expect(isDayTextKind("instructions")).toBe(true);
    expect(isDayTextKind("toString")).toBe(false);
    expect(isDayTextKind(undefined)).toBe(false);
  });
});

describe("buildDayText", () => {
  it("притча и указания отдают HTML как есть, язык не выбирается", () => {
    const day = {
      ...calendarDay("20261013"),
      parabel: "<p>Притча</p>",
      instructions:
        '<p>Указания<sup class="fn-ref" data-fn="1"><a href="#fn-1">1</a></sup></p><section data-footnotes><ol><li data-fn="1"><p>Сноска</p></li></ol></section>',
    };

    const parable = buildDayText(day, "parable");
    expect(parable.id).toBe("day:20261013:parable");
    expect(parable.prayerText.text).toBe("<p>Притча</p>");
    expect(parable.prayerText.lang).toEqual([]);

    const instructions = buildDayText(day, "instructions").prayerText;
    expect(instructions.text).toBe(day.instructions);
    expect(instructions.lang).toEqual([]);
  });

  it("мысль дня содержит картинку, подпись и текст, а для избранного использует thought.title с датой", () => {
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

    const built = buildDayText(day, "thought");
    const { text } = built.prayerText;

    expect(text).toContain('src="/upload/a.jpg"');
    expect(text).toContain("<em>Преподобный Силуан Афонский</em>");
    expect(text).toContain("<p>Текст мысли</p>");
    expect(built.favoriteTitle).toBe("Преподобный Силуан Афонский, 13 октября 2026");
  });

  it("мысль дня без картинки и подписи - только текст, для избранного запасное название", () => {
    const day = {
      ...calendarDay("20261013"),
      thought: { title: null, text: "<p>Текст</p>", picture: null, picture_2x: null, picture_3x: null },
    };

    const built = buildDayText(day, "thought");
    expect(built.prayerText.text.trim()).toBe("<p>Текст</p>");
    expect(built.favoriteTitle).toBe("Мысль дня, 13 октября 2026");
    expect(getThoughtFavoriteTitle("20261013", "  Свт. Игнатий  ")).toBe(
      "Свт. Игнатий, 13 октября 2026"
    );
  });
});

describe("resolveDayTextReaderConfig", () => {
  it("мысль дня и притча дня сохраняются в избранное с точным типом и не запоминают прогресс", () => {
    const thought = resolveDayTextReaderConfig({ code: "20261013", kind: "thought" });
    expect(thought.itemId).toBe("day:20261013:thought");
    expect(thought.favorite).toEqual({ type: "thoughts", withMeta: true });
    expect(thought.history).toBeNull();

    const parable = resolveDayTextReaderConfig({ code: "20261013", kind: "parable" });
    expect(parable.itemId).toBe("day:20261013:parable");
    expect(parable.favorite).toEqual({ type: "parables", withMeta: true });
    expect(parable.history).toBeNull();
  });

  it("богослужебные указания сохраняются в избранное и запоминают историю с типом instructions", () => {
    const instructions = resolveDayTextReaderConfig({ code: "20261013", kind: "instructions" });
    expect(instructions.itemId).toBe("day:20261013:instructions");
    expect(instructions.favorite).toEqual({ type: "instructions", withMeta: true });
    expect(instructions.history).toEqual({ type: "instructions", withMeta: true });
  });

  it("чтения Писания сохраняются в избранное и запоминают прогресс с типом readings", () => {
    const reading = resolveDayTextReaderConfig({ code: "20261013", readingId: "104555" });
    expect(reading.readingId).toBe(104555);
    expect(reading.itemId).toBe("reading:20261013:104555");
    expect(reading.itemUrl).toBe("/days/20261013/readings/104555");
    expect(reading.favorite).toEqual({ type: "readings", withMeta: true });
    expect(reading.history).toEqual({ type: "readings", withMeta: true });
  });

  it("выбрасывает ошибку при некорректных параметрах маршрута", () => {
    expect(() => resolveDayTextReaderConfig({})).toThrow();
    expect(() => resolveDayTextReaderConfig({ code: "20261013", kind: "unknown" })).toThrow();
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

    expect(reading?.id).toBe("reading:20261013:104555");
    expect(reading?.name).toBe("От Иоанна, 10:9–16");
    expect(reading?.favoriteTitle).toBe("От Иоанна, 10:9–16");
    expect(reading?.url).toBe("/days/20261013/readings/104555");
    expect(reading?.prayerText.lang).toEqual(["cs", "ru"]);
  });

  it("неизвестный id - null", () => {
    expect(buildReadingText(day, 1)).toBeNull();
  });
});
