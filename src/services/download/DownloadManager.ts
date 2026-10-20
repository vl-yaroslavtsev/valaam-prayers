import { downloadProgressStorage, metadataStorage } from "@/services/storage";
import { getModule } from "@/services/download/modules";
import { NativeDownloadManager } from "@/services/download/NativeDownloadManager";
import { isNativeBridgeAvailable } from "@/services/native/nativeRpc";
import {
  ALL_MODULE_IDS,
  downloadEstimateKey,
  downloadSizeKey,
  downloadSyncKey,
  type DownloadContext,
  type DownloadModuleId,
  type DownloadProgress,
  type IDownloadManager,
  type ModuleDownloadState,
} from "@/services/download/types";

const PERSIST_THROTTLE_MS = 100;
const PROGRESS_LOG_INTERVAL_MS = 1000;

/**
 * API отдаёт размер даже для пустой выборки (например, 2 байта на "[]"), поэтому
 * обновлением считаем только данные от этого порога.
 */
const MIN_UPDATE_BYTES = 1024;

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
export class DownloadManager implements IDownloadManager {
  private controllers = new Map<DownloadModuleId, AbortController>();
  private runningPromises = new Map<DownloadModuleId, Promise<void>>();
  private listeners = new Set<(progress: DownloadProgress) => void>();

  /**
   * Подписка на прогресс всех модулей: вручную запущенные скачивания, докачка
   * после перезапуска и автообновление. Возвращает функцию отписки.
   */
  subscribe(listener: (progress: DownloadProgress) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async getModuleSize(moduleId: DownloadModuleId, since?: Date): Promise<number> {
    return getModule(moduleId).getSize(since);
  }

  /**
   * Полный размер скачанного модуля, сохранённый при последней успешной загрузке/обновлении.
   * null - модуль не скачан или размер не сохранялся (скачан до появления этой возможности).
   */
  async getDownloadedSize(moduleId: DownloadModuleId): Promise<number | null> {
    const size = await metadataStorage?.getValue(downloadSizeKey(moduleId));
    return typeof size === "number" ? size : null;
  }

  /**
   * Размер к скачиванию, сохранённый после последнего успешного запроса.
   * null - ещё ни разу не получали.
   */
  async getEstimatedSize(moduleId: DownloadModuleId): Promise<number | null> {
    const size = await metadataStorage?.getValue(downloadEstimateKey(moduleId));
    return typeof size === "number" ? size : null;
  }

  async saveEstimatedSize(moduleId: DownloadModuleId, size: number): Promise<void> {
    await metadataStorage?.setValue(downloadEstimateKey(moduleId), size);
  }

  /**
   * Убирает ошибку загрузки, не стирая чекпоинт докачки.
   * Статус error не нужен для возобновления и не должен всплывать при следующем заходе.
   */
  async dismissError(moduleId: DownloadModuleId): Promise<void> {
    const state = await downloadProgressStorage?.getState(moduleId);
    if (state?.status !== "error") return;
    state.status = "idle";
    state.error = undefined;
    await downloadProgressStorage?.setState(state);
  }

  /**
   * Размер доступного обновления (данные, изменённые с момента последней синхронизации).
   * null - модуль ещё не скачан, 0 - обновлений нет.
   */
  async getUpdateSize(moduleId: DownloadModuleId): Promise<number | null> {
    const lastSync = await metadataStorage?.getLastSyncTime(downloadSyncKey(moduleId));
    if (!lastSync) return null;
    const size = await getModule(moduleId).getSize(lastSync);
    return size >= MIN_UPDATE_BYTES ? size : 0;
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
   * Инкрементальное обновление уже полностью скачанного модуля (modified_since).
   * Не мешает уже идущему вручную запущенному скачиванию того же модуля.
   * @param since если задан — используется вместо lastSync (например, начало текущего года)
   */
  async checkForUpdate(
    moduleId: DownloadModuleId,
    onProgress?: (progress: DownloadProgress) => void,
    since?: Date
  ): Promise<void> {
    if (this.runningPromises.has(moduleId)) return;

    const lastSync = await metadataStorage?.getLastSyncTime(downloadSyncKey(moduleId));
    if (!lastSync) return; // модуль ещё не скачан полностью - автообновление его не касается

    const state = createEmptyState(moduleId);
    const promise = this.executeDownload(moduleId, state, since ?? lastSync, onProgress);
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
    await metadataStorage?.delete(downloadSizeKey(moduleId));
  }

  /**
   * Сохраняет полный размер модуля. После полной загрузки это totalBytes, а при обновлении
   * totalBytes - размер только изменённых данных, поэтому запрашиваем актуальный полный размер.
   * Если запрос не удался - остаётся прежнее значение, обновление при этом не считается неуспешным.
   */
  private async saveDownloadedSize(
    moduleId: DownloadModuleId,
    isUpdate: boolean,
    totalBytes: number
  ): Promise<void> {
    let size = totalBytes;
    if (isUpdate) {
      try {
        size = await getModule(moduleId).getSize();
      } catch {
        return;
      }
    }
    await metadataStorage?.setValue(downloadSizeKey(moduleId), size);
  }

  private async executeDownload(
    moduleId: DownloadModuleId,
    state: ModuleDownloadState,
    since: Date | undefined,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    const controller = new AbortController();
    this.controllers.set(moduleId, controller);

    let onBytesCalls = 0;
    let uiUpdates = 0;
    let progressLogStartedAt = Date.now();
    const logProgressRate = (): void => {
      const elapsedMs = Date.now() - progressLogStartedAt;
      const bytesCalls = onBytesCalls;
      const updates = uiUpdates;
      onBytesCalls = 0;
      uiUpdates = 0;
      progressLogStartedAt = Date.now();
      if (bytesCalls === 0 || elapsedMs <= 0) return;
      const seconds = elapsedMs / 1000;
      console.log(
        `[download ${moduleId}] onBytes ${(bytesCalls / seconds).toFixed(1)}/с (${bytesCalls}), обновление UI ${(updates / seconds).toFixed(1)}/с (${updates})`
      );
    };
    const progressLogTimer = setInterval(logProgressRate, PROGRESS_LOG_INTERVAL_MS);

    let lastPersistedAt = 0;
    const persist = async (force = false): Promise<void> => {
      const now = Date.now();
      if (!force && now - lastPersistedAt < PERSIST_THROTTLE_MS) return;
      lastPersistedAt = now;
      state.updatedAt = now;
      await downloadProgressStorage?.setState({ ...state });
      // После отмены не уведомляем: иначе подписчики вернут в UI уже откатанный прогресс
      if (controller.signal.aborted) return;
      const progress = toProgress(state);
      onProgress?.(progress);
      this.listeners.forEach((listener) => listener(progress));
      uiUpdates += 1;
    };

    const ctx: DownloadContext = {
      signal: controller.signal,
      since,
      state,
      onBytes: (bytes) => {
        onBytesCalls += 1;
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
      // Размер узнаём до публикации статуса, иначе в списке мелькает «0 из 0 МБ»
      if (!state.totalBytes) {
        state.totalBytes = await module.getSize(since);
      }
      if (controller.signal.aborted) return;
      // Пустое обновление не качаем и не показываем: проверка размера остаётся незаметной
      if (since !== undefined && state.totalBytes < MIN_UPDATE_BYTES) return;

      state.status = "downloading";
      state.error = undefined;
      await persist(true);

      await module.download(ctx);

      // Размер и lastSync пишем до публикации статуса "completed", чтобы подписчик,
      // отреагировав на него, сразу увидел модуль скачанным и с актуальным размером
      await this.saveDownloadedSize(moduleId, since !== undefined, state.totalBytes);
      await metadataStorage?.setLastSyncTime(downloadSyncKey(moduleId));

      state.status = "completed";
      state.downloadedBytes = state.totalBytes;
      await persist(true);
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
      clearInterval(progressLogTimer);
      logProgressRate();
      this.controllers.delete(moduleId);
    }
  }
}

/** В Android/iOS качает нативка (в фоне), в браузере и PWA работает этот класс */
export const downloadManager: IDownloadManager = isNativeBridgeAvailable()
  ? new NativeDownloadManager()
  : new DownloadManager();
