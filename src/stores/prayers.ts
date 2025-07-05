import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";
import type { Lang } from "@/types/common";
import { prayersApi } from "@/services/api";
import type { PrayerApiElement, PrayerApiSection, PrayerTextApiResponse } from "@/services/api";
import { prayersIndexStorage, prayerDetailsStorage, sectionsStorage } from "@/services/storage";

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
  const isInitialized = ref<boolean>(false);
  const isInitializing = ref<boolean>(false);

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
  // State
  const isLoading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  /**
   * Инициализация store с загрузкой из кэша
   */
  const initStore = async () => {
    if (isInitialized.value || isInitializing.value) return;
    isInitializing.value = true;

    try {
      // Пытаемся загрузить данные из кэша
      console.time("Prayers initStore");
      const cachedPrayers = await prayersIndexStorage?.getAll();
      const cachedSections = await sectionsStorage?.getAll();

      if (cachedPrayers && cachedSections) {
        elements.value = cachedPrayers.map(transformApiElement);  
        sections.value = cachedSections.map(transformApiSection);
        console.log('Loaded prayers from cache');
      }
      console.timeEnd("Prayers initStore");
      
    } catch (err) {
      console.warn('Failed to load from cache, will fetch from API');
    }

    await fetchPrayers();

    isInitialized.value = true;
    isInitializing.value = false;
  };

  /**
   * Загружает данные с сервера и сохраняет в кэш
   */
  const fetchPrayers = async () => {
    console.time("Prayers fetchPrayers");
    try {
      isLoading.value = true;
      error.value = null;

      const response = await prayersApi.getPrayers();
      
      elements.value = response.e.map(transformApiElement);
      sections.value = response.s.map(transformApiSection);

      console.time("Prayers cache elements and sections");
      // Сохраняем в кэш
      await prayersIndexStorage?.putAll(elements.value);
      await sectionsStorage?.putAll(sections.value);
      console.timeEnd("Prayers cache elements and sections");

      console.log("Prayers data loaded and cached successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      error.value = errorMessage;
      console.error("Failed to load prayers data:", errorMessage);
      throw err;
    } finally {
      isLoading.value = false;
    }
    console.timeEnd("Prayers fetchPrayers");
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

  initStore();

  return {
    // State
    elements,
    sections,
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
