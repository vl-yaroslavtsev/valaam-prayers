import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FADE_CLOSE_MS,
  MORPH_CLASS,
  MORPH_CLOSE_MS,
  MORPH_OPEN_MS,
  MORPHING_CLASS,
  computeUnrollGeometry,
  createPopupMorphController,
  ensureCardInView,
  isRectInViewport,
  type RectLike,
} from "./popupMorphTransition";

function mockRect(el: HTMLElement, rect: RectLike): void {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    ...rect,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({}),
  } as DOMRect);
}

function setupDom({
  reducedMotion = false,
  cardRect = { left: 16, top: 220, width: 358, height: 210 },
  popupRect = { left: 0, top: 0, width: 390, height: 844 },
  cardBg = "rgb(43, 40, 38)",
  cardRadius = "16px",
  popupRadius = "0px",
} = {}) {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: reducedMotion }) as unknown as typeof window.matchMedia;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });

  const scrollWrap = document.createElement("div");
  scrollWrap.className = "page-content";
  const card = document.createElement("li");
  scrollWrap.append(card);

  const popup = document.createElement("div");
  const page = document.createElement("div");
  const content = document.createElement("div");
  const veil = document.createElement("div");
  page.append(content, veil);
  popup.append(page);
  document.body.append(scrollWrap, popup);

  mockRect(scrollWrap, { left: 0, top: 100, width: 390, height: 744 });
  mockRect(card, cardRect);
  mockRect(popup, popupRect);

  vi.spyOn(window, "getComputedStyle").mockImplementation((el) => {
    if (el === scrollWrap) {
      return {
        paddingTop: "100px",
        paddingBottom: "56px",
      } as CSSStyleDeclaration;
    }
    if (el === card || el.tagName === "LI") {
      return {
        backgroundColor: cardBg,
        borderTopLeftRadius: cardRadius,
        transform: "none",
        clipPath: "none",
      } as CSSStyleDeclaration;
    }
    return {
      backgroundColor: "rgb(255, 255, 255)",
      borderTopLeftRadius: popupRadius,
      transform: "none",
      clipPath: "none",
    } as CSSStyleDeclaration;
  });

  return { scrollWrap, card, popup, page, content, veil };
}

describe("popupMorphTransition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  describe("computeUnrollGeometry", () => {
    it("на телефоне вычисляет чистый clip-path inset без смещения и масштабирования", () => {
      const geom = computeUnrollGeometry(
        { left: 16, top: 220, width: 358, height: 210 },
        { left: 0, top: 0, width: 390, height: 844 },
        16,
        0,
      );

      expect(geom).not.toBeNull();
      expect(geom!.translateY).toBe(0);
      expect(geom!.transform).toBe("translate3d(0px, 0px, 0px)");
      expect(geom!.clipPath).toBe("inset(220px 16px 414px 16px round 16px)");
      expect(geom!.targetClipPath).toBe("inset(0px 0px 0px 0px round 0px)");
    });

    it("на планшете обрезает по вертикальной полосе строки таблицы без горизонтального клипа", () => {
      const geom = computeUnrollGeometry(
        { left: 80, top: 240, width: 864, height: 64 },
        { left: 272, top: 125, width: 480, height: 774 },
        16,
        16,
      );

      expect(geom).not.toBeNull();
      expect(geom!.translateY).toBe(0);
      expect(geom!.clipPath).toBe("inset(115px 0px 595px 0px round 16px)");
      expect(geom!.targetClipPath).toBe("inset(0px 0px 0px 0px round 16px)");
    });

    it("на планшете добавляет вертикальный сдвиг, если карточка ниже нижней границы попапа", () => {
      const geom = computeUnrollGeometry(
        { left: 80, top: 820, width: 864, height: 120 },
        { left: 272, top: 125, width: 480, height: 774 },
        16,
        16,
      );

      expect(geom).not.toBeNull();
      // Карточка выступает на 41px ниже dst.bottom (899)
      expect(geom!.translateY).toBe(41);
      expect(geom!.transform).toBe("translate3d(0px, 41px, 0px)");
      expect(geom!.clipPath).toBe("inset(654px 0px 0px 0px round 16px)");
    });

    it("возвращает null для пустых или совпадающих прямоугольников", () => {
      expect(
        computeUnrollGeometry(
          { left: 0, top: 0, width: 0, height: 100 },
          { left: 0, top: 0, width: 390, height: 844 },
          16,
          0,
        ),
      ).toBeNull();
      expect(
        computeUnrollGeometry(
          { left: 0, top: 0, width: 390, height: 844 },
          { left: 0, top: 0, width: 390, height: 844 },
          0,
          0,
        ),
      ).toBeNull();
    });
  });

  describe("isRectInViewport", () => {
    it("определяет видимость карточки в пределах экрана", () => {
      expect(isRectInViewport({ left: 16, top: 100, width: 300, height: 150 }, 390, 844)).toBe(true);
      expect(isRectInViewport({ left: 16, top: -50, width: 300, height: 150 }, 390, 844)).toBe(true);
      expect(isRectInViewport({ left: 16, top: -200, width: 300, height: 150 }, 390, 844)).toBe(false);
      expect(isRectInViewport({ left: 16, top: 900, width: 300, height: 150 }, 390, 844)).toBe(false);
      expect(isRectInViewport({ left: 16, top: 100, width: 0, height: 150 }, 390, 844)).toBe(false);
    });
  });

  describe("ensureCardInView", () => {
    it("прокручивает контейнер списка так, чтобы новая карточка оказалась по центру видимой области", () => {
      const { scrollWrap, card } = setupDom({
        cardRect: { left: 16, top: 820, width: 358, height: 180 },
      });
      mockRect(scrollWrap, { left: 0, top: 0, width: 390, height: 844 });
      scrollWrap.scrollTop = 100;

      ensureCardInView(card);

      // видимая область: [100..788], центр = 444; центр карточки = 910 => delta = +466 => scrollTop = 566
      expect(scrollWrap.scrollTop).toBe(566);
    });

    it("не уводит scrollTop ниже нуля, если карточка в самом начале списка", () => {
      const { scrollWrap, card } = setupDom({
        cardRect: { left: 16, top: 116, width: 358, height: 180 },
      });
      mockRect(scrollWrap, { left: 0, top: 0, width: 390, height: 844 });
      scrollWrap.scrollTop = 0;

      ensureCardInView(card);

      expect(scrollWrap.scrollTop).toBe(0);
    });
  });

  describe("createPopupMorphController", () => {
    it("не включает морф при prefers-reduced-motion или отсутствии карточки", () => {
      const { card, popup } = setupDom({ reducedMotion: true });
      const controller = createPopupMorphController();

      expect(controller.prepareOpen(popup, card)).toBe(false);
      expect(controller.isActive).toBe(false);
      expect(popup.classList.contains(MORPH_CLASS)).toBe(false);

      const { popup: popup2 } = setupDom({ reducedMotion: false });
      expect(controller.prepareOpen(popup2, null)).toBe(false);
    });

    it("раскрывает попап свитком без масштабирования и очищает inline-стили после открытия", () => {
      const { card, popup, page, content, veil } = setupDom({ cardBg: "rgb(43, 40, 38)" });
      const controller = createPopupMorphController();

      expect(controller.prepareOpen(popup, card)).toBe(true);
      expect(popup.classList.contains(MORPH_CLASS)).toBe(true);

      expect(controller.startOpen(popup, page, veil, content)).toBe(true);
      expect(popup.classList.contains(MORPHING_CLASS)).toBe(true);
      expect(popup.style.transition).toContain(`clip-path ${MORPH_OPEN_MS}ms`);
      expect(popup.style.transition).toContain(`transform ${MORPH_OPEN_MS}ms`);
      expect(popup.style.transform).toBe("translate3d(0px, 0px, 0px)");
      expect(popup.style.clipPath).toBe("inset(0px 0px 0px 0px round 0px)");
      expect(content.style.transform).toBe("translate3d(0px, 0px, 0px)");
      expect(content.style.opacity).toBe("1");
      expect(veil.style.display).toBe("block");
      expect(veil.style.backgroundColor).toBe("rgb(43, 40, 38)");
      expect(veil.style.opacity).toBe("0");
      expect(page.style.opacity).toBe("1");
      expect(card.style.opacity).toBe("0");

      controller.finishOpen();
      expect(popup.classList.contains(MORPH_CLASS)).toBe(true);
      expect(popup.classList.contains(MORPHING_CLASS)).toBe(false);
      expect(popup.style.transform).toBe("");
      expect(popup.style.clipPath).toBe("");
      expect(content.style.transform).toBe("");
      expect(veil.style.display).toBe("");
      expect(card.style.opacity).toBe("0");
    });

    it("сворачивает попап обратно в обновлённую карточку и полностью очищается после cleanup", () => {
      const { card, popup, page, content, veil } = setupDom();
      const controller = createPopupMorphController();
      controller.prepareOpen(popup, card);
      controller.startOpen(popup, page, veil, content);
      controller.finishOpen();

      // Карточка после редактирования стала выше
      mockRect(card, { left: 16, top: 220, width: 358, height: 280 });
      expect(controller.startClose("morph", () => card)).toBe(true);

      expect(popup.classList.contains(MORPHING_CLASS)).toBe(true);
      expect(popup.style.transition).toContain(`clip-path ${MORPH_CLOSE_MS}ms`);
      expect(popup.style.clipPath).toBe("inset(220px 16px 344px 16px round 16px)");
      expect(popup.style.transform).toBe("translate3d(0px, 0px, 0px)");
      expect(veil.style.opacity).toBe("1");
      expect(page.style.opacity).toBe("0");
      expect(card.style.opacity).toBe("1");

      controller.cleanup();
      expect(controller.isActive).toBe(false);
      expect(popup.classList.contains(MORPH_CLASS)).toBe(false);
      expect(popup.classList.contains(MORPHING_CLASS)).toBe(false);
      expect(popup.getAttribute("style") ?? "").toBe("");
      expect(card.getAttribute("style") ?? "").toBe("");
    });

    it("при дублировании в корзине возвращает исходную карточку и сворачивается в новую внизу", () => {
      const { scrollWrap, card, popup, page, content, veil } = setupDom();
      const controller = createPopupMorphController();
      controller.prepareOpen(popup, card);
      controller.startOpen(popup, page, veil, content);
      controller.finishOpen();

      const newCard = document.createElement("li");
      scrollWrap.append(newCard);
      mockRect(newCard, { left: 16, top: 520, width: 358, height: 200 });

      expect(controller.startClose("morph", () => newCard)).toBe(true);

      // Исходная карточка сразу возвращена, попап сворачивается в новую
      expect(card.style.opacity).toBe("");
      expect(popup.style.clipPath).toBe("inset(520px 16px 124px 16px round 16px)");
      expect(newCard.style.opacity).toBe("1");
    });

    it("при создании новой записки через prepareClose сворачивается в появившуюся карточку", () => {
      const { scrollWrap, popup, page, content, veil } = setupDom();
      const controller = createPopupMorphController();

      const createdCard = document.createElement("li");
      scrollWrap.append(createdCard);
      mockRect(createdCard, { left: 16, top: 480, width: 358, height: 200 });

      expect(controller.prepareClose(popup, page, veil, content)).toBe(true);
      expect(popup.classList.contains(MORPH_CLASS)).toBe(true);
      expect(controller.startClose("morph", () => createdCard)).toBe(true);
      expect(popup.style.clipPath).toBe("inset(480px 16px 164px 16px round 16px)");
    });

    it("закрывает с мягким затуханием в режиме fade и сразу возвращает карточку в списке", () => {
      const { card, popup, page, content, veil } = setupDom();
      const controller = createPopupMorphController();
      controller.prepareOpen(popup, card);
      controller.startOpen(popup, page, veil, content);
      controller.finishOpen();

      expect(controller.startClose("fade")).toBe(true);
      expect(card.style.opacity).toBe("");
      expect(popup.style.transition).toContain(`transform ${FADE_CLOSE_MS}ms`);
      expect(popup.style.transition).toContain(`opacity ${FADE_CLOSE_MS}ms`);
      expect(popup.style.transform).toBe("scale(0.94)");
      expect(popup.style.opacity).toBe("0");
    });

    it("переключается на затухание, если целевая карточка ушла за пределы экрана", () => {
      const { card, popup, page, content, veil } = setupDom();
      const controller = createPopupMorphController();
      controller.prepareOpen(popup, card);
      controller.startOpen(popup, page, veil, content);
      controller.finishOpen();

      mockRect(card, { left: 16, top: -500, width: 358, height: 210 });
      expect(controller.startClose("morph", () => card)).toBe(true);
      expect(popup.style.opacity).toBe("0");
      expect(popup.style.transform).toBe("scale(0.94)");
      expect(card.style.opacity).toBe("");
    });
  });
});
