import { describe, expect, it } from "vitest";
import { SCREEN_EDGE_WIDTH, isScreenEdgeClientX } from "./useSwipeout";

describe("isScreenEdgeClientX", () => {
  const width = 400;

  it("считает краем полосу SCREEN_EDGE_WIDTH у обоих краёв", () => {
    expect(isScreenEdgeClientX(0, width)).toBe(true);
    expect(isScreenEdgeClientX(SCREEN_EDGE_WIDTH - 1, width)).toBe(true);
    expect(isScreenEdgeClientX(SCREEN_EDGE_WIDTH, width)).toBe(false);

    expect(isScreenEdgeClientX(width - SCREEN_EDGE_WIDTH, width)).toBe(false);
    expect(isScreenEdgeClientX(width - SCREEN_EDGE_WIDTH + 1, width)).toBe(true);
    expect(isScreenEdgeClientX(width - 1, width)).toBe(true);
  });
});
