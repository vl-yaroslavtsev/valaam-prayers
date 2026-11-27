// Анимация «Раскрытие свитка» (Unroll) между карточкой записки в списке и попапом формы.
// Попап не масштабируется и не «уезжает» в сторону: он плавно раскрывается вверх и вниз
// через clip-path: inset(...) прямо из полосы нажатой карточки (и так же спокойно сворачивается
// обратно в карточку без рывков в конце).
// На самом .rite-popup анимируются только свойства одинаковой длительности, чтобы Dom7
// transitionEnd в Framework7 срабатывал ровно по окончании перехода.

export const MORPH_OPEN_MS = 400;
export const MORPH_CLOSE_MS = 340;
export const FADE_CLOSE_MS = 220;

const MORPH_OPEN_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const MORPH_CLOSE_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
const FADE_CLOSE_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
const FALLBACK_FADE_OPEN_MS = 180;

export const MORPH_CLASS = "rite-popup--morph";
export const MORPHING_CLASS = "rite-popup--morphing";

export type PopupCloseStyle = "morph" | "fade";

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface UnrollGeometry {
  transform: string;
  clipPath: string;
  targetClipPath: string;
  translateY: number;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function isRectInViewport(
  rect: RectLike,
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top < viewportHeight &&
    rect.top + rect.height > 0 &&
    rect.left < viewportWidth &&
    rect.left + rect.width > 0
  );
}

/**
 * Считает clip-path inset (без масштабирования), совмещающий окно попапа с полосой карточки.
 * На телефоне (полноэкранный попап) translateY всегда 0 — чистый неподвижный clip-path.
 * На планшете, если карточка выходит выше или ниже центрированного бланка, добавляется мягкий сдвиг по Y.
 */
export function computeUnrollGeometry(
  src: RectLike,
  dst: RectLike,
  srcRadius: number,
  dstRadius: number,
): UnrollGeometry | null {
  if (src.width <= 0 || src.height <= 0 || dst.width <= 0 || dst.height <= 0) {
    return null;
  }

  const rawTop = src.top - dst.top;
  const rawBottom = dst.top + dst.height - (src.top + src.height);
  const rawLeft = src.left - dst.left;
  const rawRight = dst.left + dst.width - (src.left + src.width);

  let translateY = 0;
  let insetTop = Math.max(0, rawTop);
  let insetBottom = Math.max(0, rawBottom);

  if (rawTop < 0) {
    translateY = rawTop;
    insetTop = 0;
    insetBottom = Math.max(0, dst.height - src.height);
  } else if (rawBottom < 0) {
    translateY = -rawBottom;
    insetBottom = 0;
    insetTop = Math.max(0, dst.height - src.height);
  }

  const insetLeft = Math.max(0, rawLeft);
  const insetRight = Math.max(0, rawRight);

  // Защита от нулевой видимой полосы при экстремальной геометрии
  if (insetTop + insetBottom >= dst.height - 4 || insetLeft + insetRight >= dst.width - 4) {
    return null;
  }

  // Если прямоугольники практически совпадают, переход не запустит transitionend — отдаём null
  const almostIdentical =
    insetTop < 0.5 &&
    insetBottom < 0.5 &&
    insetLeft < 0.5 &&
    insetRight < 0.5 &&
    Math.abs(translateY) < 0.5;
  if (almostIdentical) {
    return null;
  }

  return {
    translateY: round2(translateY),
    transform: `translate3d(0px, ${round2(translateY)}px, 0px)`,
    clipPath: `inset(${round2(insetTop)}px ${round2(insetRight)}px ${round2(insetBottom)}px ${round2(insetLeft)}px round ${round2(srcRadius)}px)`,
    targetClipPath: `inset(0px 0px 0px 0px round ${round2(dstRadius)}px)`,
  };
}

/** Прокручивает контейнер списка так, чтобы целевая карточка оказалась примерно по центру видимой области */
export function ensureCardInView(card: HTMLElement): void {
  const scrollEl = card.closest<HTMLElement>(".page-content");
  if (!scrollEl) return;

  const scrollRect = scrollEl.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  if (scrollRect.height <= 0 || cardRect.height <= 0) return;

  const style = getComputedStyle(scrollEl);
  const padTop = parseFloat(style.paddingTop) || 0;
  const padBottom = parseFloat(style.paddingBottom) || 0;
  const visibleTop = scrollRect.top + padTop;
  const visibleBottom = scrollRect.bottom - padBottom;
  const visibleHeight = visibleBottom - visibleTop;
  if (visibleHeight <= 0) return;

  const visibleCenter = visibleTop + visibleHeight / 2;
  const cardCenter = cardRect.top + cardRect.height / 2;
  const delta = cardCenter - visibleCenter;
  scrollEl.scrollTop = Math.max(0, scrollEl.scrollTop + delta);
}

function readBorderRadius(el: HTMLElement, fallback: number): number {
  const parsed = parseFloat(getComputedStyle(el).borderTopLeftRadius);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBackgroundColor(el: HTMLElement): string {
  const bg = getComputedStyle(el).backgroundColor;
  if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") return "#fff";
  return bg;
}

function clearPopupInlineStyles(el: HTMLElement): void {
  el.style.removeProperty("transform");
  el.style.removeProperty("transform-origin");
  el.style.removeProperty("clip-path");
  el.style.removeProperty("transition");
  el.style.removeProperty("will-change");
  el.style.removeProperty("opacity");
}

function clearPageInlineStyles(el: HTMLElement | null): void {
  if (!el) return;
  el.style.removeProperty("opacity");
  el.style.removeProperty("transition");
}

function clearContentInlineStyles(el: HTMLElement | null): void {
  if (!el) return;
  el.style.removeProperty("transform");
  el.style.removeProperty("opacity");
  el.style.removeProperty("transition");
}

function clearVeilInlineStyles(el: HTMLElement | null): void {
  if (!el) return;
  el.style.removeProperty("display");
  el.style.removeProperty("background-color");
  el.style.removeProperty("opacity");
  el.style.removeProperty("transition");
}

function clearCardInlineStyles(el: HTMLElement | null): void {
  if (!el) return;
  el.style.removeProperty("opacity");
  el.style.removeProperty("transition");
}

export interface PopupMorphController {
  readonly isActive: boolean;
  prepareOpen(popupEl: HTMLElement, sourceCard: HTMLElement | null): boolean;
  prepareClose(
    popupEl: HTMLElement,
    pageEl: HTMLElement | null,
    veilEl: HTMLElement | null,
    contentEl?: HTMLElement | null,
  ): boolean;
  startOpen(
    popupEl: HTMLElement,
    pageEl: HTMLElement | null,
    veilEl: HTMLElement | null,
    contentEl?: HTMLElement | null,
  ): boolean;
  finishOpen(): void;
  startClose(style: PopupCloseStyle, resolveSourceCard?: () => HTMLElement | null): boolean;
  cleanup(): void;
}

export function createPopupMorphController(): PopupMorphController {
  let active = false;
  let popupEl: HTMLElement | null = null;
  let pageEl: HTMLElement | null = null;
  let veilEl: HTMLElement | null = null;
  let contentEl: HTMLElement | null = null;
  let sourceCard: HTMLElement | null = null;
  let openFallbackTimer: ReturnType<typeof setTimeout> | null = null;

  function clearOpenTimer(): void {
    if (openFallbackTimer !== null) {
      clearTimeout(openFallbackTimer);
      openFallbackTimer = null;
    }
  }

  function startFallbackFadeOpen(targetPopup: HTMLElement): void {
    clearCardInlineStyles(sourceCard);
    sourceCard = null;
    targetPopup.classList.remove(MORPHING_CLASS);
    clearPopupInlineStyles(targetPopup);
    clearPageInlineStyles(pageEl);
    clearContentInlineStyles(contentEl);
    clearVeilInlineStyles(veilEl);

    targetPopup.style.transition = "none";
    targetPopup.style.opacity = "0";
    void targetPopup.offsetWidth;
    targetPopup.style.transition = `opacity ${FALLBACK_FADE_OPEN_MS}ms ease-out`;
    targetPopup.style.opacity = "1";
    openFallbackTimer = setTimeout(finishOpen, FALLBACK_FADE_OPEN_MS + 150);
  }

  function startFadeClose(targetPopup: HTMLElement): void {
    clearCardInlineStyles(sourceCard);
    sourceCard = null;
    targetPopup.classList.remove(MORPHING_CLASS);
    clearPageInlineStyles(pageEl);
    clearContentInlineStyles(contentEl);
    clearVeilInlineStyles(veilEl);
    targetPopup.style.removeProperty("clip-path");

    targetPopup.style.transformOrigin = "center center";
    targetPopup.style.transition = "none";
    targetPopup.style.transform = "scale(1)";
    targetPopup.style.opacity = "1";
    targetPopup.style.willChange = "transform, opacity";
    void targetPopup.offsetWidth;

    targetPopup.style.transition = `transform ${FADE_CLOSE_MS}ms ${FADE_CLOSE_EASING}, opacity ${FADE_CLOSE_MS}ms ${FADE_CLOSE_EASING}`;
    targetPopup.style.transform = "scale(0.94)";
    targetPopup.style.opacity = "0";
  }

  function prepareOpen(targetPopup: HTMLElement, card: HTMLElement | null): boolean {
    cleanup();
    if (!card || !card.isConnected || prefersReducedMotion()) {
      return false;
    }
    const rect = card.getBoundingClientRect();
    if (!isRectInViewport(rect, window.innerWidth, window.innerHeight)) {
      return false;
    }
    active = true;
    popupEl = targetPopup;
    sourceCard = card;
    targetPopup.classList.add(MORPH_CLASS);
    return true;
  }

  /**
   * Включает режим сворачивания в карточку для попапа, который открывался стандартным выездом снизу
   * (например, создание новой записки по кнопке в корзине).
   */
  function prepareClose(
    targetPopup: HTMLElement,
    targetPage: HTMLElement | null,
    targetVeil: HTMLElement | null,
    targetContent: HTMLElement | null = null,
  ): boolean {
    if (prefersReducedMotion()) return false;
    active = true;
    popupEl = targetPopup;
    pageEl = targetPage;
    veilEl = targetVeil;
    contentEl = targetContent;
    targetPopup.classList.add(MORPH_CLASS);
    return true;
  }

  function startOpen(
    targetPopup: HTMLElement,
    targetPage: HTMLElement | null,
    targetVeil: HTMLElement | null,
    targetContent: HTMLElement | null = null,
  ): boolean {
    if (!active) return false;
    clearOpenTimer();
    popupEl = targetPopup;
    pageEl = targetPage;
    veilEl = targetVeil;
    contentEl = targetContent;

    if (!sourceCard || !sourceCard.isConnected) {
      startFallbackFadeOpen(targetPopup);
      return true;
    }

    const src = sourceCard.getBoundingClientRect();
    const dst = targetPopup.getBoundingClientRect();
    const srcRadius = readBorderRadius(sourceCard, 16);
    const dstRadius = readBorderRadius(targetPopup, 0);
    const geom = computeUnrollGeometry(src, dst, srcRadius, dstRadius);

    if (!geom) {
      startFallbackFadeOpen(targetPopup);
      return true;
    }

    const cardBg = readBackgroundColor(sourceCard);

    targetPopup.classList.add(MORPHING_CLASS);
    targetPopup.style.transition = "none";
    targetPopup.style.transform = geom.transform;
    targetPopup.style.clipPath = geom.clipPath;
    targetPopup.style.willChange = "clip-path, transform";

    if (veilEl) {
      veilEl.style.display = "block";
      veilEl.style.backgroundColor = cardBg;
      veilEl.style.transition = "none";
      veilEl.style.opacity = "0.95";
    }
    if (pageEl) {
      pageEl.style.transition = "none";
      pageEl.style.opacity = "0";
    }
    if (contentEl) {
      contentEl.style.transition = "none";
      contentEl.style.transform = "translate3d(0px, 14px, 0px)";
      contentEl.style.opacity = "0.25";
    }
    sourceCard.style.transition = "none";
    sourceCard.style.opacity = "1";

    void targetPopup.offsetWidth;

    targetPopup.style.transition = `clip-path ${MORPH_OPEN_MS}ms ${MORPH_OPEN_EASING}, transform ${MORPH_OPEN_MS}ms ${MORPH_OPEN_EASING}`;
    targetPopup.style.transform = "translate3d(0px, 0px, 0px)";
    targetPopup.style.clipPath = geom.targetClipPath;

    if (pageEl) {
      pageEl.style.transition = "opacity 85ms ease-out";
      pageEl.style.opacity = "1";
    }
    if (contentEl) {
      contentEl.style.transition = `transform ${MORPH_OPEN_MS - 20}ms ${MORPH_OPEN_EASING}, opacity 240ms ease-out`;
      contentEl.style.transform = "translate3d(0px, 0px, 0px)";
      contentEl.style.opacity = "1";
    }
    if (veilEl) {
      veilEl.style.transition = "opacity 200ms ease-out 40ms";
      veilEl.style.opacity = "0";
    }
    sourceCard.style.transition = "opacity 90ms ease-out";
    sourceCard.style.opacity = "0";

    openFallbackTimer = setTimeout(finishOpen, MORPH_OPEN_MS + 150);
    return true;
  }

  function finishOpen(): void {
    clearOpenTimer();
    if (!active || !popupEl) return;

    popupEl.classList.remove(MORPHING_CLASS);
    clearPopupInlineStyles(popupEl);
    clearPageInlineStyles(pageEl);
    clearContentInlineStyles(contentEl);
    clearVeilInlineStyles(veilEl);
    if (sourceCard) {
      sourceCard.style.removeProperty("transition");
    }
  }

  function startClose(
    style: PopupCloseStyle,
    resolveSourceCard?: () => HTMLElement | null,
  ): boolean {
    clearOpenTimer();
    if (!active || !popupEl) return false;

    if (style === "fade") {
      startFadeClose(popupEl);
      return true;
    }

    const nextCard = resolveSourceCard?.() ?? sourceCard;
    if (nextCard && nextCard !== sourceCard) {
      // Переключились на новую карточку (например, дубликат внизу корзины) — исходную сразу возвращаем
      clearCardInlineStyles(sourceCard);
      sourceCard = nextCard;
      ensureCardInView(sourceCard);
    }

    if (!sourceCard || !sourceCard.isConnected) {
      startFadeClose(popupEl);
      return true;
    }

    const src = sourceCard.getBoundingClientRect();
    if (!isRectInViewport(src, window.innerWidth, window.innerHeight)) {
      startFadeClose(popupEl);
      return true;
    }

    // Если закрытие началось во время открытия — подхватываем текущее положение на лету
    const interrupted = popupEl.classList.contains(MORPHING_CLASS);
    let fromTransform = "translate3d(0px, 0px, 0px)";
    let fromClipPath: string | null = null;
    if (interrupted) {
      const computed = getComputedStyle(popupEl);
      if (computed.transform && computed.transform !== "none") {
        fromTransform = computed.transform;
      }
      if (computed.clipPath && computed.clipPath !== "none") {
        fromClipPath = computed.clipPath;
      }
      popupEl.style.transition = "none";
      popupEl.style.transform = "none";
      popupEl.style.removeProperty("clip-path");
    }

    const dst = popupEl.getBoundingClientRect();
    const srcRadius = readBorderRadius(sourceCard, 16);
    const dstRadius = readBorderRadius(popupEl, 0);
    const geom = computeUnrollGeometry(src, dst, srcRadius, dstRadius);

    if (!geom) {
      startFadeClose(popupEl);
      return true;
    }

    const cardBg = readBackgroundColor(sourceCard);

    clearContentInlineStyles(contentEl);
    popupEl.classList.add(MORPHING_CLASS);
    popupEl.style.transition = "none";
    popupEl.style.transform = fromTransform;
    popupEl.style.clipPath = fromClipPath ?? geom.targetClipPath;
    popupEl.style.willChange = "clip-path, transform";

    if (veilEl) {
      veilEl.style.display = "block";
      veilEl.style.backgroundColor = cardBg;
      veilEl.style.transition = "none";
      veilEl.style.opacity = "0";
    }
    if (pageEl) {
      pageEl.style.transition = "none";
      pageEl.style.opacity = "1";
    }
    sourceCard.style.transition = "none";
    sourceCard.style.opacity = "0";

    void popupEl.offsetWidth;

    popupEl.style.transition = `clip-path ${MORPH_CLOSE_MS}ms ${MORPH_CLOSE_EASING}, transform ${MORPH_CLOSE_MS}ms ${MORPH_CLOSE_EASING}`;
    popupEl.style.transform = geom.transform;
    popupEl.style.clipPath = geom.clipPath;

    if (veilEl) {
      veilEl.style.transition = "opacity 190ms ease-in";
      veilEl.style.opacity = "1";
    }
    if (pageEl) {
      pageEl.style.transition = "opacity 100ms ease-in 230ms";
      pageEl.style.opacity = "0";
    }
    sourceCard.style.transition = "opacity 110ms ease-out 220ms";
    sourceCard.style.opacity = "1";

    return true;
  }

  function cleanup(): void {
    clearOpenTimer();
    if (popupEl) {
      popupEl.classList.remove(MORPH_CLASS, MORPHING_CLASS);
      clearPopupInlineStyles(popupEl);
    }
    clearPageInlineStyles(pageEl);
    clearContentInlineStyles(contentEl);
    clearVeilInlineStyles(veilEl);
    clearCardInlineStyles(sourceCard);
    active = false;
    sourceCard = null;
  }

  return {
    get isActive() {
      return active;
    },
    prepareOpen,
    prepareClose,
    startOpen,
    finishOpen,
    startClose,
    cleanup,
  };
}
