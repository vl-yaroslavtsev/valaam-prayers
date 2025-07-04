import { fetchJson } from '@/services/api/utils';

/**
 * Базовая конфигурация API
 */
const API_CONFIG = {
  baseUrl: 'https://molitvoslov.valaam.ru/rest',
  timeout: 15000,
  retries: 1,
  retryDelay: 1000,
} as const;


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

  /**
   * Выполняет GET запрос
   */
  async get<T>(endpoint: string): Promise<T> {
    const url = this.createUrl(endpoint);
    const result = await fetchJson<T>(url, {
      timeout: this.timeout,
      retries: this.retries,
      retryDelay: this.retryDelay,
    });
    return result.data;
  }
}
