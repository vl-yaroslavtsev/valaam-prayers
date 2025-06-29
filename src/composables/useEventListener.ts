// event.js
import { onMounted, onBeforeUnmount, Ref, toValue } from "vue";

export function useEventListener<T extends Event>(
  target: EventTarget | Ref<EventTarget> | (() => EventTarget),
  event: string,
  callback: (e: T) => void,
  options?: boolean | AddEventListenerOptions
) {
  onMounted(() => {
    const targetValue = toValue(target);
    targetValue.addEventListener(event, callback as EventListener, options);
  });
  onBeforeUnmount(() => {
    const targetValue = toValue(target);
    targetValue.removeEventListener(event, callback as EventListener, options);
  });
}
