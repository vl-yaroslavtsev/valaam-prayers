import { describe, expect, it, vi } from "vitest";
import browser from "./browser";

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
        (window as Window & { androidJsHandler?: object }).androidJsHandler =
          {};
      },
    ],
    [
      "iOS",
      () => {
        delete (window as Window & { androidJsHandler?: object })
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
