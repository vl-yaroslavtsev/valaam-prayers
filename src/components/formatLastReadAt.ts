import { isSameYear, isToday, isYesterday } from "date-fns";
import { formatDate } from "@/js/utils";

/** Подпись в слайдере «Сейчас читаю»: сегодня и вчера словами, старше — датой, время всегда. */
export function formatLastReadAt(date: Date): string {
  const time = formatDate(date, "HH:mm");
  if (isToday(date)) return `Сегодня в ${time}`;
  if (isYesterday(date)) return `Вчера в ${time}`;
  if (isSameYear(date, new Date())) return `${formatDate(date, "d MMMM")} в ${time}`;
  return `${formatDate(date, "d MMMM yyyy")} в ${time}`;
}
