import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { downloadManager } from "@/services/download/DownloadManager";
import { useDownloadsStore } from "@/stores/downloads";

vi.mock("@/services/download/DownloadManager", () => ({
  downloadManager: {
    getProgress: vi.fn(),
    getModuleSize: vi.fn(),
    isDownloaded: vi.fn(),
    startDownload: vi.fn(),
    checkForUpdate: vi.fn(),
    cancelDownload: vi.fn(),
    deleteDownload: vi.fn(),
  },
}));

describe("useDownloadsStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("progress реактивно обновляется по onProgress из startDownload", async () => {
    vi.mocked(downloadManager.startDownload).mockImplementation(async (moduleId, onProgress) => {
      onProgress?.({
        moduleId,
        status: "downloading",
        downloadedBytes: 40,
        totalBytes: 100,
        updatedAt: 1,
      });
    });

    const store = useDownloadsStore();
    await store.startDownload("saints");

    expect(store.progress.saints?.downloadedBytes).toBe(40);
    expect(store.progress.saints?.status).toBe("downloading");
  });

  it("checkForUpdate реактивно обновляет progress и пробрасывает since", async () => {
    const since = new Date("2026-01-01T00:00:00.000Z");
    vi.mocked(downloadManager.checkForUpdate).mockImplementation(async (moduleId, onProgress, passedSince) => {
      expect(passedSince).toBe(since);
      onProgress?.({
        moduleId,
        status: "downloading",
        downloadedBytes: 8,
        totalBytes: 20,
        updatedAt: 1,
      });
    });

    const store = useDownloadsStore();
    await store.checkForUpdate("molitvoslov", since);

    expect(store.progress.molitvoslov?.downloadedBytes).toBe(8);
    expect(downloadManager.checkForUpdate).toHaveBeenCalledWith("molitvoslov", expect.any(Function), since);
  });

  it("cancelDownload чистит progress[moduleId]", async () => {
    const store = useDownloadsStore();
    store.progress.saints = {
      moduleId: "saints",
      status: "downloading",
      downloadedBytes: 10,
      totalBytes: 100,
      updatedAt: 1,
    };

    await store.cancelDownload("saints");

    expect(store.progress.saints).toBeUndefined();
    expect(downloadManager.cancelDownload).toHaveBeenCalledWith("saints");
  });

  it("deleteDownload чистит progress[moduleId]", async () => {
    const store = useDownloadsStore();
    store.progress.calendar = {
      moduleId: "calendar",
      status: "completed",
      downloadedBytes: 100,
      totalBytes: 100,
      updatedAt: 1,
    };

    await store.deleteDownload("calendar");

    expect(store.progress.calendar).toBeUndefined();
    expect(downloadManager.deleteDownload).toHaveBeenCalledWith("calendar");
  });
});
