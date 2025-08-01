import { toValue } from "vue";
import { f7, f7ready } from "framework7-vue";
import type { Swipeout } from "framework7/types";
import { Ref } from "vue";
import { useEventListener } from "./useEventListener";

const SCREEN_EDGE_WIDTH = 25;

type SwipeoutType = Swipeout.AppMethods["swipeout"] & { allow: boolean };

/**
 * Отменяет работу swipeout при свайпе рядом с краем экрана, чтобы сработало событие назад/вперед.
 */
export function useSwipeoutEdgeGuard(
  elRef: Ref<HTMLElement> | HTMLElement | (() => HTMLElement),
  side: "left" | "right" = "right"
) {
  const onTouchStart = (e: TouchEvent) => {
    const screenWidth = f7.width;
    const clientX = e.targetTouches[0].clientX;

    const isTapOnEdge =
      side === "right"
        ? screenWidth - clientX < SCREEN_EDGE_WIDTH
        : clientX < SCREEN_EDGE_WIDTH;

    const originalAllow = (f7.swipeout as SwipeoutType).allow;
    const newAllow = !isTapOnEdge;

    if (originalAllow !== newAllow) {
      (f7.swipeout as SwipeoutType).allow = newAllow;
      setTimeout(() => {
        (f7.swipeout as SwipeoutType).allow = originalAllow;
      }, 0);
    }
  };

  useEventListener<TouchEvent>(elRef, "touchstart", onTouchStart, {
    passive: true,
    capture: true,
  });
}

type ElementWithButtonOffset = HTMLElement & {
  f7SwipeoutButtonOffset?: number;
};

/**
 * Очищает кэш кнопок swipeout, для правильного отображения при динамическом изменении количества кнопок
 */
export function swipeoutClearCache(
  elRef: Ref<HTMLElement> | HTMLElement | (() => HTMLElement)
) {
  //
  const swipeoutEl = toValue(elRef);
  swipeoutEl.querySelectorAll(".swipeout-actions-right a").forEach((el) => {
    const element = el as ElementWithButtonOffset;
    delete element.f7SwipeoutButtonOffset;
  });
}
