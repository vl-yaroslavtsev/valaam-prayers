import { downloadProgressStorage, metadataStorage } from "@/services/storage";
import { getModule } from "@/services/download/modules";
import {
  ALL_MODULE_IDS,
  downloadSyncKey,
  type DownloadContext,
  type DownloadModuleId,
  type DownloadProgress,
  type ModuleDownloadState,
} from "@/services/download/types";

const PERSIST_THROTTLE_MS = 1000;

function createEmptyState(moduleId: DownloadModuleId): ModuleDownloadState {
  return {
    moduleId,
    status: "idle",
    totalBytes: 0,
    downloadedBytes: 0,
    updatedAt: Date.now(),
  };
}

function toProgress(state: ModuleDownloadState): DownloadProgress {
  return {
    moduleId: state.moduleId,
    status: state.status,
    downloadedBytes: state.downloadedBytes,
    totalBytes: state.totalBytes,
    error: state.error,
    updatedAt: state.updatedAt,
  };
}

/**
 * Оркестратор офлайн-скачивания: старт/докачка, отмена, удаление, прогресс.
 * Персистентный прогресс хранится в download-progress (IndexedDB), поэтому
 * докачка переживает потерю сети и перезапуск приложения.
 */
export class DownloadManager {
  private controllers = new Map<DownloadModuleId, AbortController>();
  private runningPromises = new Map<DownloadModuleId, Promise<void>>();

  async getModuleSize(moduleId: DownloadModuleId, since?: Date): Promise<number> {
    return getModule(moduleId).getSize(since);
  }

  async getProgress(moduleId: DownloadModuleId): Promise<DownloadProgress | null> {
    const state = await downloadProgressStorage?.getState(moduleId);
    return state ? toProgress(state) : null;
  }

  async isDownloaded(moduleId: DownloadModuleId): Promise<boolean> {
    const lastSync = await metadataStorage?.getLastSyncTime(downloadSyncKey(moduleId));
    return !!lastSync;
  }

  /**
   * Запускает скачивание модуля с нуля или докачивает с сохранённого прогресса.
   */
  async startDownload(moduleId: DownloadModuleId, onProgress?: (progress: DownloadProgress) => void): Promise<void> {
    const existing = this.runningPromises.get(moduleId);
    if (existing) return existing;

    const savedState = await downloadProgressStorage?.getState(moduleId);
    const state = savedState ?? createEmptyState(moduleId);
    const promise = this.executeDownload(moduleId, state, undefined, onProgress);
    this.track(moduleId, promise);
    return promise;
  }

  /**
   * Инкрементальное автообновление уже полностью скачанного модуля (modified_since).
   * Не мешает уже идущему вручную запущенному скачиванию того же модуля.
   */
  async checkForUpdate(moduleId: DownloadModuleId, onProgress?: (progress: DownloadProgress) => void): Promise<void> {
    if (this.runningPromises.has(moduleId)) return;

    const lastSync = await metadataStorage?.getLastSyncTime(downloadSyncKey(moduleId));
    if (!lastSync) return; // модуль ещё не скачан полностью - автообновление его не касается

    const state = createEmptyState(moduleId);
    const promise = this.executeDownload(moduleId, state, lastSync, onProgress);
    this.track(moduleId, promise);
    return promise;
  }

  /**
   * Отмена активного скачивания = полный откат: стираем частично скачанное,
   * модуль возвращается в состояние "доступно для скачивания".
   */
  async cancelDownload(moduleId: DownloadModuleId): Promise<void> {
    await this.resetModule(moduleId);
  }

  /**
   * Удаляет уже скачанные данные модуля (например, по кнопке "корзина").
   */
  async deleteDownload(moduleId: DownloadModuleId): Promise<void> {
    await this.resetModule(moduleId);
  }

  /**
   * Докачивает модули, прерванные посреди скачивания (потеря сети, закрытие приложения).
   * Вызывается на старте приложения и при восстановлении сети.
   */
  async resumeInterrupted(): Promise<void> {
    for (const moduleId of ALL_MODULE_IDS) {
      const state = await downloadProgressStorage?.getState(moduleId);
      if (state?.status === "downloading" && !this.runningPromises.has(moduleId)) {
        this.startDownload(moduleId).catch((err) => {
          console.error(`Failed to resume download for ${moduleId}:`, err);
        });
      }
    }
  }

  private track(moduleId: DownloadModuleId, promise: Promise<void>): void {
    this.runningPromises.set(moduleId, promise);
    promise
      .catch(() => {})
      .finally(() => {
        this.runningPromises.delete(moduleId);
      });
  }

  private async resetModule(moduleId: DownloadModuleId): Promise<void> {
    const controller = this.controllers.get(moduleId);
    const running = this.runningPromises.get(moduleId);
    controller?.abort();
    if (running) {
      await running.catch(() => {});
    }

    await getModule(moduleId).remove();
    await downloadProgressStorage?.deleteState(moduleId);
    await metadataStorage?.delete(`last_sync_${downloadSyncKey(moduleId)}`);
  }

  private async executeDownload(
    moduleId: DownloadModuleId,
    state: ModuleDownloadState,
    since: Date | undefined,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    const controller = new AbortController();
    this.controllers.set(moduleId, controller);

    state.status = "downloading";
    state.error = undefined;

    let lastPersistedAt = 0;
    const persist = async (force = false): Promise<void> => {
      const now = Date.now();
      if (!force && now - lastPersistedAt < PERSIST_THROTTLE_MS) return;
      lastPersistedAt = now;
      state.updatedAt = now;
      await downloadProgressStorage?.setState({ ...state });
      onProgress?.(toProgress(state));
    };
    await persist(true);

    const ctx: DownloadContext = {
      signal: controller.signal,
      since,
      state,
      onBytes: (bytes) => {
        state.downloadedBytes += bytes;
        void persist(false);
      },
      checkpoint: async (patch) => {
        Object.assign(state, patch);
        await persist(false);
      },
    };

    try {
      const module = getModule(moduleId);
      if (!state.totalBytes) {
        state.totalBytes = await module.getSize(since);
      }

      await module.download(ctx);

      state.status = "completed";
      state.downloadedBytes = state.totalBytes;
      await persist(true);
      await metadataStorage?.setLastSyncTime(downloadSyncKey(moduleId));
    } catch (err) {
      if (controller.signal.aborted) {
        // Отмена уже обработана resetModule() - не перезаписываем состояние
        return;
      }
      state.status = "error";
      state.error = err instanceof Error ? err.message : String(err);
      await persist(true);
      throw err;
    } finally {
      this.controllers.delete(moduleId);
    }
  }
}

export const downloadManager = new DownloadManager();
