import { formatDate } from "@/js/utils";

/** Разница между новым и старым стилем (1900-2100 гг.) */
const OLD_STYLE_OFFSET_DAYS = 13;

/**
 * Дата православной Пасхи по новому стилю (алгоритм Гаусса для юлианского календаря).
 * Порт PHP-функции calculateEaster.
 */
export function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = year % 4;
  const c = year % 7;

  // Для юлианского календаря M = 15, N = 6
  const M = 15;
  const N = 6;

  const d = (19 * a + M) % 30;
  const e = (2 * b + 4 * c + 6 * d + N) % 7;

  let days = 22 + d + e;

  // Особые случаи для православной Пасхи
  if (d === 29 && e === 6) {
    days -= 7;
  }
  if (d === 28 && e === 6 && (11 * M + 11) % 30 < 19) {
    days -= 7;
  }

  let month = 3;
  if (days > 31) {
    month = 4;
    days -= 31;
  }

  // Дата по юлианскому календарю + 13 дней = новый стиль
  return new Date(year, month - 1, days + OLD_STYLE_OFFSET_DAYS);
}

/**
 * Правило дня памяти из `date_template` API:
 * - `Y1015` - ежегодно 15 октября (новый стиль);
 * - `E+70`, `E-9` - через N дней после/до Пасхи;
 * - `SU~0207`, `SU>0207`, `SU<0207`, `SA>0207` - воскресенье (суббота) ближайшее к дате, после неё или до неё.
 */
export type MemoRule =
  | { kind: "fixed"; month: number; day: number }
  | { kind: "easter"; offset: number }
  | { kind: "weekday"; weekday: number; mode: "~" | ">" | "<"; month: number; day: number };

const WEEKDAYS: Record<string, number> = { SU: 0, SA: 6 };

export function parseMemoTemplate(template: string): MemoRule | null {
  let match = /^Y(\d{2})(\d{2})$/.exec(template);
  if (match) return { kind: "fixed", month: Number(match[1]), day: Number(match[2]) };

  match = /^E([+-]\d+)$/.exec(template);
  if (match) return { kind: "easter", offset: Number(match[1]) };

  match = /^(SU|SA)([~<>])(\d{2})(\d{2})$/.exec(template);
  if (match) {
    return {
      kind: "weekday",
      weekday: WEEKDAYS[match[1]],
      mode: match[2] as "~" | "<" | ">",
      month: Number(match[3]),
      day: Number(match[4]),
    };
  }

  return null;
}

/** Дата месяца/числа в году; 29 февраля в невисокосный год сдвигается на 28 февраля */
function dateInYear(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, lastDay));
}

const addDays = (date: Date, delta: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);

/** Дата дня памяти в указанном году (новый стиль) */
export function resolveMemoDate(rule: MemoRule, year: number): Date {
  if (rule.kind === "fixed") return dateInYear(year, rule.month, rule.day);
  if (rule.kind === "easter") return addDays(calculateEaster(year), rule.offset);

  const base = dateInYear(year, rule.month, rule.day);
  const current = base.getDay();
  // Сколько дней вперёд до нужного дня недели (0 - в тот же день)
  const forward = (rule.weekday - current + 7) % 7;

  if (rule.mode === ">") return addDays(base, forward || 7);
  if (rule.mode === "<") return addDays(base, -((7 - forward) % 7 || 7));
  // Ближайший: не дальше трёх дней назад или четырёх вперёд
  return addDays(base, forward <= 3 ? forward : forward - 7);
}

/** Ближайшее предстоящее (или сегодняшнее) вхождение дня памяти */
export function nextMemoDate(rule: MemoRule, today = new Date()): Date {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const thisYear = resolveMemoDate(rule, start.getFullYear());
  return thisYear >= start ? thisYear : resolveMemoDate(rule, start.getFullYear() + 1);
}

/** «25 января / 7 февраля»: старый стиль / новый стиль */
export function formatMemoDate(date: Date): string {
  return `${formatDate(addDays(date, -OLD_STYLE_OFFSET_DAYS), "d MMMM")} / ${formatDate(date, "d MMMM")}`;
}

export interface SaintMemoDay {
  /** Код дня календаря (YYYYMMDD) для перехода */
  code: string;
  /** «25 января / 7 февраля» */
  label: string;
  description: string;
  isRelative: boolean;
}

export function buildMemoDay(
  memo: { date_template: string; description: string; is_relative: boolean },
  today = new Date()
): SaintMemoDay | null {
  const rule = parseMemoTemplate(memo.date_template);
  if (!rule) return null;

  const date = nextMemoDate(rule, today);
  return {
    code: formatDate(date, "yyyyMMdd"),
    label: formatMemoDate(date),
    description: memo.description,
    isRelative: memo.is_relative,
  };
}

const MONTHS = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

/**
 * Подпись службы по разделам Минеи: «Октябрь» -> «Во 2-й день» даёт «2 октября / 15 октября».
 * Разделы Минеи названы по старому стилю. Если названия не распознаны - null.
 */
export function getServiceDateLabel(dayName?: string, monthName?: string): string | null {
  const day = /^Во (\d+)-й день/.exec(dayName ?? "")?.[1];
  const month = MONTHS.indexOf((monthName ?? "").trim().toLowerCase());
  if (!day || month < 0) return null;

  // Невисокосный год: смещение между стилями не зависит от года
  const old = new Date(2001, month, Number(day));
  if (old.getMonth() !== month) return null;
  return formatMemoDate(addDays(old, OLD_STYLE_OFFSET_DAYS));
}
