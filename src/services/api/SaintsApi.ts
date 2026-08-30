import { ApiClient } from '@/services/api/ApiClient';

/**
 * Интерфейсы для API ответов
 */
export interface SaintIndexApiElement {
  id: number;
  name: string;
}

interface SaintMemoDay {
  id: number;
  date_template: string;
  description: string;
  is_relative: boolean;
}

export interface SaintDetailApiElement {
  id: number;
  name: string;
  sort: number;
  type: string;
  text: string;
  picture: string;
  prayers_id: number | null;
  akathist_id: number[];
  canon_id: number[];
  minea_id: number[];
  hagiography_id: number[];
  memo_days: SaintMemoDay[];
  modified_ts: number;
}

/**
 * API для работы со святыми
 */
class SaintsApi extends ApiClient {
  /**
   * Получает индекс всех святых
   */
  async getSaintsIndex(): Promise<SaintIndexApiElement[]> {
    return this.get<SaintIndexApiElement[]>('/saints');
  }

  /**
   * Получает карточки святых постранично (saints/list)
   */
  async getSaintsList(): Promise<SaintDetailApiElement[]> {
    return this.getAllPages<SaintDetailApiElement>('/saints/list');
  }

  /**
   * Получает карточку святого
   */
  async getSaintDetail(id: number): Promise<SaintDetailApiElement> {
    return this.get<SaintDetailApiElement>(`/saints/${id}`);
  }
}

/**
 * Экземпляр API клиента
 */
export const saintsApi = new SaintsApi();
