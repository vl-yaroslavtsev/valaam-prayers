import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NativeDownloadManager } from "@/services/download/NativeDownloadManager";
import { FakeNativeBackend } from "@/test/fakeNativeBackend";
import type { DownloadModuleId, DownloadProgress } from "@/services/download/types";

function progress(moduleId: DownloadModuleId, patch: Partial<DownloadProgress> = {}): DownloadProgress {
  return { moduleId, status: "downloading", downloadedBytes: 0, totalBytes: 100, updatedAt: 1, ...patch };
}

describe("NativeDownloadManager", () => {
  let backend: FakeNativeBackend;
  let uninstall: () => void;
  let manager: NativeDownloadManager;

  beforeEach(() => {
    backend = new FakeNativeBackend();
    uninstall = backend.install();
    manager = new NativeDownloadManager();
  });

  afterEach(() => uninstall());

  describe("startDownload", () => {
    it("резолвится на completed и отдаёт прогресс в колбэк и подписчикам", async () => {
      backend.on("download.start", () => ({ accepted: true }));
      const onProgress = vi.fn();
      const listener = vi.fn();
      manager.subscribe(listener);

      const promise = manager.startDownload("saints", onProgress);
      await vi.waitFor(() => expect(backend.callsOf("download.start")).toHaveLength(1));
      backend.emit("download.progress", progress("saints", { downloadedBytes: 50 }));
      backend.emit("download.progress", progress("saints", { status: "completed", downloadedBytes: 100 }));
      await promise;

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener.mock.calls[1][0].status).toBe("completed");
    });

    it("реджектится на error с текстом нативки", async () => {
      backend.on("download.start", () => ({ accepted: true }));

      const promise = manager.startDownload("saints");
      await vi.waitFor(() => expect(backend.callsOf("download.start")).toHaveLength(1));
      backend.emit("download.progress", progress("saints", { status: "error", error: "HTTP 500" }));

      await expect(promise).rejects.toThrow("HTTP 500");
    });

    it("событие, пришедшее раньше ответа на start, не теряется", async () => {
      backend.on("download.start", () => {
        backend.emit("download.progress", progress("saints", { status: "completed" }));
        return { accepted: true };
      });

      await expect(manager.startDownload("saints")).resolves.toBeUndefined();
    });

    it("повторный запуск делит одно ожидание и не зовёт нативку второй раз", async () => {
      backend.on("download.start", () => ({ accepted: true }));
      const second = vi.fn();

      const first = manager.startDownload("saints");
      await vi.waitFor(() => expect(backend.callsOf("download.start")).toHaveLength(1));
      const repeated = manager.startDownload("saints", second);
      backend.emit("download.progress", progress("saints"));
      backend.emit("download.progress", progress("saints", { status: "completed" }));
      await Promise.all([first, repeated]);

      expect(backend.callsOf("download.start")).toHaveLength(1);
      expect(second).toHaveBeenCalledTimes(2);
    });

    it("ошибка вызова нативки реджектит промис и освобождает модуль", async () => {
      await expect(manager.startDownload("saints")).rejects.toMatchObject({ message: expect.stringContaining("download.start") });

      backend.on("download.start", () => ({ accepted: true }));
      const retry = manager.startDownload("saints");
      backend.emit("download.progress", progress("saints", { status: "completed" }));
      await expect(retry).resolves.toBeUndefined();
    });

    it("размер иконок передаётся только иконочным модулям", async () => {
      backend.on("download.start", () => ({ accepted: true }));
      const calendar = manager.startDownload("calendarIcons");
      const saints = manager.startDownload("saints");
      const saintIcons = manager.startDownload("saintIcons");
      await vi.waitFor(() => expect(backend.callsOf("download.start")).toHaveLength(3));
      for (const moduleId of ["calendarIcons", "saints", "saintIcons"] as const) {
        backend.emit("download.progress", progress(moduleId, { status: "completed" }));
      }
      await Promise.all([calendar, saints, saintIcons]);

      const byModule = Object.fromEntries(backend.callsOf("download.start").map((call) => [call.moduleId, call.options]));
      expect(byModule.calendarIcons).toEqual({ imageSize: "s" });
      expect(byModule.saints).toBeUndefined();
      expect(["m", "l"]).toContain(byModule.saintIcons.imageSize);
    });
  });

  describe("checkForUpdate", () => {
    it("started: false (обновления нет) резолвится сразу, без событий", async () => {
      backend.on("download.checkForUpdate", () => ({ accepted: true, started: false }));

      await expect(manager.checkForUpdate("saints")).resolves.toBeUndefined();
    });

    it("started: true ждёт completed", async () => {
      backend.on("download.checkForUpdate", () => ({ accepted: true, started: true }));
      let done = false;

      const promise = manager.checkForUpdate("saints").then(() => {
        done = true;
      });
      await vi.waitFor(() => expect(backend.callsOf("download.checkForUpdate")).toHaveLength(1));
      await Promise.resolve();
      expect(done).toBe(false);

      backend.emit("download.progress", progress("saints", { isUpdate: true, status: "completed" }));
      await promise;

      expect(done).toBe(true);
    });

    it("передаёт since в ISO", async () => {
      backend.on("download.checkForUpdate", () => ({ accepted: true, started: false }));
      const since = new Date("2026-01-01T00:00:00.000Z");

      await manager.checkForUpdate("calendar", undefined, since);

      expect(backend.callsOf("download.checkForUpdate")[0]).toEqual({
        moduleId: "calendar",
        since: "2026-01-01T00:00:00.000Z",
      });
    });

    it("не зовёт нативку, пока модуль уже ожидается", async () => {
      backend.on("download.start", () => ({ accepted: true }));
      backend.on("download.checkForUpdate", () => ({ accepted: true, started: true }));

      const download = manager.startDownload("saints");
      await vi.waitFor(() => expect(backend.callsOf("download.start")).toHaveLength(1));
      await manager.checkForUpdate("saints");
      backend.emit("download.progress", progress("saints", { status: "completed" }));
      await download;

      expect(backend.callsOf("download.checkForUpdate")).toEqual([]);
    });

    it("ошибка обновления реджектится", async () => {
      backend.on("download.checkForUpdate", () => ({ accepted: true, started: true }));

      const promise = manager.checkForUpdate("saints");
      await vi.waitFor(() => expect(backend.callsOf("download.checkForUpdate")).toHaveLength(1));
      backend.emit("download.progress", progress("saints", { isUpdate: true, status: "error", error: "нет сети" }));

      await expect(promise).rejects.toThrow("нет сети");
    });
  });

  describe("отмена и удаление", () => {
    it("cancelDownload закрывает ожидание без ошибки (событий после отмены нет)", async () => {
      backend.on("download.start", () => ({ accepted: true }));
      backend.on("download.cancel", () => null);

      const download = manager.startDownload("saints");
      await vi.waitFor(() => expect(backend.callsOf("download.start")).toHaveLength(1));
      await manager.cancelDownload("saints");

      await expect(download).resolves.toBeUndefined();
    });

    it("deleteDownload зовёт download.delete", async () => {
      backend.on("download.delete", () => null);

      await manager.deleteDownload("saints");

      expect(backend.callsOf("download.delete")).toEqual([{ moduleId: "saints" }]);
    });
  });

  describe("чтение состояния", () => {
    it("размеры и признак скачанного берутся из getModuleInfo", async () => {
      backend.on("download.getModuleInfo", () => ({
        downloaded: true,
        downloadedBytes: 1234,
        estimatedBytes: 999,
        lastSyncAt: "2026-01-01T00:00:00.000Z",
      }));

      expect(await manager.isDownloaded("saints")).toBe(true);
      expect(await manager.getDownloadedSize("saints")).toBe(1234);
      expect(await manager.getEstimatedSize("saints")).toBe(999);
    });

    it("getProgress отдаёт null, если нативка ничего не знает о модуле", async () => {
      backend.on("download.getProgress", () => null);

      expect(await manager.getProgress("saints")).toBeNull();
    });

    it("getUpdateSize: null, 0 и размер как есть", async () => {
      const values = [null, 0, 4096];
      backend.on("download.getUpdateSize", () => values.shift() ?? null);

      expect(await manager.getUpdateSize("saints")).toBeNull();
      expect(await manager.getUpdateSize("saints")).toBe(0);
      expect(await manager.getUpdateSize("saints")).toBe(4096);
    });

    it("getModuleSize передаёт since и размер иконок", async () => {
      backend.on("download.getSize", () => 777);

      expect(await manager.getModuleSize("calendarIcons", new Date("2026-02-03T00:00:00.000Z"))).toBe(777);

      expect(backend.callsOf("download.getSize")[0]).toEqual({
        moduleId: "calendarIcons",
        since: "2026-02-03T00:00:00.000Z",
        options: { imageSize: "s" },
      });
    });

    it("saveEstimatedSize и dismissError проксируются", async () => {
      backend.on("download.saveEstimate", () => null);
      backend.on("download.dismissError", () => null);

      await manager.saveEstimatedSize("saints", 55);
      await manager.dismissError("saints");

      expect(backend.callsOf("download.saveEstimate")).toEqual([{ moduleId: "saints", bytes: 55 }]);
      expect(backend.callsOf("download.dismissError")).toEqual([{ moduleId: "saints" }]);
    });
  });

  describe("resumeInterrupted", () => {
    it("зовёт нативку", async () => {
      backend.on("download.resumeInterrupted", () => null);

      await manager.resumeInterrupted();

      expect(backend.callsOf("download.resumeInterrupted")).toHaveLength(1);
    });

    it("не бросает ошибку наружу", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(manager.resumeInterrupted()).resolves.toBeUndefined();
    });
  });
});
