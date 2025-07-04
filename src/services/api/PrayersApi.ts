import { ApiClient } from '@/services/api/ApiClient';
import type { Lang } from '@/types/common';

/**
 * Интерфейсы для API ответов
 */
export interface PrayerApiElement {
  id: string;
  name: string;
  parent: string;
  parents: string[];
  lang: Lang[];
  sort: number;
}

export interface PrayerApiSection {
  id: string;
  name: string;
  parent: string;
  sort: number;
}

export interface PrayersApiResponse {
  e: PrayerApiElement[];
  s: PrayerApiSection[];
}

export interface PrayerTextApiResponse {
  id: string;
  name: string;
  parent: string;
  text: string;
  text_cs: string;
  text_cs_cf: string;
  text_ru: string;
}

/**
 * API для работы с молитвами
 */
class PrayersApi extends ApiClient {
  /**
   * Получает список всех молитв и секций
   */
  async getPrayers(): Promise<PrayersApiResponse> {
    return this.get<PrayersApiResponse>('/prayers/');
  }

  /**
   * Получает текст конкретной молитвы
   */
  async getPrayerText(id: string): Promise<PrayerTextApiResponse> {
    return this.get<PrayerTextApiResponse>(`/prayers/${id}`);
  }
}

/**
 * Экземпляр API клиента
 */
export const prayersApi = new PrayersApi();