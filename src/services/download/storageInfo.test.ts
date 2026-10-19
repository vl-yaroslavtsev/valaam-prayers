import { afterEach, describe, expect, it, vi } from "vitest";
import { getOfflineQuota } from "@/services/download/storageInfo";
import { FakeNativeBackend } from "@/test/fakeNativeBackend";

describe("getOfflineQuota", () => {
  let uninstall: (() => void) | null = null;

  afterEach(() => {
    uninstall?.();
    uninstall = null;
  });

  it("в нативке считает квоту как занято офлайн-данными плюс свободно", async () => {
    const backend = new FakeNativeBackend().on("storage.getInfo", () => ({
      offlineUsedBytes: 100,
      freeBytes: 900,
      totalBytes: 5000,
    }));
    uninstall = backend.install();

    expect(await getOfflineQuota()).toEqual({ usage: 100, free: 900, quota: 1000 });
  });

  it("в браузере берёт navigator.storage.estimate", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 10, quota: 50 }) },
    });

    expect(await getOfflineQuota()).toEqual({ usage: 10, free: 40, quota: 50 });
  });
});
