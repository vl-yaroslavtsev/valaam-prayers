import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";
import prayersData from "../../test-data/prayers.json";
import { useReadingHistoryStore } from "./readingHistory";

export interface PrayerElement {
  id: string;
  name: string;
  parent: string;
  parents: Array<string>;
  lang: Array<"ру" | "цс" | "гр">;
  sort: number;
  url: string;
}

export interface PrayerSection {
  id: string;
  name: string;
  parent: string;
  sort: number;
  url: string;
}

const BIBLE_SECTION_ID = "1078";
const MOLITVOSLOV_SECTION_ID = "842";
export const BOOKS_SECTION_ID = "1983";
const BOOKS_LITURGY_SECTION_ID = "937";

export const usePrayersStore = defineStore("prayers", () => {
  // State
  const elements = shallowRef<PrayerElement[]>(
    prayersData.e.map((e) => {
      const lang: Array<"ру" | "цс" | "гр"> = [];

      if (e.lang_cs) lang.push("цс");
      if (e.lang_sl) lang.push("гр");
      if (e.lang_ru) lang.push("ру");

      return {
        id: e.id,
        name: e.name,
        parent: e.parent,
        parents: e.parents,
        lang,
        sort: e.sort,
        url: "/prayers/text/" + e.id,
      };
    })
  );
  const sections = shallowRef<PrayerSection[]>(
    prayersData.s.map((s) => {
      return {
        ...s,
        url: "/prayers/" + s.id,
      };
    })
  );

  const getItemsBySection = (sectionId: string) => {
    let items: Array<PrayerElement | PrayerSection> = [];

    const isMolitvoslov = sectionId === MOLITVOSLOV_SECTION_ID;
    const isBooks = sectionId === BOOKS_SECTION_ID;

    items = sections.value.filter((s) => {
      // В полном молитвослове Библию не выводим.
      if (isMolitvoslov && s.id === BIBLE_SECTION_ID) {
        return false;
      }

      // В молитвослове добавляем Богослужебные книги
      if (isMolitvoslov && s.id === BOOKS_LITURGY_SECTION_ID) {
        return true;
      }

      // В книгах Богослужебные книги не выводим.
      if (isBooks && s.id === BOOKS_LITURGY_SECTION_ID) {
        return false;
      }

      return s.parent === sectionId;
    });

    items = items.concat(
      elements.value.filter(({ parents }) => {
        return parents.includes(sectionId);
      })
    );

    items.sort((a, b) => {
      if (a.sort === b.sort) {
        return a.name.localeCompare(b.name);
      }
      return a.sort - b.sort;
    });

    // В книгах выводим в начале Библию
    if (isBooks) {
      const itemsBible = getItemsBySection(BIBLE_SECTION_ID);
      items.unshift(...itemsBible);
    }

    return items;
  };

  const getItemById = (
    id: string
  ): PrayerElement | PrayerSection | undefined => {
    let item: PrayerElement | PrayerSection | undefined;

    item = sections.value.find((s) => s.id === id);

    if (item) {
      return item;
    }

    item = elements.value.find((e) => e.id === id);
    return item;
  };

  // Проверяем, является ли элемент секцией
  const isSection = (id: string, url: string = "") => {
    if (url) {
      return url.match(/\/prayers\/\d+/);
    }
    return !!sections.value.find((s) => s.id === id);
  };

  return {
    // State
    elements,
    sections,
    // Getters
    getItemsBySection,
    getItemById,
    isSection,
    // Actions,
    //undoDeleteFavorite,
    //resetFavoriteProgress,
    //undoResetFavoriteProgress,
    //moveFavorite,
  };
});
