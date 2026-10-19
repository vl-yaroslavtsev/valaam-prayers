import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureNativeBridge } from "@/services/native/nativeRpc";
import { waitForSeedIndexes } from "@/services/native/seed";
import type { SeedState } from "@/services/native/protocol";
import { FakeNativeBackend } from "@/test/fakeNativeBackend";

const state = (status: SeedState["status"]): SeedState => ({
  status,
  seedVersion: 1,
  createdAt: "2026-10-19T19:00:00.000Z",
});

describe("waitForSeedIndexes", () => {
  let backend: FakeNativeBackend;
  let uninstall: () => void;

  beforeEach(() => {
    backend = new FakeNativeBackend();
  });

  afterEach(() => uninstall?.());

  async function install(capabilities: Parameters<FakeNativeBackend["install"]>[0] = {}) {
    uninstall = backend.install(capabilities);
    await ensureNativeBridge("db");
  }

  it("без моста и без capability seed ничего не ждёт", async () => {
    uninstall = () => {};
    expect(await waitForSeedIndexes()).toBeNull();

    await install({ capabilities: ["db", "download"] });
    expect(await waitForSeedIndexes()).toBeNull();
    expect(backend.callsOf("seed.getState")).toHaveLength(0);
  });

  it.each(["importing", "completed", "skipped", "error"] as const)("статус %s возвращается сразу", async (status) => {
    await install({ capabilities: ["db", "seed"] });
    backend.on("seed.getState", () => state(status));

    expect(await waitForSeedIndexes()).toEqual(state(status));
  });

  it("applying: ждёт событие seed.state", async () => {
    await install({ capabilities: ["db", "seed"] });
    backend.on("seed.getState", () => state("applying"));

    const result = waitForSeedIndexes();
    await new Promise((resolve) => setTimeout(resolve, 10));
    backend.emit("seed.state", state("importing"));

    expect(await result).toEqual(state("importing"));
  });

  it("событие applying не завершает ожидание", async () => {
    await install({ capabilities: ["db", "seed"] });
    backend.on("seed.getState", () => state("applying"));

    const result = waitForSeedIndexes();
    await new Promise((resolve) => setTimeout(resolve, 10));
    backend.emit("seed.state", state("applying"));
    backend.emit("seed.state", state("completed"));

    expect(await result).toEqual(state("completed"));
  });

  it("таймаут отпускает загрузку по сети", async () => {
    await install({ capabilities: ["db", "seed"] });
    backend.on("seed.getState", () => state("applying"));

    expect(await waitForSeedIndexes(30)).toBeNull();
  });

  it("ошибка вызова не блокирует запуск", async () => {
    await install({ capabilities: ["db", "seed"] });
    // seed.getState не зарегистрирован: NOT_SUPPORTED

    expect(await waitForSeedIndexes()).toBeNull();
  });
});
