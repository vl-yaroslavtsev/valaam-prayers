import type { ImageSize } from "@/services/api/DaysApi";

/**
 * Определяет размер иконок для скачивания: "m" для планшета, "s" для телефона.
 * Эвристика по ширине экрана (matchMedia) - при необходимости легко заменить
 * на другой признак (например, нативный API устройства).
 */
export function getIconSize(): ImageSize {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "s";
  }
  return window.matchMedia("(min-width: 768px)").matches ? "m" : "s";
}
