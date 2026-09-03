export type TapZoneType = "center" | "left" | "right" | "top" | "bottom" | "bookmark";

// Область тапа для закладки в правом верхнем углу — задана в абсолютных px, так как
// угол физически всегда сверху-справа на экране, независимо от orientation (в отличие
// от along/across осей ниже, которые переставляются между горизонтальным и вертикальным режимом)
export const BOOKMARK_ZONE_SIZE = 56;

// Доли по "продольной" оси (см. detectTapZone) — экспортированы, чтобы обучающий тур
// рисовал зоны листания/меню той же геометрией, без риска разойтись с реальным поведением
export const TAP_ZONE_ALONG_START_RATIO = 0.25;
export const TAP_ZONE_ALONG_END_RATIO = 0.75;

// Доли по "поперечной" оси, определяющие вертикальную (для горизонтального режима)
// полосу центральной зоны тапа
export const TAP_ZONE_ACROSS_START_RATIO = 0.3;
export const TAP_ZONE_ACROSS_END_RATIO = 0.7;

/**
 * Определяет зону тапа внутри прямоугольника читалки.
 *
 * Правый верхний угол (см. BOOKMARK_ZONE_SIZE) всегда даёт "bookmark" — добавление/редактирование
 * закладки на текущей странице, независимо от остальной геометрии.
 *
 * По "продольной" оси (X для горизонтального режима, Y для вертикального) первые/последние 25%
 * дают "левую"/"правую" (соотв. "верхнюю"/"нижнюю") зону — переход к предыдущей/следующей странице.
 * Средние 50% по продольной оси дают "центр" (показать/скрыть меню), но только если попадание
 * также укладывается в среднюю зону 30%–70% по "поперечной" оси — иначе это верх/низ нав-области,
 * и тап трактуется как переход по половине (левая/правая или верх/низ).
 *
 * Горизонтальный и вертикальный режимы используют одну и ту же геометрию с переставленными осями.
 */
export function detectTapZone(
  x: number,
  y: number,
  width: number,
  height: number,
  orientation: "horizontal" | "vertical"
): TapZoneType {
  if (x >= width - BOOKMARK_ZONE_SIZE && y <= BOOKMARK_ZONE_SIZE) {
    return "bookmark";
  }

  const isHorizontal = orientation === "horizontal";

  const along = isHorizontal ? x : y;
  const alongSize = isHorizontal ? width : height;
  const across = isHorizontal ? y : x;
  const acrossSize = isHorizontal ? height : width;

  const primaryZone: TapZoneType = isHorizontal ? "left" : "top";
  const secondaryZone: TapZoneType = isHorizontal ? "right" : "bottom";

  const alongStart = alongSize * TAP_ZONE_ALONG_START_RATIO;
  const alongEnd = alongSize * TAP_ZONE_ALONG_END_RATIO;
  const alongCenter = alongSize * 0.5;

  const acrossStart = acrossSize * TAP_ZONE_ACROSS_START_RATIO;
  const acrossEnd = acrossSize * TAP_ZONE_ACROSS_END_RATIO;

  if (along < alongStart) {
    return primaryZone;
  }

  if (along > alongEnd) {
    return secondaryZone;
  }

  if (across >= acrossStart && across <= acrossEnd) {
    return "center";
  }

  return along < alongCenter ? primaryZone : secondaryZone;
}
