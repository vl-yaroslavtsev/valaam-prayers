import { ensureNativeBridge, hasNativeCapability, nativeCall } from "@/services/native/nativeRpc";
import type { RpcMethods } from "@/services/native/protocol";

/** События системного календаря (capability "calendar"). Вне приложения моста нет. */
export const nativeCalendar = {
  hasPermissions: () => nativeCall("calendar.hasPermissions"),
  requestPermissions: () => nativeCall("calendar.requestPermissions"),
  addEvents: (params: RpcMethods["calendar.addEvents"]["params"]) => nativeCall("calendar.addEvents", params),
  deleteEvents: (params: RpcMethods["calendar.deleteEvents"]["params"]) => nativeCall("calendar.deleteEvents", params),
};

/** Рукопожатие и проверка capability. Повторные вызовы не обращаются к нативке. */
export function ensureNativeCalendar(): Promise<boolean> {
  return ensureNativeBridge("calendar");
}

/** Синхронная проверка. До рукопожатия всегда false. */
export function isNativeCalendarAvailable(): boolean {
  return hasNativeCapability("calendar");
}
