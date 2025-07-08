import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";
import type { Lang } from "@/types/common";
import { prayersApi } from "@/services/api";
import type {
  PrayerApiElement,
  PrayerApiSection,
  PrayerTextApiResponse,
} from "@/services/api";
import {
  prayersIndexStorage,
  prayerDetailsStorage,
  sectionsStorage,
} from "@/services/storage";
import { PrayersApiResponse } from "@/services/api/PrayersApi";

export interface PrayerElement {
  id: string;
  name: string;
  parent: string;
  parents: string[];
  lang: Lang[];
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
  const elements = shallowRef<PrayerElement[]>([]);
  const sections = shallowRef<PrayerSection[]>([]);

  const isInitialized = shallowRef<boolean>(false);
  const isInitializing = shallowRef<boolean>(false);

  const isLoading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  /**
   * Преобразует API элемент в локальный формат
   */
  const transformApiElement = (e: PrayerApiElement): PrayerElement => {
    return {
      ...e,
      url: "/prayers/text/" + e.id,
    };
  };

  /**
   * Преобразует API секцию в локальный формат
   */
  const transformApiSection = (s: PrayerApiSection): PrayerSection => {
    return {
      ...s,
      url: "/prayers/" + s.id,
    };
  };

  /**
   * Инициализация store с загрузкой из кэша
   */
  const initStore = async () => {
    if (isInitialized.value || isInitializing.value) return;
    isInitializing.value = true;

    try {
      // Пытаемся загрузить данные из кэша
      console.time("Prayers initStore");
      const [cachedPrayers, cachedSections] = await Promise.all([
        prayersIndexStorage?.getAll(),
        sectionsStorage?.getAll(),
      ]);

      if (cachedPrayers && cachedSections) {
        elements.value = cachedPrayers.map(transformApiElement);
        sections.value = cachedSections.map(transformApiSection);
        console.log("Loaded prayers from cache");
      }
      console.timeEnd("Prayers initStore");
    } catch (err) {
      console.warn("Failed to load from cache, will fetch from API");
    }

    isInitialized.value = true;
    isInitializing.value = false;

    fetchPrayers()
    .then(savePrayersToCache);
  };

  /**
   * Загружает данные с сервера и сохраняет в кэш
   */
  const fetchPrayers = async () => {
    if (elements.value.length === 0) {
      isLoading.value = true;
    }
    try {
      error.value = null;
      console.time("Prayers fetchPrayers");
      const response = await prayersApi.getPrayers();

      if (elements.value.length === 0) {
        elements.value = response.e.map(transformApiElement);
        sections.value = response.s.map(transformApiSection);
      }

      console.timeEnd("Prayers fetchPrayers");
      console.log("Prayers data loaded successfully");
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      error.value = errorMessage;
      console.error("Failed to load prayers data:", errorMessage);
    } finally {
      isLoading.value = false;
    }

    return {e: [], s: []};
  };

  const savePrayersToCache = async (response: PrayersApiResponse) => {
    try {
      console.time("Prayers cache elements and sections");
      const {e, s} = response;
      // Сохраняем в кэш
      if (e.length > 0) {
        await prayersIndexStorage?.putAll(e.map(transformApiElement));
      }
      if (s.length > 0) {
        await sectionsStorage?.putAll(s.map(transformApiSection));
      }
            
      console.log("Prayers data cached successfully");
      console.timeEnd("Prayers cache elements and sections");
    } catch (err) {
      console.error("Failed to save prayers to cache:", err);
    }
  };

  /**
   * Получает текст молитвы (сначала из кэша, потом с сервера)
   */
  const getPrayerText = async (id: string): Promise<PrayerTextApiResponse> => {
    try {
      // Сначала проверяем кэш
      const cached = await prayerDetailsStorage?.get(id);
      if (cached) {
        return cached;
      }

      // Загружаем с сервера
      const response = await prayersApi.getPrayerText(id);
      // Сохраняем в кэш
      await prayerDetailsStorage?.put(response);

      return response;
    } catch (err) {
      console.error(`Failed to get prayer text for ID ${id}:`, err);
      throw err;
    }
  };

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
    isInitialized,
    isLoading,
    error,
    // Getters
    getItemsBySection,
    getItemById,
    isSection,
    // Actions
    initStore,
    fetchPrayers,
    getPrayerText,
  };
});
