/**
 * Единые строковые ключи пользовательских таблиц (favorites, reading-history, bookmarks)
 * и кэша пагинации. Исключают коллизии между разными сущностями (молитвы, святые, дни).
 */

export const getPrayerItemKey = (id: number): string => `prayer:${id}`;
export const getSaintKey = (id: number): string => `saint:${id}`;
export const getSaintLifeKey = (id: number): string => `saint-life:${id}`;
export const getDayTextKey = (code: string, kind: string): string => `day:${code}:${kind}`;
export const getReadingKey = (code: string, readingId: number): string =>
  `reading:${code}:${readingId}`;

const parseNumericSuffix = (key: unknown, prefix: string): number | null => {
  if (typeof key !== "string" || !key.startsWith(prefix)) return null;
  const raw = key.slice(prefix.length);
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

export const parsePrayerItemKey = (key: string): number | null =>
  parseNumericSuffix(key, "prayer:");

export const parseSaintKey = (key: string): number | null =>
  parseNumericSuffix(key, "saint:");
