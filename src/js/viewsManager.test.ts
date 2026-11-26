import { describe, expect, it, vi } from "vitest";
import type { Router } from "framework7/types";
import { navigateWhenReady, parseCalendarDayUrl, returnToRootWhenReady } from "./viewsManager";

function createRouter(allowPageChange: boolean, history: string[] = ["/calendar/"]) {
  const router = {
    allowPageChange,
    history,
    navigate: vi.fn(),
    back: vi.fn(),
    once: vi.fn(),
  };
  return router as unknown as Router.Router & {
    navigate: ReturnType<typeof vi.fn>;
    back: ReturnType<typeof vi.fn>;
    once: ReturnType<typeof vi.fn>;
  };
}

describe("navigateWhenReady", () => {
  it("сразу открывает url, если роутер уже инициализирован", () => {
    const router = createRouter(true);

    navigateWhenReady(router, "/days/20261031");

    expect(router.navigate).toHaveBeenCalledWith("/days/20261031");
    expect(router.once).not.toHaveBeenCalled();
  });

  it("ждёт окончания стартовой страницы, если вкладку открывают впервые", () => {
    const router = createRouter(false);

    navigateWhenReady(router, "/days/20261031");

    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.once).toHaveBeenCalledWith("pageAfterIn", expect.any(Function));

    const onPageAfterIn = router.once.mock.calls[0][1] as () => void;
    onPageAfterIn();

    expect(router.navigate).toHaveBeenCalledWith("/days/20261031");
  });
});

describe("parseCalendarDayUrl", () => {
  it("извлекает код дня из /days/YYYYMMDD (с закрывающим слэшем и без)", () => {
    expect(parseCalendarDayUrl("/days/20261031")).toBe("20261031");
    expect(parseCalendarDayUrl("/days/20261031/")).toBe("20261031");
  });

  it("не трогает подпути чтений, текстов и другие адреса", () => {
    expect(parseCalendarDayUrl("/days/20261031/readings/105194")).toBeNull();
    expect(parseCalendarDayUrl("/days/20261031/text/thought")).toBeNull();
    expect(parseCalendarDayUrl("/saints/42")).toBeNull();
  });
});

describe("returnToRootWhenReady", () => {
  it("сразу закрывает одну страницу поверх корня без пересоздания", () => {
    const router = createRouter(true, ["/calendar/", "/saints/42"]);

    returnToRootWhenReady(router);

    expect(router.back).toHaveBeenCalledWith("", { animate: false });
  });

  it("сбрасывает глубокий стек истории до корневого маршрута", () => {
    const router = createRouter(true, ["/calendar/", "/saints/42", "/saints/42/life"]);

    returnToRootWhenReady(router);

    expect(router.back).toHaveBeenCalledWith("/calendar/", { force: true, animate: false });
  });

  it("ждёт pageAfterIn, если роутер занят переходом", () => {
    const router = createRouter(false, ["/calendar/", "/saints/42"]);

    returnToRootWhenReady(router);

    expect(router.back).not.toHaveBeenCalled();
    expect(router.once).toHaveBeenCalledWith("pageAfterIn", expect.any(Function));

    const onPageAfterIn = router.once.mock.calls[0][1] as () => void;
    onPageAfterIn();

    expect(router.back).toHaveBeenCalledWith("", { animate: false });
  });
});
