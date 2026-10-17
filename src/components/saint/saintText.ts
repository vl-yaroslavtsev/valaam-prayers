import { createPrayerText } from "@/components/calendar/dayText";
import type { PrayerText } from "@/stores/prayers";
import type { SaintDetails } from "@/stores/saints";

/**
 * Id жития для закладок и избранного. Своего id у жития нет, поэтому он строится из id святого:
 * больше id молитв (до ~1.8 млн) и меньше id текстов дня (YYYYMMDD * 10).
 */
const SAINT_LIFE_ID_OFFSET = 100_000_000;

export const getSaintLifeId = (saintId: number): number => SAINT_LIFE_ID_OFFSET + saintId;

export const getSaintLifeUrl = (saintId: number | string): string => `/saints/${saintId}/life`;

/** Житие святого в виде текста для читалки (prayersText.vue) */
export const buildSaintLifeText = (saint: SaintDetails): PrayerText =>
  createPrayerText(getSaintLifeId(saint.id), saint.name, { text: saint.life });
