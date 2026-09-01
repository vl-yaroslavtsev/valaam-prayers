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
