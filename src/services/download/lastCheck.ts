import { format, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";

/** Строка под тумблером автообновления: когда последний раз успешно проверяли обновления */
export function formatLastCheck(lastCheckAt: Date | null, now: Date = new Date()): string {
  if (!lastCheckAt) return "Ещё не проверялось";

  const time = format(lastCheckAt, "HH:mm");
  let day: string;
  if (isToday(lastCheckAt)) day = "сегодня";
  else if (isYesterday(lastCheckAt)) day = "вчера";
  else if (lastCheckAt.getFullYear() === now.getFullYear()) day = format(lastCheckAt, "d MMMM", { locale: ru });
  else day = format(lastCheckAt, "d MMMM yyyy", { locale: ru });

  return `Последняя проверка: ${day}, ${time}`;
}
