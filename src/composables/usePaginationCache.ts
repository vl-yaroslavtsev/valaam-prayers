import { computed } from "vue";
import { useSettingsStore } from "@/stores/settings";
import { paginationCacheStorage } from "@/services/storage";
import type { Language } from "@/types/common";
import type { PaginationHashSettings } from "@/services/storage/PaginationCacheStorage";
import { paginateText } from "@/text-processing";

/**
 * Композабл для работы с кэшем пагинации
 */
export function usePaginationCache() {
  const settingsStore = useSettingsStore();

  /**
   * Получает текущие настройки текста для создания хэша
   */
  const getCurrentTextSettings = (): PaginationHashSettings => {
    return {
      fontFamily: settingsStore.fontFamily,
      fontSize: settingsStore.fontSize,
      lineHeight: settingsStore.lineHeight,
      fontFamilyCs: settingsStore.fontFamilyCs,
      fontSizeCs: settingsStore.fontSizeCs,
      lineHeightCs: settingsStore.lineHeightCs,
      isTextAlignJustified: settingsStore.isTextAlignJustified,
      isTextWordsBreak: settingsStore.isTextWordsBreak,
      isTextPagePadding: settingsStore.isTextPagePadding,
      isTextBold: settingsStore.isTextBold,
    };
  };

  /**
   * Получает кэшированные страницы или создает новые
   */
  const getPaginatedText = async (
    id: string,
    language: Language | null,
    text: string,
    container?: HTMLElement,
    cssClasses?: string
  ): Promise<string[]> => {
    if (!paginationCacheStorage) {
      console.warn('PaginationCacheStorage не инициализирован, используем прямую пагинацию');
      return paginateText(text, container, cssClasses);
    }

    // Используем 'default' если язык не указан
    const cacheLanguage: Language | 'default' = language || 'default';
    const settings = getCurrentTextSettings();

    try {
      // Пытаемся получить кэшированные страницы
      const cachedPages = await paginationCacheStorage.getCachedPages(id, cacheLanguage, settings);
      
      if (cachedPages) {
        console.log(`Загружены кэшированные страницы для ${id}_${cacheLanguage}`);
        return cachedPages;
      }

      // Если кэша нет, создаем страницы
      console.log(`Создаем новые страницы для ${id}_${cacheLanguage}`);
      const pages = await paginateText(text, container, cssClasses);

              // Сохраняем в кэш только если страниц больше 100
        if (pages.length > 100) {
          console.log(`Сохраняем в кэш ${pages.length} страниц для ${id}_${cacheLanguage}`);
          await paginationCacheStorage.setCachedPages(id, cacheLanguage, settings, pages);
        } else {
          console.log(`Не сохраняем в кэш: только ${pages.length} страниц (требуется >100)`);
        }
      
      return pages;
    } catch (error) {
      console.error('Ошибка при работе с кэшем пагинации:', error);
      // В случае ошибки возвращаемся к прямой пагинации
      return paginateText(text, container, cssClasses);
    }
  };

  /**
   * Очищает кэш для конкретного элемента
   */
  const clearItemCache = async (id: string, language: Language | null): Promise<void> => {
    if (!paginationCacheStorage) {
      return;
    }

    const cacheLanguage: Language | 'default' = language || 'default';

    try {
      await paginationCacheStorage.removeCachedPages(id, cacheLanguage);
      console.log(`Очищен кэш для ${id}_${cacheLanguage}`);
    } catch (error) {
      console.error('Ошибка при очистке кэша элемента:', error);
    }
  };

  /**
   * Очищает весь кэш пагинации
   */
  const clearAllCache = async (): Promise<void> => {
    if (!paginationCacheStorage) {
      return;
    }

    try {
      await paginationCacheStorage.clearCache();
      console.log('Весь кэш пагинации очищен');
    } catch (error) {
      console.error('Ошибка при очистке всего кэша:', error);
    }
  };

  /**
   * Получает статистику кэша
   */
  const getCacheStats = async () => {
    if (!paginationCacheStorage) {
      return {
        totalItems: 0,
        maxSize: 0,
        oldestAccess: null,
        newestAccess: null,
      };
    }

    try {
      return await paginationCacheStorage.getCacheStats();
    } catch (error) {
      console.error('Ошибка при получении статистики кэша:', error);
      return {
        totalItems: 0,
        maxSize: 0,
        oldestAccess: null,
        newestAccess: null,
      };
    }
  };

  /**
   * Устанавливает максимальный размер кэша
   */
  const setMaxCacheSize = (size: number): void => {
    if (!paginationCacheStorage) {
      return;
    }

    paginationCacheStorage.setMaxCacheSize(size);
  };

  /**
   * Получает максимальный размер кэша
   */
  const getMaxCacheSize = (): number => {
    if (!paginationCacheStorage) {
      return 0;
    }

    return paginationCacheStorage.getMaxCacheSize();
  };

  /**
   * Проверяет, доступен ли кэш
   */
  const isCacheAvailable = computed(() => {
    return paginationCacheStorage !== null;
  });

  return {
    // Основные функции
    getPaginatedText,
    clearItemCache,
    clearAllCache,
    
    // Управление кэшем
    getCacheStats,
    setMaxCacheSize,
    getMaxCacheSize,
    
    // Состояние
    isCacheAvailable,
    
    // Утилиты
    getCurrentTextSettings,
  };
} 