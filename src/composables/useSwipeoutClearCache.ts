import { Ref } from "vue";
import { useEventListener } from "./useEventListener";

type ElementWithButtonOffset = HTMLElement & {
  f7SwipeoutButtonOffset?: number;
};

/**
 * Очищает кэш кнопок swipeout, для правильного отображения при динамическом изменении количества кнопок
 */
export function useSwipeoutClearCache(
  elRef: Ref<HTMLElement> | HTMLElement | (() => HTMLElement)
) {
  //
  const onSwipeoutClosed = (e: Event) => {
    const swipeoutEl = e.target as HTMLElement;
    swipeoutEl.querySelectorAll(".swipeout-actions-right a").forEach((el) => {
      const element = el as ElementWithButtonOffset;
      delete element.f7SwipeoutButtonOffset;
    });
  };

  useEventListener<Event>(elRef, "swipeout:closed", onSwipeoutClosed, {
    passive: true,
  });
}
