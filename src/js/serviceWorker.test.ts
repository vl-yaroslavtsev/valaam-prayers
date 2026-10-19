import { afterEach, describe, expect, it, vi } from "vitest";
import { disableServiceWorkerInNative } from "@/js/serviceWorker";
import { FakeNativeBackend } from "@/test/fakeNativeBackend";

function stubServiceWorker() {
  const unregister = vi.fn().mockResolvedValue(true);
  const getRegistrations = vi.fn().mockResolvedValue([{ unregister }, { unregister }]);
  vi.stubGlobal("navigator", { ...navigator, serviceWorker: { getRegistrations } });
  return { unregister, getRegistrations };
}

describe("disableServiceWorkerInNative", () => {
  let uninstall: (() => void) | null = null;

  afterEach(() => {
    uninstall?.();
    uninstall = null;
  });

  it("в браузере ничего не трогает", async () => {
    const { getRegistrations } = stubServiceWorker();
    await caches.open("images");

    await disableServiceWorkerInNative();

    expect(getRegistrations).not.toHaveBeenCalled();
    expect(await caches.has("images")).toBe(true);
    await caches.delete("images");
  });

  it("в нативке отписывает все регистрации и чистит кэши", async () => {
    uninstall = new FakeNativeBackend().install({ platform: "android" });
    const { unregister } = stubServiceWorker();
    await caches.open("images");
    await caches.open("workbox-precache-v2");

    await disableServiceWorkerInNative();

    expect(unregister).toHaveBeenCalledTimes(2);
    expect(await caches.keys()).toEqual([]);
  });

  it("ошибка не пробрасывается", async () => {
    uninstall = new FakeNativeBackend().install({ platform: "ios" });
    vi.stubGlobal("navigator", {
      ...navigator,
      serviceWorker: { getRegistrations: vi.fn().mockRejectedValue(new Error("boom")) },
    });

    await expect(disableServiceWorkerInNative()).resolves.toBeUndefined();
  });
});
