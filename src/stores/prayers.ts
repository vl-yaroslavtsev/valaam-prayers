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

export interface PrayerElement extends PrayerApiElement {
  url: string;
}

export interface PrayerSection extends PrayerApiSection {
  url: string;
}

export interface PrayerText extends PrayerTextApiResponse {
  lang: Language[];
}

const BIBLE_SECTION_ID = "1078";
const MOLITVOSLOV_SECTION_ID = "842";
export const BOOKS_SECTION_ID = "1983";

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
    if (s.compose) {
      return {
        ...s,
        url: "/prayers/composed-text/" + s.id,
      };
    }
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
      throw err;
    } finally {
      isLoading.value = false;
    }

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
      // const cached = await prayerDetailsStorage?.get(id);
      // if (cached) {
      //   return transformApiPrayerText(cached);
      // }

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

  /**
   * Получает тексты всех элементов в разделе (рекурсивно)
   */
  const getComposedPrayerText = async (sectionId: string): Promise<PrayerText> => {
    try {
      // Получаем все тексты молитв в разделе с сервера
      const response = await prayersApi.getPrayerTextsBySection(sectionId);
      
      // Получаем информацию о самом разделе
      const section = getItemById(sectionId) as PrayerSection;
      const sectionName = section?.name || '';
      const header = `<h1>${sectionName}</h1>\n\n`;
      
      // Собираем все доступные языки
      const allLanguages = new Set<Language>();
      let hasCommonText = false;
      response.data.forEach(prayer => {
        if (prayer.text && !hasCommonText)  hasCommonText = true;
        if (prayer.text_cs) allLanguages.add('cs');
        if (prayer.text_cs_cf) allLanguages.add('cs-cf');
        if (prayer.text_ru) allLanguages.add('ru');
      });
      
      const text = hasCommonText ? header + buildSectionText(sectionId, response.data, 2, '') : '';

      // Строим тексты для каждого языка
      const text_cs_cf = allLanguages.has('cs-cf') ? header + buildSectionText(sectionId, response.data, 2, 'cs-cf') : '';
      const text_cs = allLanguages.has('cs') ? header + buildSectionText(sectionId, response.data, 2, 'cs') : '';
      const text_ru = allLanguages.has('ru') ? header + buildSectionText(sectionId, response.data, 2, 'ru') : '';
      
      // Возвращаем в том же формате, что и getPrayerText
      return {
        id: sectionId,
        name: sectionName,
        parent: section?.parent || '',
        text,
        text_cs,
        text_cs_cf,
        text_ru,
        lang: Array.from(allLanguages)
      };
    } catch (err) {
      console.error(`Failed to get prayer texts for section ${sectionId}:`, err);
      throw err;
    }
  };

  /**
   * Строит текст для раздела на основе уже полученных данных
   */
  const buildSectionText = (
    sectionId: string, 
    prayerTexts: PrayerTextApiResponse[], 
    headerLevel: number = 2,
    language: Language | '' = 'cs-cf'
  ): string => {
    let result = '';
    const maxHeaderLevel = 6;
    
    // Получаем элементы текущего раздела
    const items = getItemsBySection(sectionId);
    
    for (const item of items) {
      if ('parent' in item && 'parents' in item) {
        // Это элемент (молитва) - ищем его в полученных данных
        const prayerText = prayerTexts.find(p => p.id === item.id);
        if (prayerText) {
          const currentHeaderLevel = Math.min(headerLevel, maxHeaderLevel);
          const headerTag = `h${currentHeaderLevel}`;
          result += `<${headerTag}>${item.name}</${headerTag}>\n\n`;
          
          // Выбираем текст в зависимости от языка
          let text = '';
          switch (language) {
            case '':
              text = prayerText.text || '';
              break;
            case 'cs-cf':
              text = prayerText.text_cs_cf || '';
              break;
            case 'cs':
              text = prayerText.text_cs || '';
              break;
            case 'ru':
              text = prayerText.text_ru || '';
              break;
            default:
              text = prayerText.text_cs_cf || '';
          }

          // Понижаем существующие заголовки на один уровень
          text = text.replace(/<h([1-6])([^>]*>.*?<\/h)[1-6]>/g, (match, level, content) => {
            const currentLevel = parseInt(level);
            if (currentLevel >= currentHeaderLevel) {
              const newLevel = Math.min(currentLevel + 1, 6);
              return `<h${newLevel}${content}${newLevel}>`;
            }
            return match;
          });
          
          result += text + '\n\n';
        }
      } else {
        // Это подраздел - добавляем заголовок и рекурсивно обрабатываем
        const currentHeaderLevel = Math.min(headerLevel, maxHeaderLevel);
        const headerTag = `h${currentHeaderLevel}`;
        result += `<${headerTag}>${item.name}</${headerTag}>\n\n`;
        
        // Рекурсивно обрабатываем подраздел с теми же полученными данными
        const subsectionText = buildSectionText(item.id, prayerTexts, headerLevel + 1, language);
        result += subsectionText;
      }
    }
    
    return result;
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

  const isBook = (itemId: string) => {
    return isItemInSection(itemId, BOOKS_SECTION_ID);
  };

  const isItemInSection = (itemId: string, sectionId: string) => {
    const isBooks = sectionId === BOOKS_SECTION_ID;

    let item = getItemById(itemId);
    while (item) {
      if (item.id === sectionId || item.parent === sectionId) {
        return true;
      }

      // В книгах выводим в начале Библию
      if (isBooks && item.id === BIBLE_SECTION_ID) {
        return true;
      }
      
      item = getItemById(item.parent);
    }

    return false;
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
    isItemInSection,
    isBook,
    // Actions
    initStore,
    fetchPrayers,
    getPrayerText,
    getComposedPrayerText,
    forceRefresh,
    getLastSyncTime,
  };
});
