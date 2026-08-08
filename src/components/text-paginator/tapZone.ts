export type TapZoneType = "center" | "left" | "right" | "top" | "bottom";

/**
 * Определяет зону тапа внутри прямоугольника читалки.
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
  const isHorizontal = orientation === "horizontal";

  const along = isHorizontal ? x : y;
  const alongSize = isHorizontal ? width : height;
  const across = isHorizontal ? y : x;
  const acrossSize = isHorizontal ? height : width;

  const primaryZone: TapZoneType = isHorizontal ? "left" : "top";
  const secondaryZone: TapZoneType = isHorizontal ? "right" : "bottom";

  const alongStart = alongSize * 0.25;
  const alongEnd = alongSize * 0.75;
  const alongCenter = alongSize * 0.5;

  const acrossStart = acrossSize * 0.3;
  const acrossEnd = acrossSize * 0.7;

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
