import { describe, expect, it } from "vitest";
import type { FavoritesItem, FavoriteType } from "@/stores/favorites";
import type { ReadingHistoryItem } from "@/stores/readingHistory";
import {
  buildLastReadingItems,
  canFavoriteResetProgress,
  filterFavoritesByChip,
  getAvailableFavoriteChips,
  hydrateFavoriteItem,
  type HomeDataLookups,
} from "./favoritesFilter";

const fav = (id: string, type: FavoriteType, sort: number, meta?: { title: string; url: string }): FavoritesItem => ({
  id,
  type,
  sort,
  ...meta,
});

describe("getAvailableFavoriteChips", () => {
  it("возвращает пустой массив, если избранное пустое", () => {
    expect(getAvailableFavoriteChips([])).toEqual([]);
  });

  it("не выводит чипсы, если в избранном только 1 тип", () => {
    expect(getAvailableFavoriteChips([fav("prayer:1", "prayers", 0), fav("prayer:2", "prayers", 1)])).toEqual([]);
    expect(getAvailableFavoriteChips([fav("saint:1", "saints", 0)])).toEqual([]);
  });

  it("не выводит чипсы, если все элементы попадают в один и тот же чипс", () => {
    expect(
      getAvailableFavoriteChips([fav("prayer:1641", "bible", 0), fav("reading:20261013:1", "readings", 1)])
    ).toEqual([]);
    expect(
      getAvailableFavoriteChips([fav("day:20261013:thought", "thoughts", 0), fav("day:20261013:parable", "parables", 1)])
    ).toEqual([]);
  });

  it("выводит все чипсы в строго заданном порядке, когда есть элементы всех категорий", () => {
    const items: FavoritesItem[] = [
      fav("day:20261013:instructions", "instructions", 0),
      fav("day:20261013:parable", "parables", 1),
      fav("prayer:1079", "books", 2),
      fav("saint:83820", "saints", 3),
      fav("prayer:47166", "prayers", 4),
      fav("reading:20261013:104555", "readings", 5),
    ];

    expect(getAvailableFavoriteChips(items)).toEqual([
      { id: "all", title: "Все" },
      { id: "scripture", title: "Библия" },
      { id: "prayers", title: "Молитвы" },
      { id: "saints", title: "Святые" },
      { id: "books", title: "Книги" },
      { id: "thoughts", title: "Мысли и притчи" },
      { id: "instructions", title: "Указания" },
    ]);
  });

  it("выводит только непустые чипсы в правильном порядке", () => {
    const items: FavoritesItem[] = [
      fav("prayer:1079", "books", 0),
      fav("day:20261013:thought", "thoughts", 1),
      fav("prayer:1641", "bible", 2),
    ];

    expect(getAvailableFavoriteChips(items).map((chip) => chip.id)).toEqual([
      "all",
      "scripture",
      "books",
      "thoughts",
    ]);
  });
});

describe("filterFavoritesByChip", () => {
  const items: FavoritesItem[] = [
    fav("prayer:1641", "bible", 4),
    fav("reading:20261013:104555", "readings", 1),
    fav("prayer:47166", "prayers", 3),
    fav("saint:83820", "saints", 0),
    fav("prayer:1079", "books", 6),
    fav("day:20261013:thought", "thoughts", 5),
    fav("day:20261013:parable", "parables", 2),
    fav("day:20261013:instructions", "instructions", 7),
  ];

  it("чипс «Все» возвращает все элементы, отсортированные по sort", () => {
    expect(filterFavoritesByChip(items, "all").map((item) => item.id)).toEqual([
      "saint:83820",
      "reading:20261013:104555",
      "day:20261013:parable",
      "prayer:47166",
      "prayer:1641",
      "day:20261013:thought",
      "prayer:1079",
      "day:20261013:instructions",
    ]);
  });

  it("чипс «Библия» объединяет bible и readings с сохранением порядка sort", () => {
    expect(filterFavoritesByChip(items, "scripture").map((item) => item.id)).toEqual([
      "reading:20261013:104555",
      "prayer:1641",
    ]);
  });

  it("чипс «Мысли и притчи» объединяет thoughts и parables с сохранением порядка sort", () => {
    expect(filterFavoritesByChip(items, "thoughts").map((item) => item.id)).toEqual([
      "day:20261013:parable",
      "day:20261013:thought",
    ]);
  });

  it("остальные чипсы возвращают ровно свой тип", () => {
    expect(filterFavoritesByChip(items, "prayers").map((item) => item.id)).toEqual(["prayer:47166"]);
    expect(filterFavoritesByChip(items, "saints").map((item) => item.id)).toEqual(["saint:83820"]);
    expect(filterFavoritesByChip(items, "books").map((item) => item.id)).toEqual(["prayer:1079"]);
    expect(filterFavoritesByChip(items, "instructions").map((item) => item.id)).toEqual([
      "day:20261013:instructions",
    ]);
  });
});

describe("canFavoriteResetProgress", () => {
  it("отключает сброс прогресса для мыслей, притч и страниц святых", () => {
    expect(canFavoriteResetProgress("thoughts")).toBe(false);
    expect(canFavoriteResetProgress("parables")).toBe(false);
    expect(canFavoriteResetProgress("saints")).toBe(false);
  });

  it("разрешает сброс прогресса для молитв, книг, Библии, чтений и указаний", () => {
    expect(canFavoriteResetProgress("prayers")).toBe(true);
    expect(canFavoriteResetProgress("books")).toBe(true);
    expect(canFavoriteResetProgress("bible")).toBe(true);
    expect(canFavoriteResetProgress("readings")).toBe(true);
    expect(canFavoriteResetProgress("instructions")).toBe(true);
  });
});

describe("hydrateFavoriteItem", () => {
  const historyMap = new Map<string, ReadingHistoryItem>([
    [
      "prayer:1641",
      { id: "prayer:1641", progress: 0.4, pages: 20, type: "books", lastReadAt: new Date("2026-10-13") },
    ],
    [
      "reading:20261013:104555",
      { id: "reading:20261013:104555", progress: 0.5, pages: 4, type: "readings", lastReadAt: new Date("2026-10-13") },
    ],
    [
      "day:20261013:thought",
      { id: "day:20261013:thought", progress: 0.5, pages: 2, type: "instructions", lastReadAt: new Date("2026-10-13") },
    ],
  ]);

  const lookups: HomeDataLookups = {
    getPrayerById: (id) =>
      id === 1641 ? { name: "Апостол", url: "/prayers/1641" } : undefined,
    getPrayerLanguages: () => ["cs", "ru"],
    getSaintById: (id) => (id === 83820 ? { name: "Свт. Николай" } : undefined),
    getHistoryItem: (id) => historyMap.get(id),
  };

  it("гидратирует Библию из prayersStore с языками и прогрессом", () => {
    const result = hydrateFavoriteItem(fav("prayer:1641", "bible", 0), lookups);

    expect(result).toMatchObject({
      name: "Апостол",
      url: "/prayers/1641",
      lang: ["cs", "ru"],
      canResetProgress: true,
      progress: 0.4,
      pages: 20,
    });
  });

  it("гидратирует святого из saintsStore без прогресса и со ссылкой на карточку", () => {
    const result = hydrateFavoriteItem(fav("saint:83820", "saints", 1), lookups);

    expect(result).toMatchObject({
      name: "Свт. Николай",
      url: "/saints/83820",
      lang: [],
      canResetProgress: false,
      progress: undefined,
      pages: undefined,
    });
  });

  it("гидратирует чтение Писания из метаданных и подтягивает прогресс", () => {
    const result = hydrateFavoriteItem(
      fav("reading:20261013:104555", "readings", 2, {
        title: "От Иоанна, 10:9–16",
        url: "/days/20261013/readings/104555",
      }),
      lookups
    );

    expect(result).toMatchObject({
      name: "От Иоанна, 10:9–16",
      url: "/days/20261013/readings/104555",
      canResetProgress: true,
      progress: 0.5,
      pages: 4,
    });
  });

  it("для мысли дня отключает прогресс и кнопку сброса даже если запись есть в истории", () => {
    const result = hydrateFavoriteItem(
      fav("day:20261013:thought", "thoughts", 3, {
        title: "Прп. Силуан, 13 октября 2026",
        url: "/days/20261013/text/thought",
      }),
      lookups
    );

    expect(result).toMatchObject({
      name: "Прп. Силуан, 13 октября 2026",
      url: "/days/20261013/text/thought",
      canResetProgress: false,
      progress: undefined,
      pages: undefined,
    });
  });
});

describe("buildLastReadingItems", () => {
  it("подставляет название и URL для молитв/книг из prayersStore и для житий/указаний из метаданных", () => {
    const items: ReadingHistoryItem[] = [
      {
        id: "prayer:47166",
        progress: 0.5,
        pages: 10,
        type: "prayers",
        lastReadAt: new Date("2026-10-13T12:00:00Z"),
      },
      {
        id: "saint-life:83820",
        progress: 0.3,
        pages: 15,
        type: "saints",
        title: "Свт. Николай",
        url: "/saints/83820/life",
        lastReadAt: new Date("2026-10-13T11:00:00Z"),
      },
      {
        id: "day:20261013:instructions",
        progress: 0.2,
        pages: 6,
        type: "instructions",
        title: "Богослужебные указания, 13 октября 2026",
        url: "/days/20261013/text/instructions",
        lastReadAt: new Date("2026-10-13T10:00:00Z"),
      },
    ];

    const result = buildLastReadingItems(items, (id) =>
      id === 47166 ? { name: "Молитвы утренние", url: "/prayers/text/47166" } : undefined
    );

    expect(result.map((r) => ({ id: r.id, name: r.name, url: r.url }))).toEqual([
      { id: "prayer:47166", name: "Молитвы утренние", url: "/prayers/text/47166" },
      { id: "saint-life:83820", name: "Свт. Николай", url: "/saints/83820/life" },
      {
        id: "day:20261013:instructions",
        name: "Богослужебные указания, 13 октября 2026",
        url: "/days/20261013/text/instructions",
      },
    ]);
  });
});
