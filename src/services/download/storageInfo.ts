import { getQuota } from "@/js/device/browser-test";
import { isNativeBridgeAvailable, nativeCall } from "@/services/native/nativeRpc";

export interface OfflineQuota {
  usage: number;
  free: number;
  quota: number;
}

/**
 * Место под офлайн-данные. В Android/iOS: занято офлайн-данными + свободно на устройстве,
 * в браузере: оценка хранилища origin (navigator.storage.estimate).
 */
export async function getOfflineQuota(): Promise<OfflineQuota> {
  if (isNativeBridgeAvailable()) {
    const { offlineUsedBytes, freeBytes } = await nativeCall("storage.getInfo");
    return { usage: offlineUsedBytes, free: freeBytes, quota: offlineUsedBytes + freeBytes };
  }
  return getQuota();
}
