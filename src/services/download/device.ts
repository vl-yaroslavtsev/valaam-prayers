import type { ImageSize } from "@/services/api/DaysApi";

const TABLET_QUERY = "(min-width: 768px)";

function isTablet(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(TABLET_QUERY).matches;
}

/** Обе картинки дня на экране маленькие, для офлайна всегда хватает s. */
export function getCalendarIconSize(): ImageSize {
  return "s";
}

/**
 * Страница святого просит ширину через srcset (sizes=100vw).
 * Телефон чаще выбирает m, планшет — l.
 */
export function getSaintIconSize(): ImageSize {
  return isTablet() ? "l" : "m";
}
