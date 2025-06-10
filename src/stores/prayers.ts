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

export const usePrayersStore = defineStore("prayers", () => {
  const historyStore = useReadingHistoryStore();
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
      let progress = historyStore.getItemProgress(s.id) || {};

      return {
        ...s,
        url: "/prayers/" + s.id,
        ...progress,
      };
    })
  );

  const getItemsBySection = (sectionId: string) => {
    let items: Array<PrayerElement | PrayerSection> = [];

    items = sections.value.filter((s) => s.parent === sectionId);

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

    return items;
  };

  const getItemById = (id: string): PrayerElement | PrayerSection | undefined => {
    let item: PrayerElement | PrayerSection | undefined;

    item = sections.value.find((s) => s.id === id);

    if (item) {
      return item;
    }

    item = elements.value.find((e) => e.id === id);
    return item;
  };

  return {
    // State
    elements,
    sections,
    // Getters
    getItemsBySection,
    getItemById,
    // Actions,
    //undoDeleteFavorite,
    //resetFavoriteProgress,
    //undoResetFavoriteProgress,
    //moveFavorite,
  };
});
