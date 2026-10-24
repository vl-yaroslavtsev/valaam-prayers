import {
  SUPPORTED_PROTOCOL_VERSION,
  type BridgeCapability,
  type BridgeInfo,
  type RpcEvent,
  type RpcEventMessage,
  type RpcEvents,
  type RpcMethod,
  type RpcMethods,
  type RpcResponse,
} from "@/services/native/protocol";

declare global {
  interface Window {
    /** Точка входа для ответов и событий нативки (docs/native-bridge-protocol.md) */
    __nativeRpc?: { onMessage(message: unknown): void };
    /** Android: порт WebMessageListener. Ответы нативки приходят событиями message этого же порта */
    valaamNativeRpcPort?: {
      postMessage(message: string): void;
      addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
    };
  }
}

export class NativeRpcError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "NativeRpcError";
    this.code = code;
  }
}

interface PendingCall {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

const pending = new Map<string, PendingCall>();
const eventHandlers = new Map<string, Set<(data: unknown) => void>>();

let nextId = 1;
let bridgeInfoPromise: Promise<BridgeInfo> | null = null;
let bridgeInfo: BridgeInfo | null = null;

/** Есть ли нативный мост: Android через valaamNativeRpcPort, iOS через messageHandlers.nativeRpc */
export function isNativeBridgeAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.valaamNativeRpcPort || !!window.webkit?.messageHandlers?.nativeRpc;
}

function parseMessage(raw: unknown): unknown {
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

function handleMessage(raw: unknown): void {
  let message: unknown;
  try {
    message = parseMessage(raw);
  } catch (err) {
    console.error("Native RPC: не удалось разобрать сообщение", err);
    return;
  }
  if (!message || typeof message !== "object") return;

  if ("event" in message) {
    const { event, data } = message as RpcEventMessage;
    eventHandlers.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`Native RPC: обработчик события ${event} упал`, err);
      }
    });
    return;
  }

  const response = message as RpcResponse;
  const call = pending.get(response.id);
  if (!call) return;
  pending.delete(response.id);

  if (response.ok) call.resolve(response.result);
  else call.reject(new NativeRpcError(response.error.code, response.error.message));
}

// Порты, на которые уже подписаны. Нативка ставит порт до выполнения скриптов страницы,
// повторная проверка в post() нужна только на случай, если порт появился позже.
const attachedPorts = new WeakSet<object>();

function attachPort(): void {
  const port = window.valaamNativeRpcPort;
  if (!port || attachedPorts.has(port)) return;
  attachedPorts.add(port);
  port.addEventListener("message", (event) => handleMessage(event.data));
}

if (typeof window !== "undefined") {
  window.__nativeRpc = { onMessage: handleMessage };
  attachPort();
}

function post(id: string, requestJson: string): void {
  attachPort();
  if (window.valaamNativeRpcPort) {
    // Ответ придёт событием message порта
    window.valaamNativeRpcPort.postMessage(requestJson);
    return;
  }

  const handler = window.webkit?.messageHandlers?.nativeRpc;
  if (!handler) throw new NativeRpcError("INTERNAL", "Нативный мост недоступен");
  // iOS отвечает на сам postMessage
  handler.postMessage(requestJson).then(handleMessage, (err: unknown) => {
    const call = pending.get(id);
    if (!call) return;
    pending.delete(id);
    call.reject(err instanceof Error ? err : new NativeRpcError("INTERNAL", String(err)));
  });
}

export function nativeCall<M extends RpcMethod>(
  method: M,
  params: RpcMethods[M]["params"] = {} as RpcMethods[M]["params"]
): Promise<RpcMethods[M]["result"]> {
  const id = String(nextId++);
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: resolve as (result: unknown) => void, reject });
    try {
      post(id, JSON.stringify({ id, method, params }));
    } catch (err) {
      pending.delete(id);
      reject(err instanceof Error ? err : new NativeRpcError("INTERNAL", String(err)));
    }
  });
}

/** Подписка на событие нативки. Возвращает функцию отписки. */
export function onNativeEvent<E extends RpcEvent>(event: E, handler: (data: RpcEvents[E]) => void): () => void {
  let handlers = eventHandlers.get(event);
  if (!handlers) {
    handlers = new Set();
    eventHandlers.set(event, handlers);
  }
  const wrapped = handler as (data: unknown) => void;
  handlers.add(wrapped);
  return () => {
    handlers.delete(wrapped);
  };
}

/** Рукопожатие. Результат запоминается, повторный вызов не обращается к нативке. */
export function getBridgeInfo(): Promise<BridgeInfo> {
  if (!bridgeInfoPromise) {
    bridgeInfoPromise = nativeCall("bridge.getInfo").then(
      (info) => {
        bridgeInfo = info;
        return info;
      },
      (err) => {
        bridgeInfoPromise = null;
        throw err;
      }
    );
  }
  return bridgeInfoPromise;
}

/**
 * Проверяет, что нативка говорит на нашей версии протокола и умеет нужное.
 * false, если моста нет или рукопожатие не удалось, тогда работаем как в браузере.
 */
export async function ensureNativeBridge(capability: BridgeCapability): Promise<boolean> {
  if (!isNativeBridgeAvailable()) return false;
  try {
    const info = await getBridgeInfo();
    return info.protocolVersion === SUPPORTED_PROTOCOL_VERSION && info.capabilities.includes(capability);
  } catch (err) {
    console.error("Native RPC: рукопожатие не удалось", err);
    return false;
  }
}

/** Синхронная проверка возможности. До рукопожатия всегда false. */
export function hasNativeCapability(capability: BridgeCapability): boolean {
  return bridgeInfo?.protocolVersion === SUPPORTED_PROTOCOL_VERSION && bridgeInfo.capabilities.includes(capability);
}

export function getNativePlatform(): BridgeInfo["platform"] | null {
  return bridgeInfo?.platform ?? null;
}

/** Только для тестов: сбрасывает состояние модуля */
export function resetNativeRpcForTests(): void {
  pending.clear();
  eventHandlers.clear();
  bridgeInfoPromise = null;
  bridgeInfo = null;
  nextId = 1;
  if (typeof window !== "undefined") window.__nativeRpc = { onMessage: handleMessage };
}
