import { nextTick } from "vue";
import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSettingsStore } from "@/stores/settings";
import { useReadingChrome } from "@/composables/useReadingChrome";

describe("useReadingChrome", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("управляет видимостью панелей и временно отключает анимацию при hideBarsInstant", async () => {
    const chrome = useReadingChrome({ getViewportWidth: () => 390 });

    chrome.showReadingBars();
    expect(chrome.isNavbarHidden.value).toBe(false);
    expect(chrome.isPageNavHidden.value).toBe(false);

    chrome.hideNavbar();
    expect(chrome.isNavbarHidden.value).toBe(true);
    expect(chrome.isPageNavHidden.value).toBe(false);

    chrome.showReadingBars();
    chrome.hideBars();
    expect(chrome.isNavbarHidden.value).toBe(true);
    expect(chrome.isPageNavHidden.value).toBe(true);
    expect(chrome.readingBarsAnimate.value).toBe(true);

    chrome.showReadingBars();
    chrome.hideBarsInstant();
    expect(chrome.isNavbarHidden.value).toBe(true);
    expect(chrome.isPageNavHidden.value).toBe(true);
    expect(chrome.readingBarsAnimate.value).toBe(false);

    await nextTick();
    expect(chrome.readingBarsAnimate.value).toBe(true);
  });

  it("управляет состоянием скраббинга и сбрасывает его при скрытии нижней панели", () => {
    const chrome = useReadingChrome({ getViewportWidth: () => 390 });
    chrome.showReadingBars();

    chrome.onPageScrubMove(12);
    expect(chrome.isNavbarHidden.value).toBe(true);
    expect(chrome.isSliderScrubbing.value).toBe(true);
    expect(chrome.isPageScrubbing.value).toBe(true);
    expect(chrome.scrubPreviewPage.value).toBe(12);

    chrome.onPageScrubSettle();
    expect(chrome.isPageScrubbing.value).toBe(false);

    chrome.onPageScrubEnd();
    expect(chrome.scrubPreviewPage.value).toBeNull();

    chrome.onPageScrubMove(15);
    chrome.hideBars();
    expect(chrome.isSliderScrubbing.value).toBe(false);
    expect(chrome.scrubPreviewPage.value).toBeNull();
  });

  it("закрывает открытые меню касанием, но игнорирует свайп от края при скрытых системных панелях", () => {
    const settingsStore = useSettingsStore();
    settingsStore.setReadingSystemBars("hide-status-bar");

    const chrome = useReadingChrome({ getViewportWidth: () => 390 });
    chrome.showReadingBars();

    chrome.onTextTouchStart(new MouseEvent("mousedown", { clientX: 5 }));
    expect(chrome.isNavbarHidden.value).toBe(false);
    expect(chrome.isPageNavHidden.value).toBe(false);
    expect(chrome.consumeMenusClosedByTouch()).toBe(false);

    chrome.onPageScrubMove(8);
    chrome.onTextTouchStart(new MouseEvent("mousedown", { clientX: 180 }));
    expect(chrome.isNavbarHidden.value).toBe(true);
    expect(chrome.isPageNavHidden.value).toBe(true);
    expect(chrome.isSliderScrubbing.value).toBe(false);
    expect(chrome.scrubPreviewPage.value).toBeNull();
    expect(chrome.consumeMenusClosedByTouch()).toBe(true);
    expect(chrome.consumeMenusClosedByTouch()).toBe(false);

    settingsStore.setReadingSystemBars("normal");
    chrome.showReadingBars();
    chrome.onTextTouchStart(new MouseEvent("mousedown", { clientX: 5 }));
    expect(chrome.isNavbarHidden.value).toBe(true);
    expect(chrome.consumeMenusClosedByTouch()).toBe(true);
  });
});
