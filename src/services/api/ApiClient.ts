import { fetchJson } from '@/services/api/utils';
import type { ApiResponse, ApiListData } from '@/services/api/types';

/**
 * Базовая конфигурация API
 */
const API_CONFIG = {
  baseUrl: 'https://app.valaam.ru/api',
  timeout: 15000,
  retries: 0,
  retryDelay: 1000,
} as const;

const API_PAGE_SIZE = 200;

/**
 * Базовый класс для работы с API
 */
export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private retryDelay: number;

  constructor(config = API_CONFIG) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.retries = config.retries;
    this.retryDelay = config.retryDelay;
  }

  /**
   * Создает полный URL для запроса
   */
  private createUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }

  private unwrap<T>(response: ApiResponse<T>): T {
    if (response.status !== 'success' || response.data == null) {
      const message = response.errors?.[0]?.message ?? 'API error';
      throw new Error(message);
    }
    return response.data;
  }

  /**
   * Выполняет GET запрос и возвращает содержимое data из обёртки API
   */
  async get<T>(endpoint: string): Promise<T> {
    const url = this.createUrl(endpoint);
    const result = await fetchJson<ApiResponse<T>>(url, {
      timeout: this.timeout,
      retries: this.retries,
      retryDelay: this.retryDelay,
    });
    return this.unwrap(result.data);
  }

  private buildListEndpoint(
    path: string,
    params: Record<string, string | number>,
    pageNum: number
  ): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      search.set(key, String(value));
    }
    search.set('page_size', String(API_PAGE_SIZE));
    search.set('page_num', String(pageNum));
    return `${path}?${search.toString()}`;
  }

  /**
   * Загружает все страницы list-эндпоинта ({ items, nav }).
   */
  protected async getAllPages<T>(
    path: string,
    params: Record<string, string | number> = {}
  ): Promise<T[]> {
    const first = await this.get<ApiListData<T>>(this.buildListEndpoint(path, params, 1));
    const items = [...(first.items ?? [])];
    const pageCount = first.nav?.page_count ?? 1;

    for (let pageNum = 2; pageNum <= pageCount; pageNum++) {
      const page = await this.get<ApiListData<T>>(this.buildListEndpoint(path, params, pageNum));
      items.push(...(page.items ?? []));
    }

    return items;
  }
}
