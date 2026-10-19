import { formatDate } from "@/js/utils";
import type { ReadingsSchedule, ReadingsSection } from "@/services/api/DaysApi";

/** Разница между новым и старым стилем (1900-2100 гг.) */
const OLD_STYLE_OFFSET_DAYS = 13;

/** Сколько секций расписания показываем до нажатия «Показать все» */
export const COLLAPSED_SECTIONS_COUNT = 3;

const SITE_URL = "https://app.valaam.ru";

/** Код дня (YYYYMMDD) -> локальная полночь, чтобы не зависеть от часового пояса */
export function parseDayCode(code: string): Date {
  return new Date(Number(code.slice(0, 4)), Number(code.slice(4, 6)) - 1, Number(code.slice(6, 8)));
}

/** Код дня, сдвинутый на delta дней */
export function shiftDayCode(code: string, delta: number): string {
  const date = parseDayCode(code);
  date.setDate(date.getDate() + delta);
  return formatDate(date, "yyyyMMdd");
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export interface DayHeader {
  /** «22» */
  day: string;
  /** «сентября» */
  month: string;
  /** «Среда» */
  weekday: string;
  /** «9 сентября по старому стилю» */
  oldStyle: string;
  /** «9 сентября / 22 сентября 2026 г. Среда.» - подпись к богослужебным указаниям */
  fullDate: string;
}

export function getDayHeader(code: string): DayHeader {
  const date = parseDayCode(code);
  const old = new Date(date.getFullYear(), date.getMonth(), date.getDate() - OLD_STYLE_OFFSET_DAYS);
  const weekday = capitalize(formatDate(date, "EEEE"));
  const oldShort = formatDate(old, "d MMMM");

  return {
    day: formatDate(date, "d"),
    month: formatDate(date, "MMMM"),
    weekday,
    oldStyle: `${oldShort} по старому стилю`,
    fullDate: `${oldShort} / ${formatDate(date, "d MMMM yyyy")} г. ${weekday}.`,
  };
}

/** Дата для заголовков и названий в избранном: «13 октября 2026» */
export function formatDayTitleDate(code: string): string {
  return formatDate(parseDayCode(code), "d MMMM yyyy");
}

export type HolidaySign = "great" | "vigil" | "polyeleos" | "doxology" | "six";

const SIGN_TOKENS: Record<string, HolidaySign> = {
  "(+)": "great",
  "(+": "vigil",
  "+": "polyeleos",
  "(:.": "doxology",
  "(6": "six",
};

const SIGN_REGEXP = /^\{(\(\+\)|\(\+|\+|\(:\.|\(6)\}/;

export interface SaintLine {
  sign: HolidaySign | null;
  /** HTML строки без токена знака */
  html: string;
}

/** Вырезает токен знака праздника из начала строки */
export function parseSaintLine(line: string): SaintLine {
  const match = SIGN_REGEXP.exec(line);
  if (!match) return { sign: null, html: line };
  return { sign: SIGN_TOKENS[match[1]], html: line.slice(match[0].length) };
}

/** Текст из HTML для превью (DOMParser не загружает картинки и не выполняет скрипты) */
export function htmlToText(html: string): string {
  const text = new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
  return text.replace(/\s+/g, " ").trim();
}

/** Относительный путь картинки из API -> абсолютный URL */
export function resolveImageUrl(path: string): string;
export function resolveImageUrl(path: string | null): string | null;
export function resolveImageUrl(path: string | null): string | null {
  if (!path) return null;
  return path.startsWith("/") ? `${SITE_URL}${path}` : path;
}

/**
 * srcset страницы святого: picture — s (414), picture2x — m (828), picture3x — l (1245).
 * Один и тот же файл (оригинал меньше следующего размера) остаётся одним кандидатом.
 */
export function buildSrcset(
  picture: string | null,
  picture2x: string | null,
  picture3x: string | null
): string | undefined {
  const byUrl = new Map<string, number>();
  const add = (path: string | null, width: number) => {
    const url = resolveImageUrl(path);
    if (!url) return;
    const prev = byUrl.get(url);
    if (prev == null || width > prev) byUrl.set(url, width);
  };

  add(picture, 414);
  add(picture2x, 828);
  add(picture3x, 1245);

  if (byUrl.size === 0) return undefined;
  return [...byUrl].map(([url, width]) => `${url} ${width}w`).join(", ");
}

export function getSectionTitle(section: ReadingsSection): string | null {
  const parts = [section.title, section.label].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Секции расписания: до нажатия «Показать все» - только первые COLLAPSED_SECTIONS_COUNT */
export function getVisibleSections(schedule: ReadingsSchedule, expanded: boolean) {
  const { sections } = schedule;
  const isCollapsible = sections.length > COLLAPSED_SECTIONS_COUNT;
  return {
    sections: isCollapsible && !expanded ? sections.slice(0, COLLAPSED_SECTIONS_COUNT) : sections,
    isCollapsible,
  };
}

/** Ссылки `/readings/ID` в примечаниях ведут на чтение в контексте дня */
export function rewriteReadingLinks(html: string, code: string): string {
  return html.replace(/href="\/readings\/(\d+)"/g, `href="/days/${code}/readings/$1"`);
}
