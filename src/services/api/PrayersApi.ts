import { ApiClient } from '@/services/api/ApiClient';
import type { Language } from '@/types/common';

/**
 * Интерфейсы для API ответов
 */
export interface PrayerApiElement {
  id: number;
  name: string;
  parent: number | null;
  parents: number[];
  lang: Language[];
  sort: number;
}

export interface PrayerApiSection {
  id: number;
  name: string;
  parent: number | null;
  sort: number;
  book_root: boolean;
  compose: boolean;
}

export interface PrayersApiResponse {
  elements: PrayerApiElement[];
  sections: PrayerApiSection[];
  all_element_ids: number[];
  all_section_ids: number[];
}

export interface PrayerTextApiResponse {
  id: number;
  name: string;
  parent: number | null;
  text: string;
  text_cs: string;
  text_cs_cf: string;
  text_ru: string;
  modified_ts: number;
}

/**
 * API для работы с молитвами
 */
class PrayersApi extends ApiClient {
  /**
   * Получает список всех молитв и секций
   */
  async getPrayers(since?: Date): Promise<PrayersApiResponse> {
    let url = '/prayers';
    if (since) {
      url += `?since=${since.toISOString()}`;
    }
    return this.get<PrayersApiResponse>(url);
  }

  /**
   * Получает текст конкретной молитвы
   */
  async getPrayerText(id: number): Promise<PrayerTextApiResponse> {
    return this.get<PrayerTextApiResponse>(`/prayers/${id}`);
  }

  /**
   * Получает тексты всех элементов раздела (все страницы list, page_size ≤ 200)
   */
  async getPrayerTextsBySection(sectionId: number): Promise<PrayerTextApiResponse[]> {
    return this.getAllPages<PrayerTextApiResponse>('/prayers/list', {
      section_id: sectionId,
    });
  }
}

/**
 * Экземпляр API клиента
 */
export const prayersApi = new PrayersApi();
