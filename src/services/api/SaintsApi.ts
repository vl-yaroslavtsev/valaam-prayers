import { ApiClient } from '@/services/api/ApiClient';
import type { ApiNav } from '@/services/api/types';
import type { ImageSize } from '@/services/api/DaysApi';

/**
 * Интерфейсы для API ответов
 */
export interface SaintIndexApiElement {
  id: number;
  name: string;
}

/**
 * Элемент ответа /saints/icons
 */
export interface SaintIconApiElement {
  id: number;
  url: string;
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
  async getSaintsIndex(since?: Date): Promise<SaintIndexApiElement[]> {
    let url = '/saints';
    if (since) {
      const modifiedSince = Math.floor(since.getTime() / 1000);
      url += `?modified_since=${modifiedSince}`;
    }
    return this.get<SaintIndexApiElement[]>(url);
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

  /**
   * Размер (в байтах) и количество карточек святых — для офлайн-скачивания
   */
  async getSaintsCount(since?: Date): Promise<{ count: number; size: number }> {
    let url = '/saints/count';
    if (since) {
      url += `?modified_since=${Math.floor(since.getTime() / 1000)}`;
    }
    return this.get<{ count: number; size: number }>(url);
  }

  /**
   * Одна страница карточек святых (saints/list) с отслеживанием прогресса — для офлайн-скачивания
   */
  async getSaintsPage(
    page: number,
    pageSize: number,
    options: { since?: Date; signal?: AbortSignal; onBytes?: (bytes: number) => void } = {}
  ): Promise<{ items: SaintDetailApiElement[]; nav: ApiNav; byteSize: number }> {
    return this.getPage<SaintDetailApiElement>('/saints/list', {}, page, pageSize, options);
  }

  /**
   * Размер (в байтах) и количество иконок святых — для офлайн-скачивания
   */
  async getSaintsIconsCount(
    imageSize: ImageSize,
    since?: Date
  ): Promise<{ count: number; size: number }> {
    const search = new URLSearchParams({ image_size: imageSize });
    if (since) {
      search.set('modified_since', String(Math.floor(since.getTime() / 1000)));
    }
    return this.get<{ count: number; size: number }>(`/saints/icons/count?${search.toString()}`);
  }

  /**
   * Одна страница со списком URL иконок святых
   */
  async getSaintsIconsPage(
    imageSize: ImageSize,
    page: number,
    pageSize: number,
    options: { since?: Date; signal?: AbortSignal; onBytes?: (bytes: number) => void } = {}
  ): Promise<{ items: SaintIconApiElement[]; nav: ApiNav; byteSize: number }> {
    return this.getPage<SaintIconApiElement>('/saints/icons', { image_size: imageSize }, page, pageSize, options);
  }
}

/**
 * Экземпляр API клиента
 */
export const saintsApi = new SaintsApi();
