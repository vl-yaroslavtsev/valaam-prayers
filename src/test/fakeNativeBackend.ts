import { resetNativeRpcForTests } from "@/services/native/nativeRpc";
import type { BridgeCapability, BridgeInfo, RpcMethod, RpcMethods } from "@/services/native/protocol";

/** Поле ключа каждой таблицы нативной БД (docs/native-bridge-protocol.md) */
const TABLE_KEYS: Record<string, string> = {
  "prayers-index": "id",
  "prayer-sections": "id",
  "saints-index": "id",
  "prayer-details": "id",
  "saint-details": "id",
  "calendar-days": "code",
  "calendar-markers": "id",
  favorites: "id",
  bookmarks: "id",
  "reading-history": "id",
  metadata: "key",
};

export class FakeNativeError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

type Handler = (params: any) => unknown | Promise<unknown>;
export type NativePlatform = "android" | "ios";

export interface FakeNativeOptions {
  platform?: NativePlatform;
  capabilities?: BridgeCapability[];
  protocolVersion?: number;
}

/**
 * Нативка в памяти: повторяет семантику протокола (порядок и null в getMany, UNKNOWN_TABLE,
 * JSON-копии значений как в настоящей БД). Методы download/autoUpdate/storage задаются тестами через on().
 */
export class FakeNativeBackend {
  readonly calls: { method: string; params: any }[] = [];
  private readonly tables = new Map<string, Map<string | number, string>>();
  private readonly handlers = new Map<string, Handler>();
  private platform: NativePlatform = "android";
  private capabilities: BridgeCapability[] = ["db", "download", "autoUpdate", "images"];
  private protocolVersion = 1;

  constructor() {
    this.register();
  }

  on<M extends RpcMethod>(method: M, handler: (params: RpcMethods[M]["params"]) => RpcMethods[M]["result"] | Promise<RpcMethods[M]["result"]>): this {
    this.handlers.set(method, handler);
    return this;
  }

  callsOf(method: string): any[] {
    return this.calls.filter((call) => call.method === method).map((call) => call.params);
  }

  /** Событие нативка -> JS */
  emit(event: string, data: unknown): void {
    window.__nativeRpc?.onMessage({ event, data });
  }

  dump(table: string): unknown[] {
    return [...(this.tables.get(table)?.values() ?? [])].map((json) => JSON.parse(json));
  }

  /** Подключает мост к window. Возвращает функцию, убирающую его. */
  install(options: FakeNativeOptions = {}): () => void {
    this.platform = options.platform ?? "android";
    this.capabilities = options.capabilities ?? this.capabilities;
    this.protocolVersion = options.protocolVersion ?? 1;
    resetNativeRpcForTests();

    const w = window as any;
    if (this.platform === "android") {
      w.androidJsHandler = {
        rpc: (requestJson: string) => {
          void this.process(requestJson).then((response) => {
            // Ответ нативки приходит объектом-литералом
            window.__nativeRpc?.onMessage(JSON.parse(response));
          });
        },
      };
    } else {
      w.webkit = {
        messageHandlers: {
          nativeRpc: { postMessage: (requestJson: string) => this.process(requestJson) },
        },
      };
    }

    return () => {
      delete w.androidJsHandler;
      delete w.webkit;
      resetNativeRpcForTests();
    };
  }

  private async process(requestJson: string): Promise<string> {
    const { id, method, params } = JSON.parse(requestJson);
    this.calls.push({ method, params });
    try {
      const handler = this.handlers.get(method);
      if (!handler) throw new FakeNativeError("NOT_SUPPORTED", `Метод ${method} не поддерживается`);
      const result = await handler(params);
      return JSON.stringify({ id, ok: true, result: result ?? null });
    } catch (err) {
      const error = err as FakeNativeError;
      return JSON.stringify({
        id,
        ok: false,
        error: { code: error.code ?? "INTERNAL", message: error.message },
      });
    }
  }

  private table(name: string): Map<string | number, string> {
    const keyField = TABLE_KEYS[name];
    if (!keyField) throw new FakeNativeError("UNKNOWN_TABLE", `Неизвестная таблица ${name}`);
    let rows = this.tables.get(name);
    if (!rows) {
      rows = new Map();
      this.tables.set(name, rows);
    }
    return rows;
  }

  private keyOf(table: string, item: Record<string, unknown>): string | number {
    const key = item[TABLE_KEYS[table]];
    if (typeof key !== "string" && typeof key !== "number") {
      throw new FakeNativeError("INVALID_PARAMS", `У элемента ${table} нет ключа`);
    }
    return key;
  }

  private register(): void {
    this.on("bridge.getInfo", (): BridgeInfo => ({
      protocolVersion: this.protocolVersion,
      platform: this.platform,
      appVersion: "test",
      capabilities: this.capabilities,
    }));
    this.on("db.get", ({ table, key }) => {
      const json = this.table(table).get(key);
      return json == null ? null : JSON.parse(json);
    });
    this.on("db.getMany", ({ table, keys }) => {
      const rows = this.table(table);
      return keys.map((key) => {
        const json = rows.get(key);
        return json == null ? null : JSON.parse(json);
      });
    });
    this.on("db.getAll", ({ table }) => [...this.table(table).values()].map((json) => JSON.parse(json)));
    this.on("db.put", ({ table, item }) => {
      this.table(table).set(this.keyOf(table, item as Record<string, unknown>), JSON.stringify(item));
      return null;
    });
    this.on("db.putAll", ({ table, items }) => {
      const rows = this.table(table);
      const entries = items.map((item) => [this.keyOf(table, item as Record<string, unknown>), JSON.stringify(item)] as const);
      entries.forEach(([key, json]) => rows.set(key, json));
      return null;
    });
    this.on("db.delete", ({ table, key }) => {
      this.table(table).delete(key);
      return null;
    });
    this.on("db.clear", ({ table }) => {
      this.table(table).clear();
      return null;
    });
    this.on("db.count", ({ table }) => this.table(table).size);
  }
}
