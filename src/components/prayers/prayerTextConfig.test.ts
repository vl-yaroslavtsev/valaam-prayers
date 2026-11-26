import { describe, expect, it } from "vitest";
import {
  resolvePrayerTextReaderConfig,
  type PrayerStoreLookup,
} from "./prayerTextConfig";

const createLookup = (overrides: Partial<PrayerStoreLookup> = {}): PrayerStoreLookup => ({
  getItemById: (id) => ({ name: `Элемент ${id}`, url: `/prayers/text/${id}` }),
  getFavoriteType: () => "prayers",
  isBook: () => false,
  ...overrides,
});

describe("resolvePrayerTextReaderConfig", () => {
  it("строит конфиг для обычной молитвы со строковым ключом", () => {
    const config = resolvePrayerTextReaderConfig({ elementId: "47166" }, createLookup());

    expect(config).toEqual({
      rawId: 47166,
      isSection: false,
      itemId: "prayer:47166",
      initialTitle: "Элемент 47166",
      itemUrl: "/prayers/text/47166",
      favorite: { type: "prayers" },
      history: { type: "prayers" },
    });
  });

  it("строит конфиг для книги Библии: избранное bible, история books", () => {
    const config = resolvePrayerTextReaderConfig(
      { sectionId: "1641" },
      createLookup({
        getItemById: () => ({ name: "Апостол", url: "/prayers/composed-text/1641" }),
        getFavoriteType: () => "bible",
        isBook: () => true,
      })
    );

    expect(config.isSection).toBe(true);
    expect(config.itemId).toBe("prayer:1641");
    expect(config.favorite).toEqual({ type: "bible" });
    expect(config.history).toEqual({ type: "books" });
  });

  it("строит конфиг для духовной книги: избранное books, история books", () => {
    const config = resolvePrayerTextReaderConfig(
      { elementId: "1079" },
      createLookup({
        getFavoriteType: () => "books",
        isBook: () => true,
      })
    );

    expect(config.favorite).toEqual({ type: "books" });
    expect(config.history).toEqual({ type: "books" });
  });

  it("выбрасывает ошибку, если не передан ни elementId, ни sectionId", () => {
    expect(() => resolvePrayerTextReaderConfig({}, createLookup())).toThrow();
  });
});
