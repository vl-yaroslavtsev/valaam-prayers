import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeNativeBackend } from "@/test/fakeNativeBackend";
import {
  initiatePayment,
  loadCartRites,
  requestGid,
  type InitiatePaymentResponse,
} from "@/services/rites/ritesApi";
import { payRites } from "@/services/rites/ritesPayment";

vi.mock("@/services/rites/ritesApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/rites/ritesApi")>()),
  initiatePayment: vi.fn(),
  loadCartRites: vi.fn(),
  requestGid: vi.fn(),
}));

const response = (extra: Partial<InitiatePaymentResponse> = {}): InitiatePaymentResponse => ({
  payment_id: 1,
  payment: "sdk",
  valaam_action: "rites",
  ids: "1,2",
  ...extra,
});

const OPTIONS = { ids: [1, 2], amount: 1350, email: "a@b.ru" };

describe("оплата записок: нативный ЮKassa SDK", () => {
  let backend: FakeNativeBackend;
  let uninstall: () => void;

  beforeEach(() => {
    backend = new FakeNativeBackend();
    uninstall = backend.install({ platform: "android", capabilities: ["db", "pay"] });
    vi.mocked(requestGid).mockResolvedValue("gid-1");
    backend
      .on("pay.tokenize", () => ({ status: "success", paymentToken: "pt", paymentMethodType: "bank_card" }))
      .on("pay.confirm", () => ({ status: "success" }))
      .on("pay.close", () => ({ status: "success" }));
  });

  afterEach(() => {
    uninstall();
    vi.clearAllMocks();
  });

  it("токен SDK уходит в initiatePayment, оплата без 3-D Secure завершается успехом", async () => {
    vi.mocked(initiatePayment).mockResolvedValue({ ok: true, data: response({ status: "succeeded" }) });

    const result = await payRites(OPTIONS);

    expect(result).toEqual({ status: "success" });
    expect(backend.callsOf("pay.tokenize")).toEqual([
      { amount: "1350.00", title: "Записки", subtitle: "Валаамский монастырь" },
    ]);
    expect(initiatePayment).toHaveBeenCalledWith({
      ids: [1, 2],
      email: "a@b.ru",
      payment: "sdk",
      paymentToken: "pt",
      gid: "gid-1",
    });
    expect(backend.callsOf("pay.confirm")).toEqual([]);
  });

  it("подтверждение 3-D Secure открывается по confirmationUrl, в том числе вложенному в payment", async () => {
    vi.mocked(initiatePayment).mockResolvedValue({
      ok: true,
      data: response({ payment: { confirmationUrl: "https://pay.example/3ds" } }),
    });

    const result = await payRites(OPTIONS);

    expect(result).toEqual({ status: "success" });
    expect(backend.callsOf("pay.confirm")).toEqual([
      { confirmationUrl: "https://pay.example/3ds", paymentMethodType: "bank_card" },
    ]);
  });

  it("отмена на экране оплаты не доходит до сервера", async () => {
    backend.on("pay.tokenize", () => ({ status: "cancelled" }));

    expect(await payRites(OPTIONS)).toEqual({ status: "cancelled" });
    expect(initiatePayment).not.toHaveBeenCalled();
  });

  it("ошибки сервера возвращаются как есть для разбора по полям", async () => {
    const errors = { fieldsErrors: [{ field: "email", description: "Неверный email" }] };
    vi.mocked(initiatePayment).mockResolvedValue({ ok: false, status: 400, errors });

    expect(await payRites(OPTIONS)).toEqual({ status: "failed", message: "", errors });
  });

  it("отказ 3-D Secure — ошибка с понятным текстом", async () => {
    vi.mocked(initiatePayment).mockResolvedValue({
      ok: true,
      data: response({ confirmationUrl: "https://pay.example/3ds" }),
    });
    backend.on("pay.confirm", () => ({ status: "cancelled" }));

    const result = await payRites(OPTIONS);

    expect(result).toEqual({ status: "failed", message: "Платёж не завершён. Попробуйте ещё раз" });
  });

  it("без ответа о статусе ждёт, пока записки уйдут из корзины", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(initiatePayment).mockResolvedValue({ ok: true, data: response() });
      vi.mocked(loadCartRites).mockResolvedValue([]);

      const pending = payRites(OPTIONS);
      await vi.advanceTimersByTimeAsync(2000);

      expect(await pending).toEqual({ status: "success" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("если сервер так и не подтвердил оплату, платёж считается обрабатываемым", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(initiatePayment).mockResolvedValue({ ok: true, data: response() });
      vi.mocked(loadCartRites).mockResolvedValue([
        { id: 1, number: "1", names: [], type: null, sum: 1 },
      ]);

      const pending = payRites(OPTIONS);
      await vi.advanceTimersByTimeAsync(31000);

      expect(await pending).toEqual({ status: "pending" });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("оплата записок: виджет ЮKassa (без нативного SDK)", () => {
  type Handler = (payload: { status: string }) => void;
  let handlers: Record<string, Handler>;
  let widgetConfig: { confirmation_token: string; error_callback?: (error: { message?: string }) => void } | undefined;
  const destroy = vi.fn();

  beforeEach(() => {
    vi.mocked(requestGid).mockResolvedValue("gid-1");
    handlers = {};
    widgetConfig = undefined;
    window.YooMoneyCheckoutWidget = class {
      constructor(config: typeof widgetConfig) {
        widgetConfig = config;
      }
      on(event: string, callback: Handler) {
        handlers[event] = callback;
      }
      render() {}
      destroy = destroy;
    } as unknown as typeof window.YooMoneyCheckoutWidget;
    vi.mocked(initiatePayment).mockResolvedValue({ ok: true, data: response({ payment: "widget", confirmationToken: "ct" }) });
  });

  afterEach(() => {
    delete window.YooMoneyCheckoutWidget;
    vi.clearAllMocks();
  });

  it("запрашивает confirmationToken у сервера и открывает виджет", async () => {
    const promise = payRites(OPTIONS);
    await vi.waitFor(() => expect(handlers.complete).toBeDefined());
    handlers.complete({ status: "success" });

    expect(await promise).toEqual({ status: "success" });
    expect(requestGid).toHaveBeenCalled();
    expect(initiatePayment).toHaveBeenCalledWith({
      ids: [1, 2],
      email: "a@b.ru",
      payment: "widget",
      gid: "gid-1",
    });
    expect(widgetConfig?.confirmation_token).toBe("ct");
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("закрытие окна пользователем — отмена, повторные события игнорируются", async () => {
    const promise = payRites(OPTIONS);
    await vi.waitFor(() => expect(handlers.modal_close).toBeDefined());
    handlers.modal_close({ status: "" });
    handlers.complete({ status: "success" });

    expect(await promise).toEqual({ status: "cancelled" });
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("незавершённый платёж — ошибка", async () => {
    const promise = payRites(OPTIONS);
    await vi.waitFor(() => expect(handlers.complete).toBeDefined());
    handlers.complete({ status: "error" });

    expect(await promise).toEqual({
      status: "failed",
      message: "Платёж не завершён. Попробуйте ещё раз",
    });
  });

  it("ошибка виджета возвращается сообщением", async () => {
    const promise = payRites(OPTIONS);
    await vi.waitFor(() => expect(widgetConfig).toBeDefined());
    widgetConfig?.error_callback?.({ message: "boom" });

    expect(await promise).toEqual({ status: "failed", message: "Ошибка при работе с виджетом! boom" });
  });

  it("ошибки сервера не открывают виджет", async () => {
    const errors = { fullErrors: [{ description: "Записки уже оплачены" }] };
    vi.mocked(initiatePayment).mockResolvedValue({ ok: false, status: 400, errors });

    expect(await payRites(OPTIONS)).toEqual({ status: "failed", message: "", errors });
    expect(handlers.complete).toBeUndefined();
  });
});
