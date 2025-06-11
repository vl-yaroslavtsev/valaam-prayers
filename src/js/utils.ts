import { format } from "date-fns";
import { ru } from "date-fns/locale";

/**
 * Форматируем дату по-русски
 */
export function formatDate(date: Date, formatStr = "P") {
  return format(date, formatStr, {
    locale: ru, 
  });
}