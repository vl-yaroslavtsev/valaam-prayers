import { afterEach, describe, expect, it } from "vitest";
import { getNativePlatform } from "@/services/native/nativeRpc";
import { ensureNativePay, isNativePayAvailable, nativePay } from "@/services/native/pay";
import { FakeNativeBackend, FakeNativeError, type NativePlatform } from "@/test/fakeNativeBackend";

describe("нативная оплата без моста", () => {
  it("в браузере оплата недоступна", async () => {
    expect(await ensureNativePay()).toBe(false);
    expect(isNativePayAvailable()).toBe(false);
  });
});

describe("нативная оплата без capability", () => {
  let uninstall: () => void;

  afterEach(() => uninstall?.());

  it("старая нативка без pay не принимается", async () => {
    uninstall = new FakeNativeBackend().install({ capabilities: ["db", "download"] });

    expect(await ensureNativePay()).toBe(false);
    expect(isNativePayAvailable()).toBe(false);
  });
});

describe.each<NativePlatform>(["android", "ios"])("нативная оплата (%s)", (platform) => {
  let backend: FakeNativeBackend;
  let uninstall: () => void;

  afterEach(() => uninstall?.());

  const install = () => {
    backend = new FakeNativeBackend();
    uninstall = backend.install({ platform, capabilities: ["db", "pay"] });
  };

  it("рукопожатие открывает оплату и сообщает платформу", async () => {
    install();

    expect(isNativePayAvailable()).toBe(false);
    expect(await ensureNativePay()).toBe(true);
    expect(isNativePayAvailable()).toBe(true);
    expect(getNativePlatform()).toBe(platform);
  });

  it("tokenize, confirm и close проходят через RPC с параметрами и результатом", async () => {
    install();
    backend
      .on("pay.tokenize", () => ({ status: "success", paymentToken: "pt", paymentMethodType: "bank_card" }))
      .on("pay.confirm", () => ({ status: "success" }))
      .on("pay.close", () => ({ status: "success" }));

    const token = await nativePay.tokenize({ amount: "100.00", title: "Пожертвование", subtitle: "Монастырь" });
    const confirmed = await nativePay.confirm({ confirmationUrl: "https://pay.example/3ds", paymentMethodType: "bank_card" });
    const closed = await nativePay.close();

    expect(token).toEqual({ status: "success", paymentToken: "pt", paymentMethodType: "bank_card" });
    expect(confirmed).toEqual({ status: "success" });
    expect(closed).toEqual({ status: "success" });
    expect(backend.callsOf("pay.tokenize")).toEqual([{ amount: "100.00", title: "Пожертвование", subtitle: "Монастырь" }]);
    expect(backend.callsOf("pay.confirm")).toEqual([
      { confirmationUrl: "https://pay.example/3ds", paymentMethodType: "bank_card" },
    ]);
    expect(backend.callsOf("pay.close")).toEqual([{}]);
  });

  it("статус отмены приходит результатом, а не ошибкой", async () => {
    install();
    backend.on("pay.tokenize", () => ({ status: "cancelled" }));

    await expect(nativePay.tokenize({ amount: "1", title: "", subtitle: "" })).resolves.toEqual({ status: "cancelled" });
  });

  it("неверные параметры приходят результатом с сообщением", async () => {
    install();
    backend.on("pay.tokenize", () => ({ status: "error", message: "Некорректная сумма" }));

    await expect(nativePay.tokenize({ amount: "0", title: "", subtitle: "" })).resolves.toEqual({
      status: "error",
      message: "Некорректная сумма",
    });
  });

  it("сбой моста приходит RPC-ошибкой с кодом", async () => {
    install();
    backend.on("pay.close", () => {
      throw new FakeNativeError("NOT_SUPPORTED", "Оплата недоступна");
    });

    const error = await nativePay.close().catch((err) => err);

    expect(error.code).toBe("NOT_SUPPORTED");
  });
});
