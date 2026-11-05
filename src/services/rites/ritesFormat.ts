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

export function formatNames(names: RiteName[]): string {
  return names
    .map((item) => `${item.explanation ?? ""} ${item.name}`.trim())
    .join(", ");
}

export function isValidEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value);
}
