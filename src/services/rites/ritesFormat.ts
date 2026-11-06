import type { Rite, RiteName } from "@/services/rites/ritesApi";

// Даты записок хранятся как unix-время начала дня по Москве: форматируем строго в МСК
const shortDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  day: "numeric",
  month: "short",
});
const shortDateWithYearFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const priceFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

export function formatPrice(value: number): string {
  return priceFormatter.format(value);
}

/** "8 нояб." или "8 нояб. 2026", как на сайте (formatDateShort) */
export function formatDateShort(ts: number, withYear: boolean): string {
  const date = new Date(ts * 1000);
  return withYear
    ? shortDateWithYearFormatter.format(date).replace(" г.", "")
    : shortDateFormatter.format(date);
}

const yearFormatter = new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", year: "numeric" });
const mskYear = (ts: number): string => yearFormatter.format(new Date(ts * 1000));

/**
 * Как на сайте: один день с годом, период "8 нояб. - 17 дек. 2026".
 * Год у начала периода пишется только если он отличается от года конца.
 */
export function formatPeriod(period: Rite["period"]): { from: string; to: string | null } | null {
  const from = period?.from?.ts;
  if (!from) return null;

  const to = period?.to?.ts;
  if (!to || to <= from) return { from: formatDateShort(from, true), to: null };

  return {
    from: formatDateShort(from, mskYear(from) !== mskYear(to)),
    to: formatDateShort(to, true),
  };
}

const longDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  day: "numeric",
  month: "long",
});
const longDateWithYearFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "8 ноября" или "8 ноября 2026", как на сайте (formatDateLong) */
export function formatDateLong(ts: number, withYear: boolean): string {
  const date = new Date(ts * 1000);
  return withYear
    ? longDateWithYearFormatter.format(date).replace(" г.", "")
    : longDateFormatter.format(date);
}

/** Период для истории: "29 декабря 2020 — 7 февраля 2021". Правила года те же, что у formatPeriod */
export function formatPeriodLong(period: Rite["period"]): { from: string; to: string | null } | null {
  const from = period?.from?.ts;
  if (!from) return null;

  const to = period?.to?.ts;
  if (!to || to <= from) return { from: formatDateLong(from, true), to: null };

  return {
    from: formatDateLong(from, mskYear(from) !== mskYear(to)),
    to: formatDateLong(to, true),
  };
}

// Цвета статусов в тёмной теме по макету. В светлой берётся status.color с сервера
const DARK_STATUS_COLORS: Record<string, string> = {
  payed: "#33a9ff",
  served: "#f27dff",
  commemoration: "#d0ae9b",
  completed: "#77d658",
};

/** Цвет текста статуса записки; null: цвет по умолчанию */
export function statusColor(status: Rite["status"], isDark: boolean): string | null {
  if (!status) return null;
  return isDark ? (DARK_STATUS_COLORS[status.xmlId] ?? null) : (status.color ?? null);
}

/** Пробелы внутри скобок не разрывают краткое название: «Псалтирь (1 год)» */
export function formatShortName(name: string): string {
  return name.replace(/\(([^)]*)\)/g, (_, inner: string) => `(${inner.replace(/ /g, "\u00A0")})`);
}

export function formatNames(names: RiteName[]): string {
  return names
    .map((item) => `${item.explanation ?? ""} ${item.name}`.trim())
    .join(", ");
}

export function isValidEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value);
}
