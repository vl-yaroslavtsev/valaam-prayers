import { ensureNativeBridge, hasNativeCapability, nativeCall } from "@/services/native/nativeRpc";
import type { RpcMethods } from "@/services/native/protocol";

/** Нативная оплата ЮKassa SDK (capability "pay"). Вне приложения моста нет, там остаётся виджет. */
export const nativePay = {
  tokenize: (params: RpcMethods["pay.tokenize"]["params"]) => nativeCall("pay.tokenize", params),
  confirm: (params: RpcMethods["pay.confirm"]["params"]) => nativeCall("pay.confirm", params),
  close: () => nativeCall("pay.close"),
};

/** Рукопожатие и проверка capability. Повторные вызовы не обращаются к нативке. */
export function ensureNativePay(): Promise<boolean> {
  return ensureNativeBridge("pay");
}

/** Синхронная проверка. До рукопожатия всегда false. */
export function isNativePayAvailable(): boolean {
  return hasNativeCapability("pay");
}
