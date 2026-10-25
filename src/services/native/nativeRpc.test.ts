import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureNativeBridge,
  getBridgeInfo,
  hasNativeCapability,
  isNativeBridgeAvailable,
  nativeCall,
  NativeRpcError,
  onNativeEvent,
} from "@/services/native/nativeRpc";
import { FakeNativeBackend, FakeNativeError, type NativePlatform } from "@/test/fakeNativeBackend";

describe("nativeRpc без моста", () => {
  it("в браузере моста нет", async () => {
    expect(isNativeBridgeAvailable()).toBe(false);
    expect(await ensureNativeBridge("db")).toBe(false);
    expect(hasNativeCapability("db")).toBe(false);
  });

  it("вызов без моста отклоняется", async () => {
    await expect(nativeCall("db.count", { table: "favorites" })).rejects.toBeInstanceOf(NativeRpcError);
  });
});

describe.each<NativePlatform>(["android", "ios"])("nativeRpc (%s)", (platform) => {
  let backend: FakeNativeBackend;
  let uninstall: () => void;

  beforeEach(() => {
    backend = new FakeNativeBackend();
    uninstall = backend.install({ platform });
  });

  afterEach(() => uninstall());

  it("мост обнаруживается", () => {
    expect(isNativeBridgeAvailable()).toBe(true);
  });

  it("возвращает результат и передаёт параметры", async () => {
    await nativeCall("db.put", { table: "favorites", item: { id: 1, type: "prayers", sort: 0 } });

    expect(backend.callsOf("db.put")).toEqual([{ table: "favorites", item: { id: 1, type: "prayers", sort: 0 } }]);
    await expect(nativeCall("db.get", { table: "favorites", key: 1 })).resolves.toEqual({
      id: 1,
      type: "prayers",
      sort: 0,
    });
  });

  it("ошибка нативки превращается в NativeRpcError с кодом", async () => {
    const error = await nativeCall("db.get", { table: "nope", key: 1 }).catch((err) => err);

    expect(error).toBeInstanceOf(NativeRpcError);
    expect(error.code).toBe("UNKNOWN_TABLE");
  });

  it("параллельные вызовы не путаются", async () => {
    backend.on("db.count", async ({ table }) => {
      if (table === "favorites") await new Promise((resolve) => setTimeout(resolve, 20));
      return table === "favorites" ? 1 : 2;
    });

    const [first, second] = await Promise.all([
      nativeCall("db.count", { table: "favorites" }),
      nativeCall("db.count", { table: "bookmarks" }),
    ]);

    expect([first, second]).toEqual([1, 2]);
  });

  it("события доходят до подписчиков и отписка работает", () => {
    const handler = vi.fn();
    const off = onNativeEvent("download.progress", handler);
    const progress = { moduleId: "saints", status: "downloading", downloadedBytes: 1, totalBytes: 2, updatedAt: 1 };

    backend.emit("download.progress", progress);
    off();
    backend.emit("download.progress", progress);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(progress);
  });

  it("упавший обработчик события не мешает остальным", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const second = vi.fn();
    onNativeEvent("download.progress", () => {
      throw new Error("boom");
    });
    onNativeEvent("download.progress", second);

    backend.emit("download.progress", { moduleId: "saints" });

    expect(second).toHaveBeenCalled();
  });

  it("ответ с неизвестным id игнорируется", () => {
    expect(() => window.__nativeRpc?.onMessage(JSON.stringify({ id: "999", ok: true, result: 1 }))).not.toThrow();
  });

  it("рукопожатие кэшируется и открывает capabilities", async () => {
    await expect(ensureNativeBridge("db")).resolves.toBe(true);
    await getBridgeInfo();

    expect(backend.callsOf("bridge.getInfo")).toHaveLength(1);
    expect(hasNativeCapability("images")).toBe(true);
  });
});

describe("android rpc для WebView без порта", () => {
  let uninstall: () => void;

  afterEach(() => uninstall?.());

  it("вызов идёт через androidJsHandler.rpc, ответ приходит в onMessage", async () => {
    const backend = new FakeNativeBackend();
    uninstall = backend.install({ platform: "android", legacyAndroidRpc: true });

    expect(isNativeBridgeAvailable()).toBe(true);
    expect(window.valaamNativeRpcPort).toBeUndefined();
    await expect(nativeCall("db.count", { table: "favorites" })).resolves.toBe(0);
    expect(backend.callsOf("db.count")).toEqual([{ table: "favorites" }]);
  });

  it("при наличии порта androidJsHandler.rpc не вызывается", async () => {
    const backend = new FakeNativeBackend();
    uninstall = backend.install({ platform: "android" });
    window.androidJsHandler = { rpc: () => { throw new Error("старый путь"); } } as unknown as Window["androidJsHandler"];

    await expect(nativeCall("db.count", { table: "favorites" })).resolves.toBe(0);
  });
});

describe("рукопожатие", () => {
  let uninstall: () => void;

  afterEach(() => uninstall?.());

  it("чужая версия протокола не принимается", async () => {
    uninstall = new FakeNativeBackend().install({ protocolVersion: 2 });

    expect(await ensureNativeBridge("db")).toBe(false);
  });

  it("нет нужной capability", async () => {
    uninstall = new FakeNativeBackend().install({ capabilities: ["download"] });

    expect(await ensureNativeBridge("db")).toBe(false);
    expect(await ensureNativeBridge("download")).toBe(true);
  });

  it("ошибка рукопожатия переводит в режим без моста", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const backend = new FakeNativeBackend();
    backend.on("bridge.getInfo", () => {
      throw new FakeNativeError("INTERNAL", "нет");
    });
    uninstall = backend.install();

    expect(await ensureNativeBridge("db")).toBe(false);
  });
});
