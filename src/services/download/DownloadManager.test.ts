import { beforeEach, describe, expect, it, vi } from "vitest";
import { DownloadManager } from "@/services/download/DownloadManager";
import { getModule } from "@/services/download/modules";
import { downloadProgressStorage, metadataStorage } from "@/services/storage";
import type { DownloadModule, DownloadModuleId } from "@/services/download/types";
import { resetIndexedDB } from "@/test/helpers";

vi.mock("@/services/download/modules", () => ({
  getModule: vi.fn(),
}));

const getModuleMock = vi.mocked(getModule);

function mockModule(overrides: Partial<DownloadModule> = {}): DownloadModule {
  return {
    id: "saints",
    getSize: vi.fn().mockResolvedValue(100),
    download: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("DownloadManager", () => {
  let manager: DownloadManager;

  beforeEach(async () => {
    await resetIndexedDB();
    manager = new DownloadManager();
    getModuleMock.mockReset();
    getModuleMock.mockReturnValue(mockModule());
  });

  it("startDownload не плодит параллельные процессы для одного moduleId", async () => {
    let release!: () => void;
    const download = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    getModuleMock.mockReturnValue(mockModule({ download }));

    const first = manager.startDownload("saints");
    await vi.waitFor(() => expect(download).toHaveBeenCalledTimes(1));
    const second = manager.startDownload("saints");

    expect(download).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
  });

  it("cancelDownload дожидается остановки текущего запроса перед remove() и чистит progress + last_sync", async () => {
    let aborted = false;
    const remove = vi.fn(async () => {
      expect(aborted).toBe(true);
    });
    const download = vi.fn(
      (ctx) =>
        new Promise<void>((_resolve, reject) => {
          ctx.signal.addEventListener("abort", () => {
            aborted = true;
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    getModuleMock.mockReturnValue(mockModule({ download, remove }));
    await metadataStorage?.setLastSyncTime("download_saints");

    const pending = manager.startDownload("saints");
    await vi.waitFor(() => expect(download).toHaveBeenCalled());
    await manager.cancelDownload("saints");
    await pending;

    expect(remove).toHaveBeenCalledTimes(1);
    expect(await downloadProgressStorage?.getState("saints")).toBeUndefined();
    expect(await metadataStorage?.getLastSyncTime("download_saints")).toBeNull();
  });

  it("deleteDownload дожидается остановки и чистит progress + last_sync", async () => {
    let aborted = false;
    const remove = vi.fn(async () => {
      expect(aborted).toBe(true);
    });
    const download = vi.fn(
      (ctx) =>
        new Promise<void>((_resolve, reject) => {
          ctx.signal.addEventListener("abort", () => {
            aborted = true;
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    getModuleMock.mockReturnValue(mockModule({ download, remove }));

    const pending = manager.startDownload("calendar");
    await vi.waitFor(() => expect(download).toHaveBeenCalled());
    await manager.deleteDownload("calendar");
    await pending;

    expect(remove).toHaveBeenCalledTimes(1);
    expect(await downloadProgressStorage?.getState("calendar")).toBeUndefined();
  });

  it("ошибка (не abort) ставит статус error, заполняет state.error и реджектит промис", async () => {
    getModuleMock.mockReturnValue(mockModule({ download: vi.fn().mockRejectedValue(new Error("boom")) }));

    await expect(manager.startDownload("saints")).rejects.toThrow("boom");

    const state = await downloadProgressStorage?.getState("saints");
    expect(state?.status).toBe("error");
    expect(state?.error).toBe("boom");
  });

  it("checkForUpdate не стартует, если модуль ещё не скачан", async () => {
    const download = vi.fn().mockResolvedValue(undefined);
    getModuleMock.mockReturnValue(mockModule({ download }));

    await manager.checkForUpdate("saints");

    expect(download).not.toHaveBeenCalled();
  });

  it("checkForUpdate передаёт lastSync как since, если since не задан", async () => {
    const download = vi.fn().mockResolvedValue(undefined);
    getModuleMock.mockReturnValue(mockModule({ download, getSize: vi.fn().mockResolvedValue(2 * 1024) }));
    await metadataStorage?.setLastSyncTime("download_saints");
    const lastSync = await metadataStorage?.getLastSyncTime("download_saints");

    await manager.checkForUpdate("saints");

    expect(download.mock.calls[0][0].since).toEqual(lastSync);
  });

  it("checkForUpdate передаёт явный since в getSize и download", async () => {
    const since = new Date("2026-01-01T00:00:00.000Z");
    const download = vi.fn().mockResolvedValue(undefined);
    const getSize = vi.fn().mockResolvedValue(2 * 1024);
    getModuleMock.mockReturnValue(mockModule({ download, getSize }));
    await metadataStorage?.setLastSyncTime("download_saints");

    await manager.checkForUpdate("saints", undefined, since);

    expect(getSize).toHaveBeenCalledWith(since);
    expect(download.mock.calls[0][0].since).toBe(since);
  });

  it("успех вызывает metadataStorage.setLastSyncTime с ключом download_<moduleId>", async () => {
    const spy = vi.spyOn(metadataStorage!, "setLastSyncTime");

    await manager.startDownload("saints");

    expect(spy).toHaveBeenCalledWith("download_saints");
    expect(await metadataStorage?.getLastSyncTime("download_saints")).toBeInstanceOf(Date);
  });

  it("троттлит персистентность: серия быстрых onBytes не даёт N записей в setState", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const setStateSpy = vi.spyOn(downloadProgressStorage!, "setState");
    getModuleMock.mockReturnValue(
      mockModule({
        download: vi.fn(async (ctx) => {
          ctx.onBytes(1);
          ctx.onBytes(1);
          ctx.onBytes(1);
          await Promise.resolve();
        }),
      }),
    );

    await manager.startDownload("saints");

    // force-persist на старте + force-persist на успехе; быстрые onBytes отброшены троттлингом
    expect(setStateSpy.mock.calls.length).toBe(2);
  });

  it("resumeInterrupted перезапускает только модули со статусом downloading", async () => {
    const downloads: Partial<Record<DownloadModuleId, DownloadModule["download"]>> = {
      saints: vi.fn().mockResolvedValue(undefined),
      calendar: vi.fn().mockResolvedValue(undefined),
    };
    getModuleMock.mockImplementation((moduleId) =>
      mockModule({
        id: moduleId,
        download: downloads[moduleId] ?? vi.fn().mockResolvedValue(undefined),
      }),
    );

    await downloadProgressStorage?.setState({
      moduleId: "saints",
      status: "downloading",
      totalBytes: 10,
      downloadedBytes: 1,
      updatedAt: Date.now(),
    });
    await downloadProgressStorage?.setState({
      moduleId: "calendar",
      status: "completed",
      totalBytes: 10,
      downloadedBytes: 10,
      updatedAt: Date.now(),
    });

    await manager.resumeInterrupted();
    await vi.waitFor(() => expect(downloads.saints).toHaveBeenCalled());

    expect(downloads.calendar).not.toHaveBeenCalled();
  });

  describe("размер скачанного модуля", () => {
    it("полная загрузка сохраняет размер, getDownloadedSize его возвращает", async () => {
      getModuleMock.mockReturnValue(mockModule({ getSize: vi.fn().mockResolvedValue(100) }));
      expect(await manager.getDownloadedSize("saints")).toBeNull();

      await manager.startDownload("saints");

      expect(await manager.getDownloadedSize("saints")).toBe(100);
    });

    it("обновление пересчитывает размер по актуальному полному размеру, а не по дельте", async () => {
      let fullSize = 100;
      const getSize = vi.fn(async (since?: Date) => (since ? 5 * 1024 : fullSize));
      getModuleMock.mockReturnValue(mockModule({ getSize }));
      await manager.startDownload("saints");

      fullSize = 130;
      await manager.checkForUpdate("saints");

      expect(await manager.getDownloadedSize("saints")).toBe(130);
    });

    it("если актуальный размер после обновления не получен - остаётся прежний, обновление успешно", async () => {
      let failFullSize = false;
      const getSize = vi.fn(async (since?: Date) => {
        if (!since && failFullSize) throw new Error("offline");
        return since ? 5 * 1024 : 100;
      });
      getModuleMock.mockReturnValue(mockModule({ getSize }));
      await manager.startDownload("saints");

      failFullSize = true;
      await manager.checkForUpdate("saints");

      expect(await manager.getDownloadedSize("saints")).toBe(100);
      expect((await downloadProgressStorage?.getState("saints"))?.status).toBe("completed");
    });

    it("deleteDownload стирает сохранённый размер", async () => {
      await manager.startDownload("saints");
      expect(await manager.getDownloadedSize("saints")).toBe(100);

      await manager.deleteDownload("saints");

      expect(await manager.getDownloadedSize("saints")).toBeNull();
    });

    it("getUpdateSize: null для нескачанного модуля, иначе размер данных с lastSync", async () => {
      const getSize = vi.fn().mockResolvedValue(5 * 1024);
      getModuleMock.mockReturnValue(mockModule({ getSize }));

      expect(await manager.getUpdateSize("saints")).toBeNull();
      expect(getSize).not.toHaveBeenCalled();

      await metadataStorage?.setLastSyncTime("download_saints");
      const lastSync = await metadataStorage?.getLastSyncTime("download_saints");

      expect(await manager.getUpdateSize("saints")).toBe(5 * 1024);
      expect(getSize).toHaveBeenCalledWith(lastSync);
    });

    it("getUpdateSize: размер пустой выборки (2 байта от API) не считается обновлением", async () => {
      getModuleMock.mockReturnValue(mockModule({ getSize: vi.fn().mockResolvedValue(2) }));
      await metadataStorage?.setLastSyncTime("download_saints");

      expect(await manager.getUpdateSize("saints")).toBe(0);
    });

    it("пустое обновление не качается и не публикует прогресс", async () => {
      await manager.startDownload("saints");
      const download = vi.fn();
      getModuleMock.mockReturnValue(mockModule({ download, getSize: vi.fn().mockResolvedValue(2) }));
      const listener = vi.fn();
      manager.subscribe(listener);

      await manager.checkForUpdate("saints");

      expect(download).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
      expect(await manager.getDownloadedSize("saints")).toBe(100);
      expect((await downloadProgressStorage?.getState("saints"))?.status).toBe("completed");
    });

    it("к моменту статуса completed размер и lastSync уже сохранены", async () => {
      let snapshot: Promise<[number | null, boolean]> | undefined;
      manager.subscribe((progress) => {
        if (progress.status === "completed") {
          snapshot = Promise.all([manager.getDownloadedSize("saints"), manager.isDownloaded("saints")]);
        }
      });

      await manager.startDownload("saints");

      expect(await snapshot).toEqual([100, true]);
    });
  });

  describe("subscribe", () => {
    it("получает прогресс любого запуска и перестаёт после отписки", async () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      await manager.startDownload("saints");
      expect(listener.mock.calls.map(([progress]) => progress.status)).toEqual(["downloading", "completed"]);
      expect(listener.mock.calls[0][0].totalBytes).toBe(100);

      listener.mockClear();
      unsubscribe();
      await manager.startDownload("calendar");

      expect(listener).not.toHaveBeenCalled();
    });

    it("уведомляет и при докачке через resumeInterrupted (без колбэка onProgress)", async () => {
      await downloadProgressStorage?.setState({
        moduleId: "saints",
        status: "downloading",
        totalBytes: 100,
        downloadedBytes: 1,
        updatedAt: Date.now(),
      });
      const listener = vi.fn();
      manager.subscribe(listener);

      await manager.resumeInterrupted();
      await vi.waitFor(() =>
        expect(listener.mock.calls.some(([progress]) => progress.status === "completed")).toBe(true),
      );
    });
  });
});
