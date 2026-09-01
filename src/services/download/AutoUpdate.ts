import { downloadManager } from "@/services/download/DownloadManager";
import { isOnline, onNetworkChange } from "@/services/download/network";
import { ALL_MODULE_IDS } from "@/services/download/types";

/** Периодичность проверки обновлений, пока приложение открыто */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 часов

let timer: ReturnType<typeof setInterval> | null = null;
let unsubscribeNetwork: (() => void) | null = null;

function checkAllModulesForUpdates(): void {
  if (!isOnline()) return;
  for (const moduleId of ALL_MODULE_IDS) {
    downloadManager.checkForUpdate(moduleId).catch((err) => {
      console.error(`Auto-update failed for ${moduleId}:`, err);
    });
  }
}

/**
 * Запускает автообновление уже скачанных модулей (modified_since): по таймеру,
 * пока приложение открыто, и сразу при восстановлении сети. Вызывается только
 * если включена настройка "Автообновление" (см. stores/settings.ts).
 */
export function startAutoUpdate(): void {
  if (timer) return;

  checkAllModulesForUpdates();
  timer = setInterval(checkAllModulesForUpdates, CHECK_INTERVAL_MS);
  unsubscribeNetwork = onNetworkChange((online) => {
    if (online) checkAllModulesForUpdates();
  });
}

export function stopAutoUpdate(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  unsubscribeNetwork?.();
  unsubscribeNetwork = null;
}
