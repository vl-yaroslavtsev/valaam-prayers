import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadManager } from "@/services/download/DownloadManager";
import { isOnline } from "@/services/download/network";
import { ALL_MODULE_IDS } from "@/services/download/types";
import { startAutoUpdate, stopAutoUpdate } from "@/services/download/AutoUpdate";

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
});
