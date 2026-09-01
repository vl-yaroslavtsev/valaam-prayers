import { afterEach, describe, expect, it, vi } from "vitest";
import { getIconSize } from "@/services/download/device";

function stubMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: "(min-width: 768px)",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as typeof window.matchMedia;
}

describe("getIconSize", () => {
  afterEach(() => {
    if (!window.matchMedia) {
      window.matchMedia = () =>
        ({
          matches: false,
          media: "",
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList;
    }
  });

  it("возвращает m при ширине >= 768px и s иначе", () => {
    stubMatchMedia(true);
    expect(getIconSize()).toBe("m");

    stubMatchMedia(false);
    expect(getIconSize()).toBe("s");
  });

  it("возвращает s если matchMedia отсутствует", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    expect(getIconSize()).toBe("s");
  });
});
