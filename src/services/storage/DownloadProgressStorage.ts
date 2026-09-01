import { BaseStorage } from "./BaseStorage";
import type { DownloadModuleId, ModuleDownloadState } from "@/services/download/types";

/**
 * Персистентное состояние прогресса офлайн-загрузок (по одной записи на модуль),
 * позволяет докачивать данные после потери сети / перезапуска приложения.
 */
export class DownloadProgressStorage extends BaseStorage<"download-progress"> {
  constructor() {
    super("download-progress");
  }

  async getState(moduleId: DownloadModuleId): Promise<ModuleDownloadState | undefined> {
    return this.get(moduleId);
  }

  async setState(state: ModuleDownloadState): Promise<void> {
    await this.put(state);
  }

  async deleteState(moduleId: DownloadModuleId): Promise<void> {
    await this.delete(moduleId);
  }
}
