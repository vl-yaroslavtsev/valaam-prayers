import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COLLAPSE_MS, onItemBeforeEnter, onItemEnter, onItemLeave } from "./collapseTransition";

const GAP = 12;
const HEIGHT = 80;

function setup(reducedMotion = false) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: reducedMotion }) as unknown as typeof window.matchMedia;

  const list = document.createElement("div");
  const node = document.createElement("div");
  list.append(node);
  document.body.append(list);

  // jsdom не считает раскладку и не знает row-gap — подставляем значения, как их вернул бы браузер
  Object.defineProperty(node, "offsetHeight", { configurable: true, value: HEIGHT });
  vi.spyOn(window, "getComputedStyle").mockReturnValue({ rowGap: `${GAP}px` } as CSSStyleDeclaration);

  return node;
}

function transitionEnd(node: HTMLElement, propertyName: string, target: HTMLElement = node) {
  const event = new Event("transitionend", { bubbles: true });
  Object.assign(event, { propertyName });
  target.dispatchEvent(event);
}

describe("collapseTransition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  describe("onItemLeave", () => {
    it("фиксирует текущую высоту, затем схлопывает элемент вместе с зазором", () => {
      const node = setup();
      const done = vi.fn();

      onItemLeave(node, done);

      expect(node.style.height).toBe("0px");
      expect(node.style.paddingTop).toBe("0px");
      expect(node.style.paddingBottom).toBe("0px");
      expect(node.style.borderTopWidth).toBe("0px");
      expect(node.style.borderBottomWidth).toBe("0px");
      expect(node.style.marginBottom).toBe(`${-GAP}px`);
      expect(node.style.opacity).toBe("0");
      expect(node.style.overflow).toBe("hidden");
      for (const prop of ["height", "padding-top", "margin-bottom", "opacity"]) {
        expect(node.style.transition).toContain(`${prop} ${COLLAPSE_MS}ms`);
      }
      expect(done).not.toHaveBeenCalled();
    });

    it("завершается по transitionend высоты и только один раз", () => {
      const node = setup();
      const done = vi.fn();
      onItemLeave(node, done);

      transitionEnd(node, "opacity");
      expect(done).not.toHaveBeenCalled();

      transitionEnd(node, "height");
      expect(done).toHaveBeenCalledTimes(1);

      transitionEnd(node, "height");
      vi.advanceTimersByTime(COLLAPSE_MS * 3);
      expect(done).toHaveBeenCalledTimes(1);
    });

    it("игнорирует transitionend вложенных элементов", () => {
      const node = setup();
      const child = document.createElement("span");
      node.append(child);
      const done = vi.fn();
      onItemLeave(node, done);

      transitionEnd(node, "height", child);

      expect(done).not.toHaveBeenCalled();
    });

    it("завершается по запасному таймеру, если transitionend не пришёл", () => {
      const node = setup();
      const done = vi.fn();
      onItemLeave(node, done);

      vi.advanceTimersByTime(COLLAPSE_MS * 3 - 1);
      expect(done).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(done).toHaveBeenCalledTimes(1);
    });

    it("при prefers-reduced-motion удаляет сразу, без стилей анимации", () => {
      const node = setup(true);
      const done = vi.fn();

      onItemLeave(node, done);

      expect(done).toHaveBeenCalledTimes(1);
      expect(node.getAttribute("style")).toBeNull();
    });
  });

  describe("onItemEnter", () => {
    it("перед появлением элемент прозрачный", () => {
      const node = setup();
      onItemBeforeEnter(node);
      expect(node.style.opacity).toBe("0");
    });

    it("раскрывает элемент до естественной высоты и возвращает стили из CSS", () => {
      const node = setup();
      const done = vi.fn();

      onItemEnter(node, done);

      expect(node.style.height).toBe(`${HEIGHT}px`);
      expect(node.style.opacity).toBe("1");
      // отступы и границы не заданы inline — берутся из стилей компонента
      expect(node.style.paddingTop).toBe("");
      expect(node.style.paddingBottom).toBe("");
      expect(node.style.borderTopWidth).toBe("");
      expect(node.style.borderBottomWidth).toBe("");
      expect(node.style.marginBottom).toBe("");
      expect(node.style.transition).toContain(`height ${COLLAPSE_MS}ms`);
      expect(done).not.toHaveBeenCalled();
    });

    it("после завершения убирает все inline-стили анимации", () => {
      const node = setup();
      const done = vi.fn();
      onItemEnter(node, done);

      transitionEnd(node, "height");

      expect(done).toHaveBeenCalledTimes(1);
      expect(node.getAttribute("style") ?? "").toBe("");
    });

    it("после запасного таймера тоже убирает стили и вызывает done", () => {
      const node = setup();
      const done = vi.fn();
      onItemEnter(node, done);

      vi.advanceTimersByTime(COLLAPSE_MS * 3);

      expect(done).toHaveBeenCalledTimes(1);
      expect(node.getAttribute("style") ?? "").toBe("");
    });

    it("при prefers-reduced-motion показывает сразу и убирает прозрачность из before-enter", () => {
      const node = setup(true);
      const done = vi.fn();
      onItemBeforeEnter(node);

      onItemEnter(node, done);

      expect(done).toHaveBeenCalledTimes(1);
      expect(node.getAttribute("style") ?? "").toBe("");
    });
  });
});
