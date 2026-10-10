import { describe, expect, it, vi } from "vitest";
import type { Router } from "framework7/types";
import { navigateWhenReady } from "./viewsManager";

function createRouter(allowPageChange: boolean) {
  const router = {
    allowPageChange,
    navigate: vi.fn(),
    once: vi.fn(),
  };
  return router as unknown as Router.Router & {
    navigate: ReturnType<typeof vi.fn>;
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
