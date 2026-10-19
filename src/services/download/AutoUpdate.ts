import { downloadManager } from "@/services/download/DownloadManager";
import { isOnline, onNetworkChange } from "@/services/download/network";
import { ALL_MODULE_IDS } from "@/services/download/types";
import { isNativeBridgeAvailable, nativeCall } from "@/services/native/nativeRpc";
import { metadataStorage } from "@/services/storage";

/** Периодичность проверки обновлений, пока приложение открыто */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 часов

/** Браузер: когда последний раз успешно проверили все модули (в нативке это autoUpdate.getState().lastCheckAt) */
const LAST_CHECK_KEY = "autoUpdate_lastCheckAt";

let timer: ReturnType<typeof setInterval> | null = null;
let unsubscribeNetwork: (() => void) | null = null;

async function checkAllModulesForUpdates(): Promise<void> {
  if (!isOnline()) return;

  const results = await Promise.allSettled(
    ALL_MODULE_IDS.map((moduleId) =>
      downloadManager.checkForUpdate(moduleId).catch((err) => {
        console.error(`Auto-update failed for ${moduleId}:`, err);
        throw err;
      })
    )
  );

  if (results.every((result) => result.status === "fulfilled")) {
    await metadataStorage?.setValue(LAST_CHECK_KEY, new Date().toISOString());
  }
}

function setNativeAutoUpdate(enabled: boolean): void {
  nativeCall("autoUpdate.set", { enabled }).catch((err) => {
    console.error("Failed to switch native auto-update:", err);
  });
}

/**
 * Запускает автообновление уже скачанных модулей (modified_since). Вызывается только
 * если включена настройка "Автообновление" (см. stores/settings.ts).
 * В Android/iOS расписание ведёт нативка (работает и при закрытом приложении).
 * В браузере: по таймеру, пока приложение открыто, и сразу при восстановлении сети.
 */
export function startAutoUpdate(): void {
  if (isNativeBridgeAvailable()) {
    setNativeAutoUpdate(true);
    return;
  }
  if (timer) return;

  void checkAllModulesForUpdates();
  timer = setInterval(() => void checkAllModulesForUpdates(), CHECK_INTERVAL_MS);
  unsubscribeNetwork = onNetworkChange((online) => {
    if (online) void checkAllModulesForUpdates();
  });
}

export function stopAutoUpdate(): void {
  if (isNativeBridgeAvailable()) {
    setNativeAutoUpdate(false);
    return;
  }

  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  unsubscribeNetwork?.();
  unsubscribeNetwork = null;
}

/** Время последней успешной проверки обновлений или null, если проверки ещё не было */
export async function getAutoUpdateLastCheck(): Promise<Date | null> {
  if (isNativeBridgeAvailable()) {
    const { lastCheckAt } = await nativeCall("autoUpdate.getState");
    return lastCheckAt ? new Date(lastCheckAt) : null;
  }

  const value = await metadataStorage?.getValue(LAST_CHECK_KEY);
  return value ? new Date(value) : null;
}
