import { ref, watch, toValue } from 'vue';
import type {ShallowRef, Ref, WritableComputedRef, ComputedRef } from 'vue';


type RefOrGetter<T> = Ref<T> | ShallowRef<T> | WritableComputedRef<T> | ComputedRef<T> | (() => T);

/**
 * Композабл для отложенного отображения любого реактивного значения
 * @param source - реактивное значение (ref, computed, getter или примитив)
 * @param initValue - начальное значение
 * @param delay - задержка в миллисекундах (по умолчанию 100)
 * @returns объект с реактивным значением delayed
 */
export function useDelayed<T>(source: RefOrGetter<T>, initValue: T, delay: number = 100) {
  const delayed = ref<T>(initValue);
  let delayTimeout: ReturnType<typeof setTimeout> | null = null;

  watch(source, (newValue) => {
    if (delayTimeout) {
      clearTimeout(delayTimeout);
    }
    
    delayTimeout = setTimeout(() => {
      delayed.value = newValue;
    }, delay);
  }, { immediate: true });

  return {
    delayed
  };
}