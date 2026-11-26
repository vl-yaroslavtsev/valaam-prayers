import { parsePrayerItemKey, parseSaintKey } from "@/js/itemKey";
import type { FavoritesItem, FavoriteType } from "@/stores/favorites";
import type { ReadingHistoryItem } from "@/stores/readingHistory";
import type { Language } from "@/types/common";

export type FavoriteFilterId =
  | "all"
  | "scripture"
  | "prayers"
  | "saints"
  | "books"
  | "thoughts"
  | "instructions";

export interface FavoriteFilterChip {
  id: FavoriteFilterId;
  title: string;
}

interface FavoriteCategoryChip extends FavoriteFilterChip {
  id: Exclude<FavoriteFilterId, "all">;
  types: readonly FavoriteType[];
}

const ALL_CHIP: FavoriteFilterChip = { id: "all", title: "Все" };

export const FAVORITE_CATEGORY_CHIPS: readonly FavoriteCategoryChip[] = [
  { id: "scripture", title: "Библия", types: ["bible", "readings"] },
  { id: "prayers", title: "Молитвы", types: ["prayers"] },
  { id: "saints", title: "Святые", types: ["saints"] },
  { id: "books", title: "Книги", types: ["books"] },
  { id: "thoughts", title: "Мысли и притчи", types: ["thoughts", "parables"] },
  { id: "instructions", title: "Указания", types: ["instructions"] },
];

const CATEGORY_BY_ID = new Map(FAVORITE_CATEGORY_CHIPS.map((chip) => [chip.id, chip]));

/**
 * Доступные чипсы Избранного в заданном порядке.
 * Показываются только чипсы, у которых есть элементы; если непустая категория
 * всего одна (или пусто), чипсы не выводятся вообще.
 */
export function getAvailableFavoriteChips(favorites: readonly FavoritesItem[]): FavoriteFilterChip[] {
  const presentTypes = new Set(favorites.map((item) => item.type));
  const activeCategories = FAVORITE_CATEGORY_CHIPS.filter((chip) =>
    chip.types.some((type) => presentTypes.has(type))
  );

  if (activeCategories.length <= 1) {
    return [];
  }

  return [ALL_CHIP, ...activeCategories.map(({ id, title }) => ({ id, title }))];
}

export function filterFavoritesByChip(
  favorites: readonly FavoritesItem[],
  filter: FavoriteFilterId
): FavoritesItem[] {
  if (filter === "all") {
    return [...favorites].sort((a, b) => a.sort - b.sort);
  }
  const category = CATEGORY_BY_ID.get(filter);
  if (!category) {
    return [];
  }
  return favorites
    .filter((item) => category.types.includes(item.type))
    .sort((a, b) => a.sort - b.sort);
}

/**
 * Для мысли дня, притчи дня и карточки святого прогресс чтения не хранится,
 * поэтому в списке Избранного у них не показывается кнопка сброса прогресса.
 */
export function canFavoriteResetProgress(type: FavoriteType): boolean {
  return type !== "thoughts" && type !== "parables" && type !== "saints";
}

export interface HomeDataLookups {
  getPrayerById(id: number): { name: string; url: string } | undefined;
  getPrayerLanguages(item: { name: string; url: string }): Language[];
  getSaintById(id: number): { name: string } | undefined;
  getHistoryItem(id: string): ReadingHistoryItem | undefined;
}

export interface HydratedFavoriteItem extends FavoritesItem {
  name: string;
  url: string;
  lang: Language[];
  canResetProgress: boolean;
  progress?: number;
  pages?: number;
  lastReadAt?: Date;
}

export function hydrateFavoriteItem(
  f: FavoritesItem,
  lookups: HomeDataLookups
): HydratedFavoriteItem {
  const canResetProgress = canFavoriteResetProgress(f.type);
  const history = canResetProgress ? lookups.getHistoryItem(f.id) : undefined;
  let name = "";
  let url = "";
  let lang: Language[] = [];

  if (f.type === "books" || f.type === "prayers" || f.type === "bible") {
    const rawId = parsePrayerItemKey(f.id);
    const item = rawId != null ? lookups.getPrayerById(rawId) : undefined;
    if (item) {
      name = item.name;
      url = item.url;
      lang = lookups.getPrayerLanguages(item);
    }
  } else if (f.type === "saints") {
    const saintId = parseSaintKey(f.id);
    if (saintId != null) {
      const saint = lookups.getSaintById(saintId);
      if (saint) {
        name = saint.name;
      }
      url = `/saints/${saintId}`;
    }
  } else {
    name = f.title ?? "";
    url = f.url ?? "";
  }

  return {
    ...f,
    canResetProgress,
    progress: history?.progress,
    pages: history?.pages,
    lastReadAt: history?.lastReadAt,
    name,
    url,
    lang,
  };
}

export interface HydratedHistoryItem extends ReadingHistoryItem {
  name: string;
  url: string;
}

export function buildLastReadingItems(
  items: readonly ReadingHistoryItem[],
  getPrayerById: (id: number) => { name: string; url: string } | undefined
): HydratedHistoryItem[] {
  return items.map((r) => {
    let name = "";
    let url = "";

    if (r.type === "prayers" || r.type === "books") {
      const rawId = parsePrayerItemKey(r.id);
      const item = rawId != null ? getPrayerById(rawId) : undefined;
      if (item) {
        name = item.name;
        url = item.url;
      }
    } else {
      name = r.title ?? "";
      url = r.url ?? "";
    }

    return {
      ...r,
      name,
      url,
    };
  });
}
