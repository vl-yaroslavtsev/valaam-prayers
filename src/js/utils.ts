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

/**
 * Ожидаем загрузки шрифтов
 */
export async function waitForFontsLoaded(): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  } else {
    // Fallback для старых браузеров
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

/**
 * Получаем значение CSS переменной
 */
export function getCSSVariable(variableName: string, element: HTMLElement = document.documentElement): string {
  const targetElement = element;
  return getComputedStyle(targetElement)
    .getPropertyValue(variableName)
    .trim();
};


/**
 * Устанавливаем значение CSS переменной
 */
export function setCSSVariable(variableName: string, value: string, element: HTMLElement = document.documentElement): void {
  element.style.setProperty(variableName, value);
};