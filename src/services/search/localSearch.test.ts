import { describe, expect, it } from "vitest";
import { buildLocalSearchIndex, highlightName, searchLocal } from "@/services/search/localSearch";
import type { PrayerElement, PrayerSection } from "@/stores/prayers";

const section = (
  id: number,
  name: string,
  parent: number | null,
  extra: Partial<PrayerSection> = {},
): PrayerSection => ({
  id,
  name,
  parent,
  sort: 0,
  book_root: false,
  compose: false,
  url: `/prayers/${id}`,
  ...extra,
});

const element = (id: number, name: string, parent: number | null): PrayerElement => ({
  id,
  name,
  parent,
  parents: parent == null ? [] : [parent],
  lang: ["ru"],
  sort: 0,
  url: `/prayers/text/${id}`,
});

describe("highlightName", () => {
  it("подсвечивает слова подряд одним блоком вместе с пробелом", () => {
    expect(highlightName("Иоанн Прудентов, пресвитер", ["иоанн", "прудентов"])).toBe(
      "<mark>Иоанн Прудентов</mark>, пресвитер",
    );
  });

  it("находит словоформы и сохраняет ударение", () => {
    expect(highlightName("Священномученик Иоа\u0301нн", ["иоанн"])).toBe(
      "Священномученик <mark>Иоа\u0301нн</mark>",
    );
  });

  it("не склеивает слова, разделённые не пробелами", () => {
    expect(highlightName("Иоанн, Прудентов", ["иоанн", "прудентов"])).toBe(
      "<mark>Иоанн</mark>, <mark>Прудентов</mark>",
    );
  });

  it("экранирует HTML в названии", () => {
    expect(highlightName("<b>Отче</b> & наш", ["отче"])).toBe("&lt;b&gt;<mark>Отче</mark>&lt;/b&gt; &amp; наш");
  });
});

describe("searchLocal", () => {
  const sections = [
    section(842, "Молитвослов", null),
    section(1983, "Книги", null),
    section(10, "Минеи", 842, { book_root: true }),
    section(11, "Сентябрь", 10),
    section(12, "В 8-й день", 11),
    section(20, "Умное Делание", 1983, { book_root: true }),
    section(30, "Акафисты Пресвятой Богородице", 842),
  ];
  const elements = [
    element(100, "Рождество Пресвятыя Владычицы нашея Богородицы", 12),
    element(101, "Акафист Пресвятой Богородице перед иконой", 30),
    element(102, "Отче наш", 842),
    element(103, "О молитве Иисусовой", 20),
  ];
  const saints = [
    { id: 1, name: "Священномученик Иоа\u0301нн Прудентов, пресвитер" },
    { id: 2, name: "Праведный Иоанн Кронштадтский" },
    { id: 3, name: "Иоанн Богослов" },
  ];
  const entries = buildLocalSearchIndex({ elements, sections, saints });

  it("пустой запрос даёт пустую выдачу", () => {
    expect(searchLocal(entries, "   ", 1, 10)).toEqual({ total: 0, items: [] });
  });

  it("требует все слова запроса и игнорирует ударения и регистр", () => {
    const result = searchLocal(entries, "иоанн ПРУДЕНТОВ", 1, 10);

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 1,
      type: "saints",
      type_name: "Святые",
      path: [],
      href: "/saints/1?mode=search",
      text: "",
    });
    expect(result.items[0].name).toBe("Священномученик <mark>Иоа\u0301нн Прудентов</mark>, пресвитер");
  });

  it("ищет по ударению в запросе", () => {
    expect(searchLocal(entries, "Влады\u0301чицы нашея", 1, 10).items.map((i) => i.id)).toEqual([100]);
  });

  it("путь молитвы из Минеи идёт от корня книги вниз", () => {
    const [item] = searchLocal(entries, "Рождество", 1, 10).items;

    expect(item.type).toBe("prayers");
    expect(item.type_name).toBe("Молитвослов");
    expect(item.path).toEqual(["Минеи", "Сентябрь", "В 8-й день"]);
    expect(item.href).toBe("/prayers/text/100");
  });

  it("без книги путь — один ближайший раздел, в корне — пустой", () => {
    expect(searchLocal(entries, "акафист пресвятой", 1, 10).items.find((i) => i.id === 101)?.path).toEqual([
      "Акафисты Пресвятой Богородице",
    ]);
    expect(searchLocal(entries, "отче", 1, 10).items[0].path).toEqual(["Молитвослов"]);
  });

  it("молитвы из «Книг» имеют type_name «Книги» и type prayers", () => {
    const [item] = searchLocal(entries, "молитве иисусовой", 1, 10).items;

    expect(item).toMatchObject({ type: "prayers", type_name: "Книги", path: ["Умное Делание"] });
  });

  it("разделы тоже находятся и ведут на свой url", () => {
    const item = searchLocal(entries, "Минеи", 1, 10).items.find((i) => i.id === 10);

    expect(item?.href).toBe("/prayers/10");
  });

  it("названия, начинающиеся с фразы, идут первыми", () => {
    const items = searchLocal(entries, "иоанн", 1, 10).items;

    expect(items.map((i) => i.id)).toEqual([3, 1, 2]);
  });

  it("делит выдачу на страницы и возвращает общий total", () => {
    const many = Array.from({ length: 25 }, (_, i) => element(500 + i, `Тропарь ${i}`, null));
    const index = buildLocalSearchIndex({ elements: many, sections: [], saints: [] });

    const page3 = searchLocal(index, "тропарь", 3, 10);

    expect(page3.total).toBe(25);
    expect(page3.items).toHaveLength(5);
  });
});
