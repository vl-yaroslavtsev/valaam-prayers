import { createPrayerText } from "@/components/calendar/dayText";
import type { ReaderHistoryConfig } from "@/components/textReader";
import { getSaintLifeKey } from "@/js/itemKey";
import type { PrayerText } from "@/stores/prayers";
import type { SaintDetails } from "@/stores/saints";

export interface SaintLifeReaderConfig {
  saintId: number;
  itemId: string;
  initialTitle: string;
  itemUrl: string;
  favorite: null;
  history: ReaderHistoryConfig;
}

/** Строковый ключ жития для закладок, истории и кэша пагинации */
export const getSaintLifeId = (saintId: number): string => getSaintLifeKey(saintId);

export const getSaintLifeUrl = (saintId: number | string): string => `/saints/${saintId}/life`;

export function resolveSaintLifeReaderConfig(
  saintIdParam: string | undefined,
  initialTitle: string = ""
): SaintLifeReaderConfig {
  const saintId = Number(saintIdParam);
  if (!Number.isFinite(saintId)) {
    throw new Error("Saint id is not provided");
  }

  return {
    saintId,
    itemId: getSaintLifeId(saintId),
    initialTitle,
    itemUrl: getSaintLifeUrl(saintId),
    favorite: null,
    history: { type: "saints", withMeta: true },
  };
}

/** Житие святого в виде текста для читалки (saintLife.vue) */
export const buildSaintLifeText = (saint: SaintDetails): PrayerText =>
  createPrayerText(saint.id, saint.name, { text: saint.life });
