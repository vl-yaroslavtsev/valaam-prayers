import type { Rite, RiteDatePoint, RiteType, TypeRestriction } from "@/services/rites/ritesApi";

/**
 * Даты записок считаются по московскому дню, как на сервере (Rites::checkDate).
 * В России нет перехода на летнее время, поэтому МСК это всегда UTC+3.
 * Все даты здесь Unix-время начала московского дня, в секундах.
 */
const DAY = 24 * 60 * 60;
const MSK_OFFSET = 3 * 60 * 60;
/** Защита от бесконечного поиска, если все даты запрещены */
const MAX_SEARCH_DAYS = 800;

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

/** Начало московского дня, в который попадает ts */
export const mskDayStart = (ts: number): number =>
  Math.floor((ts + MSK_OFFSET) / DAY) * DAY - MSK_OFFSET;

/** День недели по московскому календарю: 1 (пн) .. 7 (вс) */
export const mskWeekDay = (ts: number): number =>
  ((Math.floor((ts + MSK_OFFSET) / DAY) + 3) % 7) + 1;

/** Московская дата как поля календаря */
function mskParts(ts: number): { day: number; month: number; year: number } {
  const date = new Date((ts + MSK_OFFSET) * 1000);
  return { day: date.getUTCDate(), month: date.getUTCMonth(), year: date.getUTCFullYear() };
}

/** "5 ноября 2026": как FormatDate("j F Y") на сервере */
export function formatDateLong(ts: number): string {
  const { day, month, year } = mskParts(ts);
  return `${day} ${MONTHS_GENITIVE[month]} ${year}`;
}

/** "05.11.2026": формат даты в запросе PUT /rites/N */
export function formatDateParam(ts: number): string {
  const { day, month, year } = mskParts(ts);
  return `${String(day).padStart(2, "0")}.${String(month + 1).padStart(2, "0")}.${year}`;
}

/** Ближайшая допустимая дата начала: сегодня + дни обработки + 1 */
export const calculateMinDate = (nowTs: number, type: RiteType): number =>
  mskDayStart(nowTs) + (type.processing + 1) * DAY;

/** Дней в периоде «год»: как на сайте, конец такого периода считается по календарю */
const PERIOD_ONE_YEAR_DAYS = 365;

/** Последний день поминовения: начало + (дней в периоде - 1), для года: начало + 1 год - 1 день */
export function getToDate(startTs: number, type: RiteType): number {
  if (type.periodDays === PERIOD_ONE_YEAR_DAYS) {
    const { day, month, year } = mskParts(startTs);
    return Date.UTC(year + 1, month, day - 1) / 1000 - MSK_OFFSET;
  }
  return startTs + (type.periodDays ? type.periodDays - 1 : 1) * DAY;
}

/**
 * Московский день как дата по локальному календарю: F7 Calendar хранит выбранный день
 * как Date в локальной полуночи, и в любом часовом поясе показывает тот же день.
 */
export function dayTsToWallDate(dayTs: number): Date {
  const { day, month, year } = mskParts(dayTs);
  return new Date(year, month, day);
}

/** Обратное преобразование: день из календаря F7 в начало московского дня */
export const wallDateToDayTs = (date: Date): number =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 1000 - MSK_OFFSET;

/**
 * Подходит ли день по дням недели типа и по ограничениям (без проверки минимальной даты).
 * Как на сервере: запрет перекрывает всё, а разрешение перекрывает и запрет.
 */
export function isValidDate(dayTs: number, type: RiteType, restrictions: TypeRestriction[]): boolean {
  let valid = !type.weekDays?.length || type.weekDays.includes(mskWeekDay(dayTs));
  const covering = restrictions.filter(
    (restriction) =>
      restriction.rites.includes(type.id) && restriction.from <= dayTs && restriction.to >= dayTs,
  );
  if (covering.some((restriction) => restriction.type === "disallow")) valid = false;
  if (covering.some((restriction) => restriction.type === "allow")) valid = true;
  return valid;
}

/** Первый подходящий день, начиная с minTs */
export function findNextValidDate(
  minTs: number,
  type: RiteType,
  restrictions: TypeRestriction[],
): number {
  for (let i = 0; i < MAX_SEARCH_DAYS; i++) {
    const dayTs = minTs + i * DAY;
    if (isValidDate(dayTs, type, restrictions)) return dayTs;
  }
  return minTs;
}

const toPoint = (ts: number): RiteDatePoint => ({ ts, value: formatDateLong(ts) });

export interface DateFix {
  rite: Rite;
  from: RiteDatePoint;
  to: RiteDatePoint;
}

/** Записки, дата которых уже в прошлом или недопустима, с рассчитанными новыми датами */
export function findDateFixes(
  rites: Rite[],
  restrictions: TypeRestriction[],
  nowTs: number = Math.floor(Date.now() / 1000),
): DateFix[] {
  const fixes: DateFix[] = [];
  for (const rite of rites) {
    const { type } = rite;
    const fromTs = rite.period?.from?.ts;
    if (!type || !fromTs) continue;

    const itemDay = mskDayStart(fromTs);
    const minDate = calculateMinDate(nowTs, type);
    if (itemDay >= minDate && isValidDate(itemDay, type, restrictions)) continue;

    const start = findNextValidDate(minDate, type, restrictions);
    fixes.push({ rite, from: toPoint(start), to: toPoint(getToDate(start, type)) });
  }
  return fixes;
}
