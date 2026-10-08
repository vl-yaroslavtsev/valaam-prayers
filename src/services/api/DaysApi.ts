import { ApiClient } from '@/services/api/ApiClient';
import type { ApiNav } from '@/services/api/types';

/**
 * Размер иконки: s - для телефона, m - для планшета
 */
export type ImageSize = 's' | 'm';

interface CalendarDayPrayerBlock {
  text: string;
  picture: string;
  picture_2x: string;
  picture_3x: string;
  picture_desc: string;
  items: unknown[];
  taks: { id: number; name: string }[];
}

interface CalendarDayReading {
  id: number;
  name: string;
  text: string;
}

/**
 * Элемент ответа /days/list
 */
export interface CalendarDayApiElement {
  id: number;
  /** Дата в формате YYYYMMDD */
  code: string;
  text: string | null;
  picture: string;
  picture_2x: string;
  picture_3x: string;
  picture_desc: string;
  prayers: CalendarDayPrayerBlock;
  parabel: string;
  synaxarion: string | null;
  readings: CalendarDayReading[];
  readings_text: string;
  saints: unknown[];
  instructions: string;
  date_ts: number;
}

/**
 * Элемент ответа /days/icons — два URL иконки на день:
 * сама икона дня (`url`) и иконка молитвы дня (`prayers_url`)
 */
export interface CalendarDayIconApiElement {
  id: number;
  code: string;
  url: string;
  prayers_url: string;
}

/**
 * Маркеры дней для календаря: код дня (YYYYMMDD) -> строка маркеров (`e`, `h`, `g`, `v`, `f`, `w`, `l`, `c`
 * в произвольном порядке) или null, если у дня нет маркеров. Дни, которых нет в карте, в API отсутствуют
 */
export interface CalendarMarkersResponse {
  /** Начало диапазона календаря, unix-секунды */
  min: number;
  /** Конец диапазона календаря, unix-секунды */
  max: number;
  days: Record<string, string | null>;
}

/**
 * Сырой ответ /days/calendar: кроме кодов дней содержит служебные ключи min и max
 */
type CalendarMarkersRawResponse = Record<string, string | number | null>;

const DAY_CODE_REGEXP = /^\d{8}$/;

interface PageFetchOptions {
  since?: Date;
  signal?: AbortSignal;
  onBytes?: (bytes: number) => void;
}

/**
 * API для работы с календарём (дни, иконы дней)
 */
class DaysApi extends ApiClient {
  /**
   * Размер (в байтах) и количество дней за период
   */
  async getDaysCount(
    fromDate: string,
    toDate: string,
    since?: Date
  ): Promise<{ count: number; size: number }> {
    const search = new URLSearchParams({ from_date: fromDate, to_date: toDate });
    if (since) {
      search.set('modified_since', String(Math.floor(since.getTime() / 1000)));
    }
    return this.get<{ count: number; size: number }>(`/days/count?${search.toString()}`);
  }

  /**
   * Одна страница дней за период
   */
  async getDaysPage(
    fromDate: string,
    toDate: string,
    page: number,
    pageSize: number,
    options: PageFetchOptions = {}
  ): Promise<{ items: CalendarDayApiElement[]; nav: ApiNav; byteSize: number }> {
    return this.getPage<CalendarDayApiElement>(
      '/days/list',
      { from_date: fromDate, to_date: toDate },
      page,
      pageSize,
      options
    );
  }

  /**
   * День по коду даты (YYYYMMDD)
   */
  async getDayByCode(code: string): Promise<CalendarDayApiElement> {
    return this.get<CalendarDayApiElement>(`/days/${code}`);
  }

  /**
   * Маркеры (раскраска) всех дней календаря и границы диапазона min/max
   */
  async getCalendarMarkers(): Promise<CalendarMarkersResponse> {
    const raw = await this.get<CalendarMarkersRawResponse>('/days/calendar');

    const days: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (DAY_CODE_REGEXP.test(key)) {
        days[key] = typeof value === 'string' ? value : null;
      }
    }

    return { min: Number(raw.min), max: Number(raw.max), days };
  }

  /**
   * Размер (в байтах) и количество иконок дней за период
   */
  async getDaysIconsCount(
    fromDate: string,
    toDate: string,
    imageSize: ImageSize,
    since?: Date
  ): Promise<{ count: number; size: number }> {
    const search = new URLSearchParams({ from_date: fromDate, to_date: toDate, image_size: imageSize });
    if (since) {
      search.set('modified_since', String(Math.floor(since.getTime() / 1000)));
    }
    return this.get<{ count: number; size: number }>(`/days/icons/count?${search.toString()}`);
  }

  /**
   * Одна страница со списком URL иконок дней за период
   */
  async getDaysIconsPage(
    fromDate: string,
    toDate: string,
    imageSize: ImageSize,
    page: number,
    pageSize: number,
    options: PageFetchOptions = {}
  ): Promise<{ items: CalendarDayIconApiElement[]; nav: ApiNav; byteSize: number }> {
    return this.getPage<CalendarDayIconApiElement>(
      '/days/icons',
      { from_date: fromDate, to_date: toDate, image_size: imageSize },
      page,
      pageSize,
      options
    );
  }
}

/**
 * Экземпляр API клиента
 */
export const daysApi = new DaysApi();
