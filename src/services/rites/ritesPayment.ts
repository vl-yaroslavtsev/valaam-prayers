import { ensureNativePay, nativePay } from "@/services/native/pay";
import {
  initiatePayment,
  loadCartRites,
  requestGid,
  toErrorList,
  type ApiError,
  type ApiErrors,
  type InitiatePaymentResponse,
} from "@/services/rites/ritesApi";

const PAY_TITLE = "Записки";
const PAY_SUBTITLE = "Валаамский монастырь";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;
const WIDGET_SCRIPT_URL = "https://static.yoomoney.ru/checkout-client/checkout-widget.js";

interface YooMoneyCheckoutWidgetInstance {
  on(event: string, callback: (payload: any) => void): void;
  render(): void;
  destroy(): void;
}

declare global {
  interface Window {
    YooMoneyCheckoutWidget?: new (config: {
      confirmation_token: string;
      customization?: { modal?: boolean };
      error_callback?: (error: { message?: string }) => void;
    }) => YooMoneyCheckoutWidgetInstance;
  }
}

export type RitesPayResult =
  | { status: "success" }
  /** Пользователь закрыл оплату сам: ничего не показываем */
  | { status: "cancelled" }
  /** Платёж принят, но сервер ещё не подтвердил оплату записок */
  | { status: "pending" }
  | { status: "failed"; message: string; errors?: ApiErrors | null };

export interface RitesPayOptions {
  ids: number[];
  /** Сумма в рублях: для нативного экрана оплаты */
  amount: number;
  email: string;
  /** Включает и выключает индикатор «Оформляем платёж» с опциональным текстом этапа */
  onProcessing?: (active: boolean, text?: string) => void;
}

export interface ParsedPaymentErrors {
  emailError: string | null;
  riteErrors: Map<number, ApiError[]>;
  general: string[];
}

/** Раскладывает ошибки сервера: email к полю, rite-<id> к записке, остальное в общий список */
export function parsePaymentErrors(
  errors: ApiErrors | null | undefined,
  knownRiteIds: Iterable<number>,
): ParsedPaymentErrors {
  const known = new Set(knownRiteIds);
  const riteErrors = new Map<number, ApiError[]>();
  const general: string[] = [];
  let emailError: string | null = null;

  for (const error of toErrorList(errors?.fieldsErrors)) {
    if (error.field === "email") {
      emailError ??= error.description;
      continue;
    }
    const match = error.field ? /^rite-(\d+)$/.exec(error.field) : null;
    const riteId = match ? Number(match[1]) : 0;
    if (riteId && known.has(riteId)) {
      const list = riteErrors.get(riteId) ?? [];
      list.push(error);
      riteErrors.set(riteId, list);
    } else {
      general.push(error.description);
    }
  }
  general.push(...toErrorList(errors?.fullErrors).map((error) => error.description));
  return { emailError, riteErrors, general };
}

// gid живёт до оплаты: запрашиваем заранее при открытии корзины и заново перед следующей
let gidPromise: Promise<string | null> | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Вызывать при открытии корзины: заранее запрашивает gid, чтобы не задерживать оплату */
export function prepareRitesPayment(): void {
  gidPromise ??= requestGid();
}

/** Сброс кэша gid для тестов */
export function resetPaymentStateForTests(): void {
  gidPromise = null;
}

/**
 * Жертвует за записки.
 * 1) Нативный ЮKassa SDK: токен из SDK уходит в /rites/initiatePayment.
 * 2) Вне приложения: виджет ЮKassa.
 */
export async function payRites(options: RitesPayOptions): Promise<RitesPayResult> {
  try {
    return (await ensureNativePay()) ? await payNative(options) : await payWidget(options);
  } catch (ex) {
    return { status: "failed", message: "Ошибка: " + ((ex as Error)?.message ?? ex) };
  }
}

/** Ждёт, пока записки перестанут быть в корзине: сервер подтвердил оплату */
async function waitRitesPaid(ids: number[]): Promise<boolean> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    try {
      const inCart = new Set((await loadCartRites()).map((rite) => rite.id));
      if (ids.every((id) => !inCart.has(id))) return true;
    } catch (ex) {
      console.error("Ошибка опроса статуса записок:", ex);
    }
  }
  return false;
}

const extractConfirmation = (data: InitiatePaymentResponse) => {
  const nested = typeof data.payment === "object" && data.payment ? data.payment : undefined;
  return {
    confirmationUrl: data.confirmationUrl ?? nested?.confirmationUrl,
    status: data.status ?? nested?.status,
  };
};

async function payNative({ ids, amount, email, onProcessing }: RitesPayOptions): Promise<RitesPayResult> {
  const pay = nativePay;

  let closed = false;
  const closeNative = async () => {
    if (closed) return;
    closed = true;
    try {
      await pay.close();
    } catch (ex) {
      console.error("pay.close:", ex);
    }
  };

  const waitPaid = async (): Promise<RitesPayResult> => {
    onProcessing?.(true, "Подтверждаем оплату...");
    return (await waitRitesPaid(ids)) ? { status: "success" } : { status: "pending" };
  };

  try {
    gidPromise ??= requestGid();
    const gid = await gidPromise;

    const tokenResult = await pay.tokenize({
      amount: amount.toFixed(2),
      title: PAY_TITLE,
      subtitle: PAY_SUBTITLE,
    });
    if (tokenResult.status === "cancelled") return { status: "cancelled" };
    if (tokenResult.status !== "success" || !tokenResult.paymentToken) {
      return { status: "failed", message: tokenResult.message || "Ошибка оплаты" };
    }

    onProcessing?.(true);

    const result = await initiatePayment({
      ids,
      email,
      payment: "sdk",
      paymentToken: tokenResult.paymentToken,
      gid,
    });
    if (!result.ok) {
      return { status: "failed", message: "", errors: result.errors };
    }

    const { confirmationUrl, status } = extractConfirmation(result.data ?? {});

    if (confirmationUrl) {
      const confirmResult = await pay.confirm({
        confirmationUrl,
        paymentMethodType: tokenResult.paymentMethodType ?? "",
      });
      await closeNative();

      switch (confirmResult.status) {
        case "success":
          return { status: "success" };
        case "cancelled":
          return { status: "failed", message: "Платёж не завершён. Попробуйте ещё раз" };
        case "error":
          return { status: "failed", message: confirmResult.message || "Ошибка оплаты" };
        default:
          return await waitPaid();
      }
    }

    await closeNative();
    return status === "succeeded" ? { status: "success" } : await waitPaid();
  } finally {
    gidPromise = null;
    onProcessing?.(false);
    await closeNative();
  }
}

function loadYooKassaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.YooMoneyCheckoutWidget) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Не удалось загрузить виджет оплаты"));
    document.head.appendChild(script);
  });
}

async function payWidget({ ids, email, onProcessing }: RitesPayOptions): Promise<RitesPayResult> {
  onProcessing?.(true);
  try {
    gidPromise ??= requestGid();
    const [gid] = await Promise.all([gidPromise, loadYooKassaScript()]);

    const result = await initiatePayment({ ids, email, payment: "widget", gid });
    if (!result.ok) {
      return { status: "failed", message: "", errors: result.errors };
    }
    const confirmationToken = result.data?.confirmationToken;
    if (!confirmationToken || !window.YooMoneyCheckoutWidget) {
      return { status: "failed", message: "" };
    }

    // Индикатор нужен только до открытия виджета: дальше пользователь работает в его окне
    onProcessing?.(false);

    return await new Promise<RitesPayResult>((resolve) => {
      let settled = false;
      const finish = (payResult: RitesPayResult) => {
        if (settled) return;
        settled = true;
        try {
          checkout.destroy();
        } catch (ex) {
          console.error("Не удалось закрыть виджет оплаты:", ex);
        }
        resolve(payResult);
      };

      const checkout = new window.YooMoneyCheckoutWidget!({
        confirmation_token: confirmationToken,
        customization: { modal: true },
        error_callback: (error: { message?: string }) =>
          finish({ status: "failed", message: "Ошибка при работе с виджетом! " + (error?.message ?? error) }),
      });

      // complete приходит после любой попытки оплаты, modal_close после закрытия окна пользователем
      checkout.on("complete", ({ status }: { status: string }) =>
        finish(
          status === "success"
            ? { status: "success" }
            : { status: "failed", message: "Платёж не завершён. Попробуйте ещё раз" },
        ),
      );
      checkout.on("modal_close", () => finish({ status: "cancelled" }));

      checkout.render();
    });
  } finally {
    gidPromise = null;
    onProcessing?.(false);
  }
}
