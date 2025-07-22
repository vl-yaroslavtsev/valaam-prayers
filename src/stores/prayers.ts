import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";
import type { Language } from "@/types/common";
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
  metadataStorage,
} from "@/services/storage";
import { PrayersApiResponse } from "@/services/api/PrayersApi";

export interface PrayerElement {
  id: string;
  name: string;
  parent: string;
  parents: string[];
  lang: Language[];
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

export interface PrayerText extends PrayerTextApiResponse {
  lang: Language[];
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

  const transformApiPrayerText = (e: PrayerTextApiResponse): PrayerText => {
    const lang: Language[] = [];

    if (e.text_cs) {
      lang.push("cs");
    }
    if (e.text_cs_cf) {
      lang.push("cs-cf");
    }
    if (e.text_ru) {
      lang.push("ru");
    }

    return {
      ...e,
      lang
    };
  };

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
      
      // Получаем время последней синхронизации
      const lastSyncTime = await metadataStorage?.getLastSyncTime('prayers');
      console.log('Last prayers sync time:', lastSyncTime);
      
      const response = await prayersApi.getPrayers(lastSyncTime || undefined);

      if (elements.value.length === 0) {
        elements.value = response.elements.map(transformApiElement);
        sections.value = response.sections.map(transformApiSection);
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

    return {elements: [], sections: [], all_element_ids: [], all_section_ids: []};
  };

  const savePrayersToCache = async (response: PrayersApiResponse) => {
    try {
      console.time("Prayers cache elements and sections");
      const lastSyncTime = await metadataStorage?.getLastSyncTime('prayers');
      const isFullSync = lastSyncTime === null;
      // Сохраняем в кэш
      if (isFullSync) {
        await Promise.all([
          prayersIndexStorage?.clear(),
          sectionsStorage?.clear(),
        ]);
        await Promise.all([
          prayersIndexStorage?.putAll(response.elements),
          sectionsStorage?.putAll(response.sections),
        ]);
      } else {
        await performIncrementalSync(response);
      }
      
      // Сохраняем время последней синхронизации
      await metadataStorage?.setLastSyncTime('prayers');
      console.log("Prayers sync time saved");
      
      console.log("Prayers data cached successfully");
      console.timeEnd("Prayers cache elements and sections");
    } catch (err) {
      console.error("Failed to save prayers to cache:", err);
    }
  };

   /**
   * Выполняет инкрементальную синхронизацию
   */
   const performIncrementalSync = async (response: PrayersApiResponse): Promise<void> => {
    // Обновляем измененные элементы и секции
    for (const element of response.elements) {
      // Обновляем в кэше
      await prayersIndexStorage?.put(element);
    }

    for (const section of response.sections) {
      // Обновляем в кэше
      await sectionsStorage?.put(section);
    }

    // Удаляем элементы, которых больше нет на сервере
    const elementsToDelete = elements.value.filter(e => !response.all_element_ids.includes(e.id));
    const sectionsToDelete = sections.value.filter(s => !response.all_section_ids.includes(s.id));

    // Удаляем из кэша
    for (const element of elementsToDelete) {
      await prayersIndexStorage?.delete(element.id);
    }
    for (const section of sectionsToDelete) {
      await sectionsStorage?.delete(section.id);
    }

    if (elementsToDelete.length > 0 || sectionsToDelete.length > 0) {
      console.log(`Deleted ${elementsToDelete.length} elements and ${sectionsToDelete.length} sections`);
    }
  };

  /**
   * Получает текст молитвы (сначала из кэша, потом с сервера)
   */
  const getPrayerText = async (id: string): Promise<PrayerText> => {
    try {
      // Сначала проверяем кэш
      const cached = await prayerDetailsStorage?.get(id);
      if (cached) {
        return transformApiPrayerText(cached);
      }

      // Загружаем с сервера
      const response = await prayersApi.getPrayerText(id);
      // Сохраняем в кэш
      prayerDetailsStorage?.put(response);

      return transformApiPrayerText(response);
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


  /**
   * Принудительно обновляет данные с сервера (игнорирует время последней синхронизации)
   */
  const forceRefresh = async () => {
    try {
      console.log("Force refreshing prayers data...");
      const response = await prayersApi.getPrayers(); // Без параметра since
      
      // Полная замена данных
      elements.value = response.elements.map(transformApiElement);
      sections.value = response.sections.map(transformApiSection);
      
      await savePrayersToCache(response);
      console.log("Force refresh completed successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      error.value = errorMessage;
      console.error("Failed to force refresh prayers data:", errorMessage);
      throw err;
    }
  };

  /**
   * Получает время последней синхронизации
   */
  const getLastSyncTime = async (): Promise<Date | null> => {
    return await metadataStorage?.getLastSyncTime('prayers') || null;
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
    forceRefresh,
    getLastSyncTime,
  };
});
