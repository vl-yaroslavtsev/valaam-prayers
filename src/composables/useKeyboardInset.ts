import { onBeforeUnmount, ref } from "vue";

/** Насколько экранная клавиатура перекрывает низ окна, в пикселях */
export function useKeyboardInset() {
  const inset = ref(0);

  function update(): void {
    const viewport = window.visualViewport;
    if (!viewport) {
      inset.value = 0;
      return;
    }
    inset.value = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
  }

  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", update);
  viewport?.addEventListener("scroll", update);
  update();

  onBeforeUnmount(() => {
    viewport?.removeEventListener("resize", update);
    viewport?.removeEventListener("scroll", update);
  });

  return inset;
}
