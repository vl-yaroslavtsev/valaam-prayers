import { nativeCall, onNativeEvent } from "@/services/native/nativeRpc";
import { getCalendarIconSize, getSaintIconSize } from "@/services/download/device";
import type { ImageSize } from "@/services/api/DaysApi";
import type { DownloadModuleId, DownloadProgress, IDownloadManager } from "@/services/download/types";

type ProgressCallback = (progress: DownloadProgress) => void;

const PROGRESS_LOG_INTERVAL_MS = 1000;

interface Waiter {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
  callbacks: Set<ProgressCallback>;
}

interface ProgressLog {
  events: number;
  uiUpdates: number;
  startedAt: number;
  timer: ReturnType<typeof setInterval>;
}

/** Размер иконок выбирает фронт (по ширине устройства), нативка запоминает его для автообновления */
function imageOptions(moduleId: DownloadModuleId): { imageSize: ImageSize } | undefined {
  if (moduleId === "calendarIcons") return { imageSize: getCalendarIconSize() };
  if (moduleId === "saintIcons") return { imageSize: getSaintIconSize() };
  return undefined;
}

/**
 * Менеджер офлайн-загрузок для Android/iOS: всё качает нативка в фоне,
 * здесь только вызовы и события (docs/native-bridge-protocol.md).
 * Поведение промисов такое же, как у DownloadManager: startDownload и checkForUpdate
 * резолвятся на completed и реджектятся на error.
 */
export class NativeDownloadManager implements IDownloadManager {
  private listeners = new Set<ProgressCallback>();
  private waiters = new Map<DownloadModuleId, Waiter>();
  private progressLogs = new Map<DownloadModuleId, ProgressLog>();

  constructor() {
    onNativeEvent("download.progress", (progress) => this.handleProgress(progress));
  }

  subscribe(listener: ProgressCallback): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async getModuleSize(moduleId: DownloadModuleId, since?: Date): Promise<number> {
    return nativeCall("download.getSize", {
      moduleId,
      since: since?.toISOString(),
      options: imageOptions(moduleId),
    });
  }

  async getDownloadedSize(moduleId: DownloadModuleId): Promise<number | null> {
    return (await nativeCall("download.getModuleInfo", { moduleId })).downloadedBytes;
  }

  async getEstimatedSize(moduleId: DownloadModuleId): Promise<number | null> {
    return (await nativeCall("download.getModuleInfo", { moduleId })).estimatedBytes;
  }

  async saveEstimatedSize(moduleId: DownloadModuleId, size: number): Promise<void> {
    await nativeCall("download.saveEstimate", { moduleId, bytes: size });
  }

  async dismissError(moduleId: DownloadModuleId): Promise<void> {
    await nativeCall("download.dismissError", { moduleId });
  }

  async getUpdateSize(moduleId: DownloadModuleId): Promise<number | null> {
    return nativeCall("download.getUpdateSize", { moduleId });
  }

  async getProgress(moduleId: DownloadModuleId): Promise<DownloadProgress | null> {
    return nativeCall("download.getProgress", { moduleId });
  }

  async isDownloaded(moduleId: DownloadModuleId): Promise<boolean> {
    return (await nativeCall("download.getModuleInfo", { moduleId })).downloaded;
  }

  async startDownload(moduleId: DownloadModuleId, onProgress?: ProgressCallback): Promise<void> {
    const existing = this.waiters.get(moduleId);
    if (existing) {
      if (onProgress) existing.callbacks.add(onProgress);
      return existing.promise;
    }

    // Ожидание заводим до вызова: событие может прийти раньше ответа на download.start
    const waiter = this.createWaiter(moduleId, onProgress);
    try {
      await nativeCall("download.start", { moduleId, options: imageOptions(moduleId) });
    } catch (err) {
      this.settle(moduleId, err instanceof Error ? err : new Error(String(err)));
    }
    return waiter.promise;
  }

  async checkForUpdate(moduleId: DownloadModuleId, onProgress?: ProgressCallback, since?: Date): Promise<void> {
    if (this.waiters.has(moduleId)) return;

    const waiter = this.createWaiter(moduleId, onProgress);
    try {
      const { started } = await nativeCall("download.checkForUpdate", {
        moduleId,
        since: since?.toISOString(),
      });
      // Нет обновления (меньше порога), модуль не скачан или уже качается: событий не будет
      if (!started) this.settle(moduleId);
    } catch (err) {
      this.settle(moduleId, err instanceof Error ? err : new Error(String(err)));
    }
    return waiter.promise;
  }

  async cancelDownload(moduleId: DownloadModuleId): Promise<void> {
    await nativeCall("download.cancel", { moduleId });
    // После отмены нативка событий не шлёт, поэтому ожидание закрываем сами (как abort в DownloadManager)
    this.settle(moduleId);
    this.stopProgressLog(moduleId);
  }

  async deleteDownload(moduleId: DownloadModuleId): Promise<void> {
    await nativeCall("download.delete", { moduleId });
    this.settle(moduleId);
    this.stopProgressLog(moduleId);
  }

  async resumeInterrupted(): Promise<void> {
    try {
      await nativeCall("download.resumeInterrupted");
    } catch (err) {
      console.error("Failed to resume interrupted downloads:", err);
    }
  }

  private createWaiter(moduleId: DownloadModuleId, onProgress?: ProgressCallback): Waiter {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const waiter: Waiter = { promise, resolve, reject, callbacks: new Set(onProgress ? [onProgress] : []) };
    this.waiters.set(moduleId, waiter);
    return waiter;
  }

  /** Закрывает ожидание модуля: успехом или, если передана ошибка, отказом */
  private settle(moduleId: DownloadModuleId, error?: Error): void {
    const waiter = this.waiters.get(moduleId);
    if (!waiter) return;
    this.waiters.delete(moduleId);
    if (error) waiter.reject(error);
    else waiter.resolve();
  }

  private ensureProgressLog(moduleId: DownloadModuleId): ProgressLog {
    const existing = this.progressLogs.get(moduleId);
    if (existing) return existing;
    const log: ProgressLog = {
      events: 0,
      uiUpdates: 0,
      startedAt: Date.now(),
      timer: setInterval(() => this.logProgressRate(moduleId), PROGRESS_LOG_INTERVAL_MS),
    };
    this.progressLogs.set(moduleId, log);
    return log;
  }

  private logProgressRate(moduleId: DownloadModuleId): void {
    const log = this.progressLogs.get(moduleId);
    if (!log) return;
    const elapsedMs = Date.now() - log.startedAt;
    const events = log.events;
    const updates = log.uiUpdates;
    log.events = 0;
    log.uiUpdates = 0;
    log.startedAt = Date.now();
    // Короче секунды не печатаем: иначе хвост загрузки и юнит-тесты дают бессмысленную частоту
    if (events === 0 || elapsedMs < PROGRESS_LOG_INTERVAL_MS) return;
    const seconds = elapsedMs / 1000;
    console.log(
      `[download ${moduleId}] progress ${(events / seconds).toFixed(1)}/с (${events}), обновление UI ${(updates / seconds).toFixed(1)}/с (${updates})`
    );
  }

  private stopProgressLog(moduleId: DownloadModuleId): void {
    const log = this.progressLogs.get(moduleId);
    if (!log) return;
    clearInterval(log.timer);
    this.logProgressRate(moduleId);
    this.progressLogs.delete(moduleId);
  }

  private handleProgress(progress: DownloadProgress): void {
    const log = this.ensureProgressLog(progress.moduleId);
    log.events += 1;
    this.waiters.get(progress.moduleId)?.callbacks.forEach((callback) => callback(progress));
    this.listeners.forEach((listener) => listener(progress));
    log.uiUpdates += 1;

    if (progress.status === "completed") {
      this.settle(progress.moduleId);
      this.stopProgressLog(progress.moduleId);
    } else if (progress.status === "error") {
      this.settle(progress.moduleId, new Error(progress.error ?? "Не удалось скачать"));
      this.stopProgressLog(progress.moduleId);
    }
  }
}
