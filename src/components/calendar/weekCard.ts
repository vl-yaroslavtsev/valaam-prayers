import type { CalendarDayApiElement } from "@/services/api/DaysApi";
import { parseMarkers, type DayOutline } from "./calendarMarkers";
import { parseSaintLine } from "./dayFormat";

/** Фон карточки дня в виде «неделя»: тот же набор цветов, что у раскраски месяца */
export type WeekCardBackground = "holiday" | "valaam" | "week" | "fast" | "none";

export interface WeekCardStyle {
  background: WeekCardBackground;
  outline: DayOutline | null;
}

/**
 * Раскраска карточки по маркерам дня (/days/calendar). Фон - самый приоритетный маркер,
 * как у круга в месяце; контур - великий праздник или поминовение усопших.
 * Пасха в карточке красится так же, как двунадесятый праздник.
 */
export function getWeekCardStyle(rawMarkers: string | null | undefined): WeekCardStyle {
  const { backgrounds, outlines } = parseMarkers(rawMarkers);
  const [first] = backgrounds;
  return {
    background: !first ? "none" : first === "easter" ? "holiday" : first,
    outline: outlines[0] ?? null,
  };
}

/** «Седмица 2-я по Пасхе. Глас 1.» - неделя дня (HTML, в ней бывают ссылки) и глас */
export function buildWeekTitleHtml(day: CalendarDayApiElement): string {
  return [day.week ? `${day.week}.` : null, day.tone ? `Глас ${day.tone}.` : null]
    .filter(Boolean)
    .join(" ");
}

/** Святые дня одним абзацем (HTML) без знаков праздников: обрезается по строкам стилем */
export function buildWeekSaintsHtml(day: CalendarDayApiElement): string {
  return day.saints_blocks
    .flat()
    .map((line) => parseSaintLine(line).html)
    .join(" ");
}
