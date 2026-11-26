import type { FavoriteType } from "@/stores/favorites";
import type { ReadingType } from "@/stores/readingHistory";
import type { Language } from "@/types/common";

/** Нормализованный документ для общей читалки (TextReaderPage) */
export interface ReaderTextDocument {
  title?: string;
  /** Заголовок для сохранения в Избранное (если отличается от заголовка в читалке) */
  favoriteTitle?: string;
  text?: string;
  text_cs?: string;
  text_cs_cf?: string;
  text_ru?: string;
  lang: Language[];
  modified_ts?: number;
}

export interface ReaderFavoriteConfig {
  type: FavoriteType;
  /** Сохранять title и url в записи Избранного (для сущностей без общего индекса) */
  withMeta?: boolean;
}

export interface ReaderHistoryConfig {
  type: ReadingType;
  /** Сохранять title и url в записи истории (для сущностей без общего индекса) */
  withMeta?: boolean;
}
