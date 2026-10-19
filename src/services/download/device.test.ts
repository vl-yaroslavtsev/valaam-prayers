import { afterEach, describe, expect, it, vi } from "vitest";
import { getCalendarIconSize, getSaintIconSize } from "@/services/download/device";

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

describe("размер иконок для скачивания", () => {
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

  it("календарь всегда s", () => {
    stubMatchMedia(true);
    expect(getCalendarIconSize()).toBe("s");
    stubMatchMedia(false);
    expect(getCalendarIconSize()).toBe("s");
  });

  it("святые: l на планшете и m на телефоне", () => {
    stubMatchMedia(true);
    expect(getSaintIconSize()).toBe("l");

    stubMatchMedia(false);
    expect(getSaintIconSize()).toBe("m");
  });

  it("без matchMedia святые скачиваются как m", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    expect(getSaintIconSize()).toBe("m");
  });
});
