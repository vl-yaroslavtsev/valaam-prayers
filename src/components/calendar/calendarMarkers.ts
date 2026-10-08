/**
 * Раскраска дней календаря по маркерам из API (/days/calendar).
 *
 * Маркеры в строке идут в произвольном порядке (`wvg`, `hwf`):
 * e - Пасха, h - двунадесятый праздник, g - великий праздник, v - праздник Валаамской обители,
 * f - постный день, w - сплошная седмица, l - светлая седмица, c - поминовение усопших.
 *
 * На день показывается один маркер-фон (самый приоритетный) и один маркер-контур (самый приоритетный),
 * фон и контур отображаются одновременно.
 */

export type DayBackground = "easter" | "holiday" | "valaam" | "week" | "fast";
export type DayOutline = "great" | "memorial";

export interface DayMarkers {
  background: DayBackground | null;
  outline: DayOutline | null;
}

/** Фоны по убыванию приоритета. `f` в приоритетах не указан, поэтому он самый низкий. `w` и `l` отображаются одинаково */
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

const CLASS_BAND = "cal-band";
const CLASS_BAND_START = "cal-band-start";
const CLASS_BAND_END = "cal-band-end";
const CLASS_FAST_SINGLE = "cal-fast-single";

/** Все CSS-классы, которые могут быть у дня (для rangesClasses календаря) */
export const DAY_CLASSES = [
  "cal-easter",
  "cal-holiday",
  "cal-valaam",
  CLASS_FAST_SINGLE,
  CLASS_BAND,
  "cal-band-fast",
  "cal-band-week",
  CLASS_BAND_START,
  CLASS_BAND_END,
  "cal-outline-great",
  "cal-outline-memorial",
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
  const background = BACKGROUND_PRIORITY.find(([marker]) => value.includes(marker))?.[1] ?? null;
  const outline = OUTLINE_PRIORITY.find(([marker]) => value.includes(marker))?.[1] ?? null;
  return { background, outline };
}

/**
 * Строит CSS-классы для каждого дня из API.
 *
 * Фон поста (`f`) и седмицы (`w`/`l`) рисуется плашкой: подряд идущие дни с одним фоном
 * в пределах недельной строки (Пн-Вс) сливаются в плашку со скруглёнными краями (один день - круг).
 * Одиночный постный день (соседи не постные) - отдельный серо-бежевый круг.
 */
export function buildDayStyles(days: Record<string, string | null>): DayStylesMap {
  const markersByCode = new Map<string, DayMarkers>();
  for (const [code, raw] of Object.entries(days)) {
    markersByCode.set(code, parseMarkers(raw));
  }

  const backgroundOf = (date: Date): DayBackground | null =>
    markersByCode.get(toDateCode(date))?.background ?? null;

  const styles: DayStylesMap = new Map();
  for (const [code, { background, outline }] of markersByCode) {
    const classes: string[] = [];

    if (background === "easter" || background === "holiday" || background === "valaam") {
      classes.push(`cal-${background}`);
    } else if (background === "fast" || background === "week") {
      const date = fromDateCode(code);
      const previous = backgroundOf(addDays(date, -1));
      const next = backgroundOf(addDays(date, 1));

      if (background === "fast" && previous !== "fast" && next !== "fast") {
        classes.push(CLASS_FAST_SINGLE);
      } else {
        // Дни соседних месяцев в календаре не раскрашиваются, поэтому на границе месяца плашка тоже обрывается
        const weekDay = date.getDay();
        const isFirstOfMonth = date.getDate() === 1;
        const isLastOfMonth = addDays(date, 1).getDate() === 1;
        classes.push(CLASS_BAND, `cal-band-${background}`);
        if (weekDay === 1 || isFirstOfMonth || previous !== background) classes.push(CLASS_BAND_START);
        if (weekDay === 0 || isLastOfMonth || next !== background) classes.push(CLASS_BAND_END);
      }
    }

    if (outline) {
      classes.push(`cal-outline-${outline}`);
    }

    styles.set(code, classes);
  }

  return styles;
}
