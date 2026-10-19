import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadManager } from "@/services/download/DownloadManager";
import { isOnline } from "@/services/download/network";
import { ALL_MODULE_IDS } from "@/services/download/types";
import { getAutoUpdateLastCheck, startAutoUpdate, stopAutoUpdate } from "@/services/download/AutoUpdate";
import { FakeNativeBackend } from "@/test/fakeNativeBackend";
import { resetIndexedDB } from "@/test/helpers";

vi.mock("@/services/download/DownloadManager", () => ({
  downloadManager: {
    checkForUpdate: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/download/network", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/download/network")>();
  return {
    ...actual,
    isOnline: vi.fn(() => true),
  };
});

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

describe("AutoUpdate", () => {
  beforeEach(() => {
    vi.mocked(isOnline).mockReturnValue(true);
    vi.mocked(downloadManager.checkForUpdate).mockClear();
  });

  afterEach(() => {
    stopAutoUpdate();
    vi.useRealTimers();
  });

  it("checkForUpdate вызывается сразу и затем каждые 6 часов", async () => {
    vi.useFakeTimers();
    startAutoUpdate();

    expect(downloadManager.checkForUpdate).toHaveBeenCalledTimes(ALL_MODULE_IDS.length);

    vi.mocked(downloadManager.checkForUpdate).mockClear();
    await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS);

    expect(downloadManager.checkForUpdate).toHaveBeenCalledTimes(ALL_MODULE_IDS.length);
  });

  it("событие online триггерит внеочередную проверку", () => {
    startAutoUpdate();
    vi.mocked(downloadManager.checkForUpdate).mockClear();

    window.dispatchEvent(new Event("online"));

    expect(downloadManager.checkForUpdate).toHaveBeenCalledTimes(ALL_MODULE_IDS.length);
  });

  it("stopAutoUpdate отписывается от сети и останавливает таймер", async () => {
    vi.useFakeTimers();
    startAutoUpdate();
    stopAutoUpdate();
    vi.mocked(downloadManager.checkForUpdate).mockClear();

    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS);

    expect(downloadManager.checkForUpdate).not.toHaveBeenCalled();
  });

  describe("время последней проверки (браузер)", () => {
    beforeEach(async () => {
      await resetIndexedDB();
    });

    it("записывается после успешной проверки всех модулей", async () => {
      expect(await getAutoUpdateLastCheck()).toBeNull();

      startAutoUpdate();

      await vi.waitFor(async () => expect(await getAutoUpdateLastCheck()).toBeInstanceOf(Date));
    });

    it("не записывается, если проверка хотя бы одного модуля упала", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(downloadManager.checkForUpdate).mockRejectedValueOnce(new Error("offline"));

      startAutoUpdate();
      await vi.waitFor(() => expect(downloadManager.checkForUpdate).toHaveBeenCalledTimes(ALL_MODULE_IDS.length));
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(await getAutoUpdateLastCheck()).toBeNull();
    });
  });

  describe("нативный режим", () => {
    let backend: FakeNativeBackend;
    let uninstall: () => void;

    beforeEach(() => {
      backend = new FakeNativeBackend();
      backend.on("autoUpdate.set", ({ enabled }) => ({ enabled, lastCheckAt: null }));
      uninstall = backend.install();
    });

    afterEach(() => uninstall());

    it("start и stop переключают нативное автообновление, JS-таймер не запускается", async () => {
      startAutoUpdate();
      await vi.waitFor(() => expect(backend.callsOf("autoUpdate.set")).toEqual([{ enabled: true }]));

      stopAutoUpdate();
      await vi.waitFor(() => expect(backend.callsOf("autoUpdate.set")).toEqual([{ enabled: true }, { enabled: false }]));

      expect(downloadManager.checkForUpdate).not.toHaveBeenCalled();
    });

    it("ошибка нативки не бросается наружу", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      backend.on("autoUpdate.set", () => {
        throw new Error("boom");
      });

      expect(() => startAutoUpdate()).not.toThrow();
      await vi.waitFor(() => expect(console.error).toHaveBeenCalled());
    });

    it("lastCheckAt берётся из autoUpdate.getState", async () => {
      backend.on("autoUpdate.getState", () => ({
        enabled: true,
        lastCheckAt: "2026-04-01T10:00:00.000Z",
        nextCheckAt: null,
        running: false,
      }));

      expect((await getAutoUpdateLastCheck())?.toISOString()).toBe("2026-04-01T10:00:00.000Z");
    });

    it("без проверок lastCheckAt = null", async () => {
      backend.on("autoUpdate.getState", () => ({ enabled: true, lastCheckAt: null, nextCheckAt: null, running: false }));

      expect(await getAutoUpdateLastCheck()).toBeNull();
    });
  });
});
