import { onBeforeUnmount, onMounted } from "vue";
import { f7 } from "framework7-vue";

/**
 * Попап записки абсолютно спозиционирован внутри прокручиваемой страницы.
 * Фокус в поле шторки заставляет браузер и Framework7 прокрутить страницу,
 * и бланк уезжает вместе с ней.
 */
const SHEET_INPUT = ".rite-name-sheet input, .rite-amount-sheet input";

type InputParams = { scrollIntoViewOnFocus?: boolean };

function inputParams(): InputParams | undefined {
  return f7.params.input as InputParams | undefined;
}

function pageScrollTops(): [HTMLElement, number][] {
  return [...document.querySelectorAll<HTMLElement>(".page-content")].map((node) => [node, node.scrollTop]);
}

function restorePageScroll(tops: [HTMLElement, number][]): void {
  for (const [node, top] of tops) {
    if (node.scrollTop !== top) node.scrollTop = top;
  }
}

let suspended = 0;
let savedScrollIntoView: boolean | undefined;

/** На время фокуса выключаем прокрутку Framework7 и возвращаем страницу на место */
function holdPageScroll(): void {
  const params = inputParams();
  if (suspended === 0) savedScrollIntoView = params?.scrollIntoViewOnFocus;
  suspended += 1;
  if (params) params.scrollIntoViewOnFocus = false;
  const tops = pageScrollTops();
  queueMicrotask(() => {
    suspended -= 1;
    if (suspended === 0 && params) params.scrollIntoViewOnFocus = savedScrollIntoView;
    restorePageScroll(tops);
    requestAnimationFrame(() => restorePageScroll(tops));
  });
}

export function focusSheetInput(input: HTMLInputElement | null): void {
  if (!input) return;
  holdPageScroll();
  input.focus({ preventScroll: true });
}

let locks = 0;

function onWindowFocus(event: FocusEvent): void {
  const target = event.target;
  if (!(target instanceof Element) || !target.matches(SHEET_INPUT)) return;
  holdPageScroll();
}

/** Пока шторка смонтирована, фокус в её полях не прокручивает страницу под попапом */
export function useSheetFocusScrollLock(): void {
  onMounted(() => {
    if (locks === 0) window.addEventListener("focus", onWindowFocus, true);
    locks += 1;
  });
  onBeforeUnmount(() => {
    locks -= 1;
    if (locks === 0) window.removeEventListener("focus", onWindowFocus, true);
  });
}
