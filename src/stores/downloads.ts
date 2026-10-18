import { defineStore } from "pinia";
import { reactive } from "vue";
import { downloadManager } from "@/services/download/DownloadManager";
import { ALL_MODULE_IDS } from "@/services/download/types";
import type { DownloadModuleId, DownloadProgress } from "@/services/download/types";

/**
 * Тонкая реактивная обёртка над DownloadManager - без какой-либо вёрстки,
 * только состояние прогресса для будущего UI страницы "Материалы без интернета".
 */
export const useDownloadsStore = defineStore("downloads", () => {
  const progress = reactive<Partial<Record<DownloadModuleId, DownloadProgress>>>({});

  const refreshProgress = async (moduleId: DownloadModuleId): Promise<void> => {
    const state = await downloadManager.getProgress(moduleId);
    if (state) {
      progress[moduleId] = state;
    } else {
      delete progress[moduleId];
    }
  };

  const initStore = async (): Promise<void> => {
    // Прогресс докачки после перезапуска и автообновления идёт мимо колбэков стора -
    // подписываемся на менеджер, чтобы progress отражал любые скачивания
    downloadManager.subscribe((p) => {
      progress[p.moduleId] = p;
    });
    await Promise.all(ALL_MODULE_IDS.map(refreshProgress));
  };

  const getModuleSize = (moduleId: DownloadModuleId, since?: Date): Promise<number> =>
    downloadManager.getModuleSize(moduleId, since);

  const getDownloadedSize = (moduleId: DownloadModuleId): Promise<number | null> =>
    downloadManager.getDownloadedSize(moduleId);

  const getEstimatedSize = (moduleId: DownloadModuleId): Promise<number | null> =>
    downloadManager.getEstimatedSize(moduleId);

  const saveEstimatedSize = (moduleId: DownloadModuleId, size: number): Promise<void> =>
    downloadManager.saveEstimatedSize(moduleId, size);

  const dismissError = async (moduleId: DownloadModuleId): Promise<void> => {
    const current = progress[moduleId];
    if (current?.status === "error") {
      progress[moduleId] = { ...current, status: "idle", error: undefined };
    }
    await downloadManager.dismissError(moduleId);
  };

  const getUpdateSize = (moduleId: DownloadModuleId): Promise<number | null> =>
    downloadManager.getUpdateSize(moduleId);

  const isDownloaded = (moduleId: DownloadModuleId): Promise<boolean> => downloadManager.isDownloaded(moduleId);

  const startDownload = async (moduleId: DownloadModuleId): Promise<void> => {
    await downloadManager.startDownload(moduleId, (p) => {
      progress[moduleId] = p;
    });
  };

  const checkForUpdate = async (moduleId: DownloadModuleId, since?: Date): Promise<void> => {
    await downloadManager.checkForUpdate(
      moduleId,
      (p) => {
        progress[moduleId] = p;
      },
      since
    );
  };

  const cancelDownload = async (moduleId: DownloadModuleId): Promise<void> => {
    await downloadManager.cancelDownload(moduleId);
    delete progress[moduleId];
  };

  const deleteDownload = async (moduleId: DownloadModuleId): Promise<void> => {
    await downloadManager.deleteDownload(moduleId);
    delete progress[moduleId];
  };

  return {
    progress,
    initStore,
    getModuleSize,
    getDownloadedSize,
    getEstimatedSize,
    saveEstimatedSize,
    dismissError,
    getUpdateSize,
    isDownloaded,
    startDownload,
    checkForUpdate,
    cancelDownload,
    deleteDownload,
  };
});
