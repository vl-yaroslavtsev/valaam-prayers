import { ApiClient } from '@/services/api/ApiClient';
import type { ApiResponse } from '@/services/api/types';

/** Код типа контента: для логики, иконок, маршрутизации. */
export type SearchItemType = 'prayers' | 'saints' | 'calendar';

export interface SearchItem {
  /** Id элемента. У календаря это id элемента, а не код дня (код дня внутри href). */
  id: number;
  /** Id инфоблока: 28 молитвы, 34 святые, 30 календарь. Для логики использовать type. */
  iblock_id: number;
  type: SearchItemType;
  /** Подпись типа для показа: «Молитвослов», «Святые», «Календарь» или «Книги». */
  type_name: string;
  /** Заголовок. HTML: только текст и тег <mark>. */
  name: string;
  /** Фрагмент текста вокруг совпадения. HTML: только текст и тег <mark>. */
  text: string;
  /** Путь по разделам, от начала книги или раздела вниз. Может быть пустым. */
  path: string[];
  /** Внутренний маршрут приложения. */
  href: string;
}

export interface SearchData {
  /** Сколько всего найдено. Нужно для подгрузки следующих страниц. */
  total: number;
  items: SearchItem[];
}

/**
 * Сервер ответил, но с `status: 'error'` (в отличие от сетевой ошибки/таймаута).
 * Нужна, чтобы не путать «сервер отказал» и «нет интернета» (тогда уходим в локальный поиск).
 */
export class SearchServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SearchServerError';
  }
}

class SearchApi extends ApiClient {
  protected unwrap<T>(response: ApiResponse<T>): T {
    try {
      return super.unwrap(response);
    } catch (err) {
      throw new SearchServerError(err instanceof Error ? err.message : 'API error');
    }
  }

  /**
   * Поиск по молитвам, святым и календарю (`GET /search`).
   * Страницы нумеруются с 1, `total` — общее число найденных.
   */
  async search(query: string, page: number, pageSize: number): Promise<SearchData> {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      page_size: String(pageSize),
    });
    return this.get<SearchData>(`/search?${params.toString()}`);
  }
}

export const searchApi = new SearchApi();
