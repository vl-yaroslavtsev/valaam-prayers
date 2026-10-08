/**
 * Раскраска дней календаря по маркерам из API (/days/calendar).
 *
 * Маркеры в строке идут в произвольном порядке (`wvg`, `hwf`):
 * e - Пасха, h - двунадесятый праздник, g - великий праздник, v - праздник Валаамской обители,
 * f - постный день, w - сплошная седмица, l - светлая седмица, c - поминовение усопших.
 *
 * На день попадают все маркеры. При наложении побеждает тот, чьё CSS-правило ниже в calendar.less
 * (приоритет ниже — правило выше в файле).
 * Плашки поста и седмицы рисуются отдельно и не прерываются круглыми маркерами:
 * праздник в середине поста остаётся на непрерывной плашке.
 */

export type DayBackground = "easter" | "holiday" | "valaam" | "week" | "fast";
export type DayOutline = "great" | "memorial";
export type DayBand = "fast" | "week";

export interface DayMarkers {
  /** Все фоны дня, по убыванию приоритета */
  backgrounds: DayBackground[];
  /** Все контуры дня, по убыванию приоритета */
  outlines: DayOutline[];
}

/** Фоны по убыванию приоритета. `w` и `l` — одна плашка седмицы */
const BACKGROUND_PRIORITY: ReadonlyArray<[marker: string, background: DayBackground]> = [
  ["e", "easter"],
  ["h", "holiday"],
  ["v", "valaam"],
  ["w", "week"],
  ["l", "week"],
  ["f", "fast"],
];

/** Контуры по убыванию приоритета */
const OUTLINE_PRIORITY: ReadonlyArray<[marker: string, outline: DayOutline]> = [
  ["g", "great"],
  ["c", "memorial"],
];

/** Плашки по возрастанию приоритета: седмица рисуется поверх поста */
const BANDS: readonly DayBand[] = ["fast", "week"];

/** Круги по возрастанию приоритета. Пасха ниже контуров в CSS, чтобы белый текст Пасхи не перебивался */
const CIRCLES: readonly DayBackground[] = ["valaam", "holiday"];

/** Все CSS-классы, которые могут быть у дня (для rangesClasses календаря) */
export const DAY_CLASSES = [
  "cal-band-fast",
  "cal-fast-start",
  "cal-fast-end",
  "cal-band-week",
  "cal-week-start",
  "cal-week-end",
  "cal-valaam",
  "cal-holiday",
  "cal-outline-memorial",
  "cal-outline-great",
  "cal-easter",
] as const;

/** Код дня (YYYYMMDD) -> CSS-классы. Дня нет в карте - в API его нет (неактивный) */
export type DayStylesMap = Map<string, string[]>;

export function toDateCode(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function fromDateCode(code: string): Date {
  return new Date(Number(code.slice(0, 4)), Number(code.slice(4, 6)) - 1, Number(code.slice(6, 8)));
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

/** Первый и последний день из API (локальная полночь), null - если дней нет */
export function getDaysRange(days: Record<string, string | null>): { min: Date; max: Date } | null {
  const codes = Object.keys(days).sort();
  if (codes.length === 0) return null;
  return { min: fromDateCode(codes[0]), max: fromDateCode(codes[codes.length - 1]) };
}

export function parseMarkers(raw: string | null | undefined): DayMarkers {
  const value = raw ?? "";
  const backgrounds: DayBackground[] = [];
  for (const [marker, background] of BACKGROUND_PRIORITY) {
    if (value.includes(marker) && !backgrounds.includes(background)) backgrounds.push(background);
  }
  const outlines: DayOutline[] = [];
  for (const [marker, outline] of OUTLINE_PRIORITY) {
    if (value.includes(marker) && !outlines.includes(outline)) outlines.push(outline);
  }
  return { backgrounds, outlines };
}

/**
 * Строит CSS-классы для каждого дня из API.
 *
 * Пост (`f`) и седмица (`w`/`l`) — плашки. Подряд идущие дни с одним маркером
 * в пределах недельной строки (Пн–Вс) сливаются, края скруглены, один день — круг.
 * Одиночный пост использует ту же плашку, что и многодневный.
 * Круг (Пасха, двунадесятый, Валаам) и контур не убирают плашку.
 */
export function buildDayStyles(days: Record<string, string | null>): DayStylesMap {
  const markersByCode = new Map<string, DayMarkers>();
  for (const [code, raw] of Object.entries(days)) {
    markersByCode.set(code, parseMarkers(raw));
  }

  const hasBand = (date: Date, band: DayBand) =>
    markersByCode.get(toDateCode(date))?.backgrounds.includes(band) ?? false;

  const styles: DayStylesMap = new Map();
  for (const [code, { backgrounds, outlines }] of markersByCode) {
    const classes: string[] = [];
    const date = fromDateCode(code);
    const weekDay = date.getDay();
    const isFirstOfMonth = date.getDate() === 1;
    const isLastOfMonth = addDays(date, 1).getDate() === 1;

    for (const band of BANDS) {
      if (!backgrounds.includes(band)) continue;
      // Дни соседних месяцев в календаре не раскрашиваются, поэтому на границе месяца плашка обрывается
      const continuesBefore = weekDay !== 1 && !isFirstOfMonth && hasBand(addDays(date, -1), band);
      const continuesAfter = weekDay !== 0 && !isLastOfMonth && hasBand(addDays(date, 1), band);
      classes.push(`cal-band-${band}`);
      if (!continuesBefore) classes.push(`cal-${band}-start`);
      if (!continuesAfter) classes.push(`cal-${band}-end`);
    }

    for (const circle of CIRCLES) {
      if (backgrounds.includes(circle)) classes.push(`cal-${circle}`);
    }
    if (outlines.includes("memorial")) classes.push("cal-outline-memorial");
    if (outlines.includes("great")) classes.push("cal-outline-great");
    if (backgrounds.includes("easter")) classes.push("cal-easter");

    styles.set(code, classes);
  }

  return styles;
}
