import { createApp, defineComponent, nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useReadingTutorial } from "@/composables/useReadingTutorial";
import { useReadingHints } from "@/composables/useReadingHints";

const createHarness = () => {
  const pinia = createPinia();
  setActivePinia(pinia);

  const isNavbarHidden = ref(true);
  const isPageNavHidden = ref(true);
  const isChapterNavActive = ref(false);
  const isBookmarkNavActive = ref(false);
  const onOpenSettings = vi.fn();

  const chapterToolbarEl = document.createElement("div");
  const chapterLinkEl = document.createElement("a");
  const bookmarkToolbarEl = document.createElement("div");
  const bookmarkLinkEl = document.createElement("a");
  const menuIconEl = document.createElement("a");
  const resetLinkEl = document.createElement("a");

  let tutorial!: ReturnType<typeof useReadingTutorial>;
  let hints!: ReturnType<typeof useReadingHints>;

  const host = document.createElement("div");
  const app = createApp(
    defineComponent({
      setup() {
        tutorial = useReadingTutorial();
        hints = useReadingHints({
          tutorial,
          isNavbarHidden,
          isPageNavHidden,
          isChapterNavActive,
          isBookmarkNavActive,
          toolbars: {
            navbar: ref({ getIconTargets: () => [{ key: "menu" as const, el: menuIconEl }] }),
            pageNav: ref({ getResetLinkEl: () => resetLinkEl }),
            chapterNav: ref({
              getToolbarEl: () => chapterToolbarEl,
              getContentLinkEl: () => chapterLinkEl,
            }),
            bookmarkNav: ref({
              getToolbarEl: () => bookmarkToolbarEl,
              getListLinkEl: () => bookmarkLinkEl,
            }),
          },
          onOpenSettings,
        });
        return () => null;
      },
    })
  );
  app.use(pinia);
  app.mount(host);

  return {
    app,
    tutorial,
    hints,
    isNavbarHidden,
    isPageNavHidden,
    isChapterNavActive,
    isBookmarkNavActive,
    onOpenSettings,
  };
};

describe("useReadingHints", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("показывает подсказку тулбара глав через 350 мс и открывает настройки по ссылке", async () => {
    const h = createHarness();

    h.isChapterNavActive.value = true;
    await nextTick();
    await nextTick();
    expect(h.hints.activeHintTargets.value).toBeNull();

    vi.advanceTimersByTime(350);
    expect(h.hints.activeHintTargets.value?.length).toBe(2);
    expect(h.hints.activeHintTargets.value?.[0].title).toBe("Листание по главам");

    h.hints.activeHintTargets.value?.[0].link?.onClick();
    expect(h.hints.activeHintTargets.value).toBeNull();
    expect(h.tutorial.shouldShowChapterNavHint.value).toBe(false);
    expect(h.onOpenSettings).toHaveBeenCalledTimes(1);

    h.app.unmount();
  });

  it("показывает подсказку закладок и закрывает её при выключении режима закладок", async () => {
    const h = createHarness();

    h.isBookmarkNavActive.value = true;
    await nextTick();
    await nextTick();
    vi.advanceTimersByTime(350);
    expect(h.hints.activeHintTargets.value?.length).toBe(2);

    h.isBookmarkNavActive.value = false;
    await nextTick();
    expect(h.hints.activeHintTargets.value).toBeNull();
    expect(h.tutorial.shouldShowBookmarkNavHint.value).toBe(false);

    h.app.unmount();
  });

  it("показывает подсказку верхнего меню и сброса прогресса при раскрытии панелей", async () => {
    const h = createHarness();

    h.isNavbarHidden.value = false;
    h.isPageNavHidden.value = false;
    await nextTick();
    vi.advanceTimersByTime(350);

    expect(h.hints.activeHintTargets.value?.map((t) => t.title)).toEqual([
      "Содержание и закладки",
      "Читать сначала",
    ]);

    h.hints.closeActiveHint();
    expect(h.tutorial.shouldShowBarsHint.value).toBe(false);

    h.app.unmount();
  });

  it("отменяет отложенные таймеры через onCleanup при размонтировании", async () => {
    const h = createHarness();

    h.isChapterNavActive.value = true;
    await nextTick();
    h.app.unmount();

    vi.advanceTimersByTime(500);
    expect(h.hints.activeHintTargets.value).toBeNull();
  });
});
