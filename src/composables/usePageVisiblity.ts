import { ref, onMounted, onUnmounted } from "vue";
import { f7ready, f7 } from "framework7-vue";
import type { Router } from "framework7/types";

export function usePageVisiblility() {
  const isPageVisible = ref(false);

  const setVisible = (event: Event) => {
    isPageVisible.value = true;
  };

  const setInvisible = (event: Event) => {
    isPageVisible.value = false;
  };

  let pageEl: HTMLElement | null = null;  

  onMounted(() => {
    f7ready(() => {
      f7.once('pageInit', (page) => {
        pageEl = page.el;
        pageEl.addEventListener("page:afterin", setVisible);
        pageEl.addEventListener("page:tabshow", setVisible);
        pageEl.addEventListener("page:afterout", setInvisible);
        pageEl.addEventListener("page:tabhide", setInvisible);
      });
    });
  });

  onUnmounted(() => {
    if (pageEl) {
      pageEl.removeEventListener("page:afterin", setVisible);
      pageEl.removeEventListener("page:tabshow", setVisible);
      pageEl.removeEventListener("page:afterout", setInvisible);
      pageEl.removeEventListener("page:tabhide", setInvisible);
    }

  });

  return {
    isPageVisible,
  };
}