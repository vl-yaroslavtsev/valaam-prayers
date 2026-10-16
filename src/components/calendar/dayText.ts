import type { CalendarDayApiElement } from "@/services/api/DaysApi";
import type { PrayerText } from "@/stores/prayers";
import type { Language } from "@/types/common";
import { formatDayTitleDate, resolveImageUrl } from "./dayFormat";

/**
 * Тексты дня, которые открываются в читалке (prayersText.vue).
 * Своего id у них нет, поэтому для закладок и избранного он строится из кода дня.
 */
export type DayTextKind = "thought" | "parabel" | "instructions";

const KIND_TITLES: Record<DayTextKind, string> = {
  thought: "Мысль дня",
  parabel: "Притча дня",
  instructions: "Богослужебные указания",
};

/** Номер вида текста - последняя цифра синтетического id */
const KIND_INDEX: Record<DayTextKind, number> = {
  thought: 1,
  parabel: 2,
  instructions: 3,
};

/** Высота картинки мысли задана жёстко: пагинатор измеряет страницы до загрузки картинки */
const THOUGHT_PICTURE_HEIGHT = 240;

export interface DayText {
  /** Id для закладок и избранного */
  id: number;
  name: string;
  /** Путь страницы, по которому текст открывается снова */
  url: string;
  prayerText: PrayerText;
}

export const isDayTextKind = (value: string | undefined): value is DayTextKind =>
  value != null && Object.hasOwn(KIND_INDEX, value);

/**
 * Id вида YYYYMMDD * 10 + номер вида. Он на порядок больше id молитв и чтений,
 * поэтому с ними не пересекается.
 */
export const getDayTextId = (code: string, kind: DayTextKind): number =>
  Number(code) * 10 + KIND_INDEX[kind];

export const getDayTextTitle = (code: string, kind: DayTextKind): string =>
  `${KIND_TITLES[kind]}, ${formatDayTitleDate(code)}`;

export const getDayTextUrl = (code: string, kind: DayTextKind): string =>
  `/days/${code}/text/${kind}`;

export const getReadingUrl = (code: string, readingId: number): string =>
  `/days/${code}/readings/${readingId}`;

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const createPrayerText = (
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
  const text =
    kind === "thought" ? buildThoughtHtml(day) : kind === "parabel" ? day.parabel : day.instructions;

  return {
    id: getDayTextId(day.code, kind),
    name,
    url: getDayTextUrl(day.code, kind),
    prayerText: createPrayerText(getDayTextId(day.code, kind), name, { text }),
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
    id: reading.id,
    name: reading.name,
    url: getReadingUrl(day.code, reading.id),
    prayerText: createPrayerText(reading.id, reading.name, { text_ru: ru, text_cs: cs }),
  };
}
