import { ref, readonly, nextTick } from "vue";
import { f7 } from "framework7-vue";
import { useSettingsStore } from "@/stores/settings";
import { isScreenEdgeClientX } from "@/composables/useSwipeout";

export interface UseReadingChromeOptions {
  getViewportWidth?: () => number;
}

const readClientX = (event: Event): number | null => {
  if (event instanceof MouseEvent) {
    return event.clientX;
  }
  if (typeof TouchEvent !== "undefined" && event instanceof TouchEvent) {
    return event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX ?? null;
  }
  return null;
};

/**
 * Композабл панелей читалки (navbar, нижняя навигация, скраббинг ползунка
 * и закрытие меню касанием по тексту с защитой системного свайпа от края).
 */
export function useReadingChrome(options: UseReadingChromeOptions = {}) {
  const settingsStore = useSettingsStore();
  const getViewportWidth = options.getViewportWidth ?? (() => f7.width);

  const isNavbarHidden = ref(true);
  const isPageNavHidden = ref(true);
  const readingBarsAnimate = ref(true);
  const isSliderScrubbing = ref(false);
  const isPageScrubbing = ref(false);
  // Пока палец на слайдере — считаем заголовок по странице ползунка, а не по
  // отложенному goToPage (иначе подзаголовок отстаёт на debounce)
  const scrubPreviewPage = ref<number | null>(null);

  const resetScrubPreview = () => {
    isSliderScrubbing.value = false;
    scrubPreviewPage.value = null;
  };

  const hideBarsInstant = () => {
    readingBarsAnimate.value = false;
    isNavbarHidden.value = true;
    isPageNavHidden.value = true;
    resetScrubPreview();
    nextTick(() => {
      readingBarsAnimate.value = true;
    });
  };

  const hideBars = () => {
    isNavbarHidden.value = true;
    isPageNavHidden.value = true;
    resetScrubPreview();
  };

  const hideNavbar = () => {
    isNavbarHidden.value = true;
  };

  const showReadingBars = () => {
    isNavbarHidden.value = false;
    isPageNavHidden.value = false;
  };

  const onPageScrubMove = (page: number) => {
    isSliderScrubbing.value = true;
    scrubPreviewPage.value = page;
    isPageScrubbing.value = true;
    isNavbarHidden.value = true;
  };

  const onPageScrubSettle = () => {
    isPageScrubbing.value = false;
  };

  const onPageScrubEnd = () => {
    scrubPreviewPage.value = null;
  };

  // Последнее касание закрыло верхнее или нижнее меню. Сбрасывается в следующем touchstart.
  let menusClosedByTouch = false;

  const onTextTouchStart = (event: Event) => {
    menusClosedByTouch = false;
    // Верхний статус-бар скрыт: свайп от края — системный «Назад», меню не закрываем.
    const clientX = readClientX(event);
    if (
      settingsStore.readingSystemBars !== "normal" &&
      clientX != null &&
      isScreenEdgeClientX(clientX, getViewportWidth())
    ) {
      return;
    }

    if (!isNavbarHidden.value) {
      isNavbarHidden.value = true;
      menusClosedByTouch = true;
    }

    if (!isPageNavHidden.value) {
      isPageNavHidden.value = true;
      resetScrubPreview();
      menusClosedByTouch = true;
    }
  };

  const consumeMenusClosedByTouch = (): boolean => {
    if (!menusClosedByTouch) return false;
    menusClosedByTouch = false;
    return true;
  };

  return {
    isNavbarHidden: readonly(isNavbarHidden),
    isPageNavHidden: readonly(isPageNavHidden),
    readingBarsAnimate: readonly(readingBarsAnimate),
    isSliderScrubbing: readonly(isSliderScrubbing),
    isPageScrubbing: readonly(isPageScrubbing),
    scrubPreviewPage: readonly(scrubPreviewPage),
    hideBarsInstant,
    hideBars,
    hideNavbar,
    showReadingBars,
    onPageScrubMove,
    onPageScrubSettle,
    onPageScrubEnd,
    onTextTouchStart,
    consumeMenusClosedByTouch,
  };
}
