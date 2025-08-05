import { BaseStorage } from "./BaseStorage";
import type { Language } from "@/types/common";

export interface  PaginationCacheItemHeader {
  tag: string;
  text: string;
  page: number;
}

/**
 * Интерфейс для элемента кэша пагинации
 */
export interface PaginationCacheItem {
  id: string;
  language: Language | 'default';
  hash: string;
  pages: string[];
  headers: PaginationCacheItemHeader[];
  accessedAt: Date;
}

/**
 * Настройки для создания хэша кэша
 */
export interface PaginationHashSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontFamilyCs: string;
  fontSizeCs: number;
  lineHeightCs: number;
  isTextAlignJustified: boolean;
  isTextWordsBreak: boolean;
  isTextPagePadding: boolean;
  isTextBold: boolean;
}

/**
 * Storage для кэширования страниц пагинации текста
 */
export class PaginationCacheStorage extends BaseStorage<"pagination-cache"> {
  private maxCacheSize: number;

  constructor(maxCacheSize: number = 100) {
    super("pagination-cache");
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Создает уникальный ключ для кэша на основе id и языка
   */
  private createCacheKey(id: string, language: Language | 'default'): string {
    return `${id}_${language}`;
  }

  /**
   * Создает хэш на основе настроек отображения текста
   */
  private createSettingsHash(settings: PaginationHashSettings, language: Language | 'default'): string {
    let settingsString = '';

    if (language == 'cs') {
      settingsString = JSON.stringify({
        fontFamilyCs: settings.fontFamilyCs,
        fontSizeCs: settings.fontSizeCs,
        lineHeightCs: settings.lineHeightCs,
        isTextAlignJustified: settings.isTextAlignJustified,
        isTextWordsBreak: settings.isTextWordsBreak,
        isTextPagePadding: settings.isTextPagePadding,
      });
    } else {
      settingsString = JSON.stringify({
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        lineHeight: settings.lineHeight,        
        isTextAlignJustified: settings.isTextAlignJustified,
        isTextWordsBreak: settings.isTextWordsBreak,
        isTextPagePadding: settings.isTextPagePadding,
        isTextBold: settings.isTextBold,
      });
    }    

    // Простая хэш-функция для строки
    let hash = 0;
    for (let i = 0; i < settingsString.length; i++) {
      const char = settingsString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Преобразуем в 32-битное число
    }
    return hash.toString(16);
  }

  /**
   * Получает кэшированные страницы для заданного id, языка и настроек
   */
  async getCachedPages(
    id: string,
    language: Language | 'default',
    settings: PaginationHashSettings
  ): Promise<{pages: string[], headers: PaginationCacheItemHeader[]} | null> {
    const cacheKey = this.createCacheKey(id, language);
    const settingsHash = this.createSettingsHash(settings, language);

    try {
      const cachedItem = await this.get(cacheKey);
      
      if (!cachedItem) {
        return null;
      }

      // Проверяем, совпадает ли хэш настроек
      if (cachedItem.hash !== settingsHash) {
        // Настройки изменились, удаляем устаревший кэш
        await this.delete(cacheKey);
        return null;
      }

      // Обновляем время последнего доступа
      await this.updateAccessTime(cacheKey);

      return {pages: cachedItem.pages, headers: cachedItem.headers};
    } catch (error) {
      console.error('Ошибка при получении кэшированных страниц:', error);
      return null;
    }
  }

  /**
   * Сохраняет страницы в кэш
   */
  async setCachedPages(
    id: string,
    language: Language | 'default',
    settings: PaginationHashSettings,
    pages: string[],
    headers: PaginationCacheItemHeader[]
  ): Promise<void> {
    const cacheKey = this.createCacheKey(id, language);
    const settingsHash = this.createSettingsHash(settings, language);
    const now = new Date();

    try {
      const cacheItem: PaginationCacheItem = {
        id: cacheKey,
        language,
        hash: settingsHash,
        pages,
        headers,
        accessedAt: now,
      };

      await this.put(cacheItem);

      // Проверяем и очищаем кэш, если превышен лимит
      await this.cleanupIfNeeded();
    } catch (error) {
      console.error('Ошибка при сохранении страниц в кэш:', error);
    }
  }

  /**
   * Обновляет время последнего доступа к элементу кэша
   */
  private async updateAccessTime(cacheKey: string): Promise<void> {
    try {
      const cachedItem = await this.get(cacheKey);
      if (cachedItem) {
        cachedItem.accessedAt = new Date();
        await this.put(cachedItem);
      }
    } catch (error) {
      console.error('Ошибка при обновлении времени доступа:', error);
    }
  }

  /**
   * Очищает кэш, если превышен максимальный размер
   */
  private async cleanupIfNeeded(): Promise<void> {
    try {
      const allItems = await this.getAll();
      
      if (allItems.length <= this.maxCacheSize) {
        return;
      }

      // Сортируем по времени последнего доступа (старые первыми)
      allItems.sort((a, b) => a.accessedAt.getTime() - b.accessedAt.getTime());

      // Удаляем самые старые элементы
      const itemsToDelete = allItems.length - this.maxCacheSize;
      const itemsToRemove = allItems.slice(0, itemsToDelete);

      for (const item of itemsToRemove) {
        await this.delete(item.id);
      }

      console.log(`Очищен кэш пагинации: удалено ${itemsToDelete} элементов`);
    } catch (error) {
      console.error('Ошибка при очистке кэша:', error);
    }
  }

  /**
   * Получает статистику кэша
   */
  async getCacheStats(): Promise<{
    totalItems: number;
    maxSize: number;
    oldestAccess: Date | null;
    newestAccess: Date | null;
  }> {
    try {
      const allItems = await this.getAll();
      
      if (allItems.length === 0) {
        return {
          totalItems: 0,
          maxSize: this.maxCacheSize,
          oldestAccess: null,
          newestAccess: null,
        };
      }

      const accessTimes = allItems.map(item => item.accessedAt.getTime());
      
      return {
        totalItems: allItems.length,
        maxSize: this.maxCacheSize,
        oldestAccess: new Date(Math.min(...accessTimes)),
        newestAccess: new Date(Math.max(...accessTimes)),
      };
    } catch (error) {
      console.error('Ошибка при получении статистики кэша:', error);
      return {
        totalItems: 0,
        maxSize: this.maxCacheSize,
        oldestAccess: null,
        newestAccess: null,
      };
    }
  }

  /**
   * Очищает весь кэш пагинации
   */
  async clearCache(): Promise<void> {
    try {
      await this.clear();
      console.log('Кэш пагинации полностью очищен');
    } catch (error) {
      console.error('Ошибка при очистке кэша:', error);
    }
  }

  /**
   * Удаляет кэш для конкретного элемента и языка
   */
  async removeCachedPages(id: string, language: Language | 'default'): Promise<void> {
    const cacheKey = this.createCacheKey(id, language);
    try {
      await this.delete(cacheKey);
    } catch (error) {
      console.error('Ошибка при удалении кэшированных страниц:', error);
    }
  }

  /**
   * Изменяет максимальный размер кэша
   */
  setMaxCacheSize(newSize: number): void {
    this.maxCacheSize = newSize;
  }

  /**
   * Получает максимальный размер кэша
   */
  getMaxCacheSize(): number {
    return this.maxCacheSize;
  }
} 