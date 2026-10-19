import { isNativeBridgeAvailable } from "@/services/native/nativeRpc";

/**
 * В нативке статика лежит в приложении, Service Worker не нужен.
 * На Android origin остался прежним (app.valaam.ru), поэтому регистрации и кэши старых версий
 * могут уцелеть: убираем их, чтобы они не занимали место.
 * В браузере ничего не делает.
 */
export async function disableServiceWorkerInNative(): Promise<void> {
  if (!isNativeBridgeAvailable()) return;

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if (typeof caches !== "undefined") {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
  } catch (err) {
    console.warn("Не удалось отключить Service Worker:", err);
  }
}
