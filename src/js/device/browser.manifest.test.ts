import { describe, expect, it, vi } from "vitest";
import browser from "./browser";

describe("browser status bar", () => {
  it("записывает цвет в meta theme-color", () => {
    document.head.innerHTML = '<meta name="theme-color" content="#fff" />';

    browser.setStatusBarColor("#1f1b1a");

    expect(
      document.querySelector('meta[name="theme-color"]')?.getAttribute("content")
    ).toBe("#1f1b1a");
  });

  it("создаёт meta theme-color, если тега ещё нет", () => {
    document.head.innerHTML = "";

    browser.setStatusBarColor("#e7e6e6");

    expect(
      document.querySelector('meta[name="theme-color"]')?.getAttribute("content")
    ).toBe("#e7e6e6");
  });
});

describe("browser manifest", () => {
  it("добавляет ссылку на манифест в браузере", () => {
    document.querySelector('link[rel="manifest"]')?.remove();

    browser.init();

    const link = document.querySelector('link[rel="manifest"]');
    expect(link?.getAttribute("href")).toBe("./manifest.json");
  });

  it.each([
    [
      "Android",
      () => {
        (window as unknown as { androidJsHandler?: object }).androidJsHandler =
          {};
      },
    ],
    [
      "iOS",
      () => {
        delete (window as unknown as { androidJsHandler?: object })
          .androidJsHandler;
        window.webkit = {
          messageHandlers: {},
        } as unknown as typeof window.webkit;
      },
    ],
  ])("не добавляет манифест в WebView %s", async (_label, setup) => {
    vi.resetModules();
    document.querySelector('link[rel="manifest"]')?.remove();
    setup();

    await import("./index");

    expect(document.querySelector('link[rel="manifest"]')).toBeNull();
  });
});
