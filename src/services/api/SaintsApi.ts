import { ApiClient } from '@/services/api/ApiClient';
import type { Language } from '@/types/common';

/**
 * Интерфейсы для API ответов
 */
export interface SaintIndexApiElement {
  id: string;
  name: string;
}

interface SaintMemoDay {
  id: string;
  date_template: string;
  description: string;
  is_relative: boolean;
}

export interface SaintDetailApiElement {
  id: string;
  name: string;
  sort: string;
  type: string;
  text: string;
  picture: string;
  prayers_id: string;
  akathist_id: string[];
  canon_id: string[];
  minea_id: string[];
  hagiography_id: string[];
  memo_days: SaintMemoDay[];
}

/**
 * API для работы с молитвами
 */
class SaintsApi extends ApiClient {
  /**
   * Получает список всех молитв и секций
   */
  async getSaintsIndex(): Promise<SaintIndexApiElement[]> {
    return this.get<SaintIndexApiElement[]>('/saints/');
  }

  /**
   * Получает текст конкретной молитвы
   */
  async getSaintDetail(id: string): Promise<SaintDetailApiElement> {
    return this.get<SaintDetailApiElement>(`/saints/${id}`);
  }
}

/**
 * Экземпляр API клиента
 */
export const saintsApi = new SaintsApi();