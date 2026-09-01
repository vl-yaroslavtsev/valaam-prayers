import { describe, expect, it, vi } from "vitest";
import { isOnline, onNetworkChange } from "@/services/download/network";

describe("network", () => {
  it("isOnline читает navigator.onLine", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    expect(isOnline()).toBe(false);

    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    expect(isOnline()).toBe(true);
  });

  it("onNetworkChange подписывается и отписывается", () => {
    const callback = vi.fn();
    const unsubscribe = onNetworkChange(callback);

    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("offline"));
    expect(callback).toHaveBeenNthCalledWith(1, true);
    expect(callback).toHaveBeenNthCalledWith(2, false);

    callback.mockClear();
    unsubscribe();
    window.dispatchEvent(new Event("online"));
    expect(callback).not.toHaveBeenCalled();
  });
});
