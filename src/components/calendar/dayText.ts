import type { CalendarDayApiElement } from "@/services/api/DaysApi";
import type { PrayerText } from "@/stores/prayers";
import type { Language } from "@/types/common";
import type { ReaderFavoriteConfig, ReaderHistoryConfig } from "@/components/textReader";
import { getDayTextKey, getReadingKey } from "@/js/itemKey";
import { formatDayTitleDate, resolveImageUrl } from "./dayFormat";

/**
 * Тексты дня, которые открываются в читалке (dayText.vue).
 */
export type DayTextKind = "thought" | "parable" | "instructions";

const KIND_TITLES: Record<DayTextKind, string> = {
  thought: "Мысль дня",
  parable: "Притча дня",
  instructions: "Богослужебные указания",
};

/** Высота картинки мысли задана жёстко: пагинатор измеряет страницы до загрузки картинки */
const THOUGHT_PICTURE_HEIGHT = 240;

export interface DayText {
  /** Строковый ключ для закладок, истории и избранного */
  id: string;
  name: string;
  /** Название при сохранении в Избранное (для мысли дня — thought.title с датой) */
  favoriteTitle: string;
  /** Путь страницы, по которому текст открывается снова */
  url: string;
  prayerText: PrayerText;
}

export interface DayTextReaderConfig {
  code: string;
  kind: DayTextKind | null;
  /** Числовой id чтения внутри массива day.readings (null для текстов дня) */
  readingId: number | null;
  itemId: string;
  initialTitle: string;
  itemUrl: string;
  favorite: ReaderFavoriteConfig;
  history: ReaderHistoryConfig | null;
}

const KIND_FAVORITE_TYPE: Record<DayTextKind, "thoughts" | "parables" | "instructions"> = {
  thought: "thoughts",
  parable: "parables",
  instructions: "instructions",
};

export const isDayTextKind = (value: string | undefined): value is DayTextKind =>
  value != null && Object.hasOwn(KIND_TITLES, value);

export const getDayTextId = (code: string, kind: DayTextKind): string =>
  getDayTextKey(code, kind);

export const getReadingItemId = (code: string, readingId: number): string =>
  getReadingKey(code, readingId);

export const getDayTextTitle = (code: string, kind: DayTextKind): string =>
  `${KIND_TITLES[kind]}, ${formatDayTitleDate(code)}`;

export const getThoughtFavoriteTitle = (
  code: string,
  thoughtTitle: string | null | undefined
): string => {
  const trimmed = thoughtTitle?.trim();
  if (trimmed) {
    return `${trimmed}, ${formatDayTitleDate(code)}`;
  }
  return getDayTextTitle(code, "thought");
};

export const getDayTextUrl = (code: string, kind: DayTextKind): string =>
  `/days/${code}/text/${kind}`;

export const getReadingUrl = (code: string, readingId: number): string =>
  `/days/${code}/readings/${readingId}`;

export function resolveDayTextReaderConfig(params: {
  code?: string;
  kind?: string;
  readingId?: string;
}): DayTextReaderConfig {
  const { code, kind, readingId } = params;
  if (!code) {
    throw new Error("Calendar day code is not provided");
  }

  if (isDayTextKind(kind)) {
    const itemId = getDayTextId(code, kind);
    const favorite: ReaderFavoriteConfig = {
      type: KIND_FAVORITE_TYPE[kind],
      withMeta: true,
    };
    const history: ReaderHistoryConfig | null =
      kind === "instructions" ? { type: "instructions", withMeta: true } : null;

    return {
      code,
      kind,
      readingId: null,
      itemId,
      initialTitle: getDayTextTitle(code, kind),
      itemUrl: getDayTextUrl(code, kind),
      favorite,
      history,
    };
  }

  const parsedReadingId = Number(readingId);
  if (!Number.isFinite(parsedReadingId)) {
    throw new Error("Neither valid day text kind nor readingId provided");
  }

  return {
    code,
    kind: null,
    readingId: parsedReadingId,
    itemId: getReadingItemId(code, parsedReadingId),
    initialTitle: "",
    itemUrl: getReadingUrl(code, parsedReadingId),
    favorite: { type: "readings", withMeta: true },
    history: { type: "readings", withMeta: true },
  };
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const createPrayerText = (
  id: number,
  name: string,
  texts: { text?: string; text_cs?: string; text_ru?: string }
): PrayerText => {
  const lang: Language[] = [];
  if (texts.text_cs) lang.push("cs");
  if (texts.text_ru) lang.push("ru");

  return {
    id,
    name,
    parent: null,
    text: texts.text ?? "",
    text_cs: texts.text_cs ?? "",
    text_cs_cf: "",
    text_ru: texts.text_ru ?? "",
    modified_ts: 0,
    lang,
  };
};

const buildThoughtHtml = (day: CalendarDayApiElement): string => {
  const { thought } = day;
  const picture = resolveImageUrl(thought.picture);
  const parts: string[] = [];

  if (picture) {
    parts.push(
      `<p style="text-align:center"><img src="${picture}" alt="" style="display:inline-block;max-width:100%;height:${THOUGHT_PICTURE_HEIGHT}px;object-fit:contain"></p>`
    );
  }
  if (thought.title) {
    parts.push(`<p style="text-align:center"><em>${thought.title}</em></p>`);
  }
  parts.push(thought.text);
  return parts.join("\n");
};

export function buildDayText(day: CalendarDayApiElement, kind: DayTextKind): DayText {
  const name = getDayTextTitle(day.code, kind);
  const favoriteTitle =
    kind === "thought" ? getThoughtFavoriteTitle(day.code, day.thought.title) : name;
  const text =
    kind === "thought" ? buildThoughtHtml(day) : kind === "parable" ? day.parabel : day.instructions;

  return {
    id: getDayTextId(day.code, kind),
    name,
    favoriteTitle,
    url: getDayTextUrl(day.code, kind),
    prayerText: createPrayerText(0, name, { text }),
  };
}

const VERSE_REGEXP = /^#([rc])#\d+:(\d+)\s*(.*)$/;

/**
 * Текст чтения: строки `#r#10:9 ...` - русский, `#c#10:9 ...` - церковнославянский.
 * Номер стиха - надстрочный, `_слово_` - курсив (слова, которых нет в оригинале).
 */
export function parseReadingText(raw: string): { ru: string; cs: string } {
  const lines: Record<"r" | "c", string[]> = { r: [], c: [] };

  for (const line of raw.split("\n")) {
    const match = VERSE_REGEXP.exec(line);
    if (!match) continue;
    const [, language, verse, verseText] = match;
    const html = escapeHtml(verseText).replace(/_([^_]+)_/g, "<em>$1</em>");
    lines[language as "r" | "c"].push(`<p><sup>${verse}</sup> ${html}</p>`);
  }

  return { ru: lines.r.join("\n"), cs: lines.c.join("\n") };
}

export function buildReadingText(day: CalendarDayApiElement, readingId: number): DayText | null {
  const reading = day.readings.find((item) => item.id === readingId);
  if (!reading) return null;

  const { ru, cs } = parseReadingText(reading.text);
  return {
    id: getReadingItemId(day.code, reading.id),
    name: reading.name,
    favoriteTitle: reading.name,
    url: getReadingUrl(day.code, reading.id),
    prayerText: createPrayerText(reading.id, reading.name, { text_ru: ru, text_cs: cs }),
  };
}
