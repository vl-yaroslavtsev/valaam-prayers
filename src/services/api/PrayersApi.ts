import { ApiClient } from '@/services/api/ApiClient';
import type { Language } from '@/types/common';

/**
 * Интерфейсы для API ответов
 */
export interface PrayerApiElement {
  id: string;
  name: string;
  parent: string;
  parents: string[];
  lang: Language[];
  sort: number;
}

export interface PrayerApiSection {
  id: string;
  name: string;
  parent: string;
  sort: number;
}

export interface PrayersApiResponse {
  elements: PrayerApiElement[];
  sections: PrayerApiSection[];
  all_element_ids: string[];
  all_section_ids: string[];
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
  async getPrayers(since?: Date): Promise<PrayersApiResponse> {
    let url = '/prayers/';
    if (since) {
      url += `?since=${since.toISOString()}`;
    }
    return this.get<PrayersApiResponse>(url);
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