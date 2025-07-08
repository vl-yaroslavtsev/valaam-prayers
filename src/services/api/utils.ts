
/**
 * Интерфейс для опций запроса
 */
export interface FetchJsonOptions {
  /** Таймаут запроса в миллисекундах (по умолчанию 10000) */
  timeout?: number;
  /** Количество попыток повторного запроса (по умолчанию 1) */
  retries?: number;
  /** Задержка между попытками в миллисекундах (по умолчанию 1000) */
  retryDelay?: number;
  /** Дополнительные заголовки */
  headers?: Record<string, string>;
  /** HTTP метод (по умолчанию GET) */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Тело запроса для POST/PUT/PATCH */
  body?: any;
  /** Кэширование запроса (по умолчанию 'default') */
  cache?: RequestCache;
}

/**
 * Результат запроса JSON данных
 */
export interface FetchJsonResult<T> {
  /** Полученные данные */
  data: T;
  /** Статус HTTP ответа */
  status: number;
  /** Заголовки ответа */
  headers: Headers;
  /** Успешность запроса */
  ok: boolean;
}

/**
 * Универсальная функция для получения JSON данных по сети
 * @param url - URL для запроса
 * @param options - Опции запроса
 * @returns Promise с результатом запроса
 */
export async function fetchJson<T = any>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<FetchJsonResult<T>> {
  const {
    timeout = 10000,
    retries = 1,
    retryDelay = 1000,
    headers = {},
    method = 'GET',
    body,
    cache = 'default'
  } = options;

  // Настройка заголовков по умолчанию
  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...headers
  };

  if (method !== 'GET') {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // Настройка тела запроса
  const requestBody = body && method !== 'GET' 
    ? (typeof body === 'string' ? body : JSON.stringify(body))
    : undefined;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Создаем контроллер для отмены запроса по таймауту
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: defaultHeaders,
        body: requestBody,
        cache,
        signal: controller.signal
      });

      clearTimeout(timeoutId);


      if (response.status === 404) {
        throw new Error('Not found');
      }

      // Проверяем статус ответа
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      // Проверяем, что ответ содержит JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }

      // Парсим JSON
      const data = await response.json();

      return {
        data,
        status: response.status,
        headers: response.headers,
        ok: response.ok
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      console.warn(`Fetch attempt ${attempt + 1} failed:`, lastError.message);

      // Если это последняя попытка, выбрасываем ошибку
      if (attempt === retries) {
        break;
      }

      // Ждем перед следующей попыткой
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  // Выбрасываем последнюю ошибку
  throw lastError;
}

/**
 * Упрощенная функция для получения JSON данных (только для GET запросов)
 * @param url - URL для запроса
 * @param timeout - Таймаут в миллисекундах
 * @returns Promise с данными
 */
export async function getJson<T = any>(url: string, timeout = 10000): Promise<T> {
  const result = await fetchJson<T>(url, { timeout });
  return result.data;
}

/**
 * Функция для POST запроса с JSON данными
 * @param url - URL для запроса
 * @param data - Данные для отправки
 * @param options - Дополнительные опции
 * @returns Promise с результатом
 */
export async function postJson<T = any, R = any>(
  url: string,
  data: T,
  options: Omit<FetchJsonOptions, 'method' | 'body'> = {}
): Promise<FetchJsonResult<R>> {
  return fetchJson<R>(url, {
    ...options,
    method: 'POST',
    body: data
  });
}

/**
 * Функция для PUT запроса с JSON данными
 * @param url - URL для запроса
 * @param data - Данные для отправки
 * @param options - Дополнительные опции
 * @returns Promise с результатом
 */
export async function putJson<T = any, R = any>(
  url: string,
  data: T,
  options: Omit<FetchJsonOptions, 'method' | 'body'> = {}
): Promise<FetchJsonResult<R>> {
  return fetchJson<R>(url, {
    ...options,
    method: 'PUT',
    body: data
  });
}

/**
 * Функция для DELETE запроса
 * @param url - URL для запроса
 * @param options - Дополнительные опции
 * @returns Promise с результатом
 */
export async function deleteJson<T = any>(
  url: string,
  options: Omit<FetchJsonOptions, 'method'> = {}
): Promise<FetchJsonResult<T>> {
  return fetchJson<T>(url, {
    ...options,
    method: 'DELETE'
  });
}