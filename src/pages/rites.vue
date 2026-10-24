<template>
  <f7-page name="rites" @page:afterin="onFormOpen" @page:tabshow="onFormOpen">
    <f7-navbar title="Пожертвования"></f7-navbar>

    <form @submit="donate">
      <f7-block-title>Пожертвовать</f7-block-title>
      <f7-list strong-ios dividers-ios outline-ios>
        <f7-list-input
          label="Сумма в рублях"
          type="number"
          min="1"
          required
          v-model:value="donation"
        ></f7-list-input>

        <f7-list-input
          label="E-mail"
          type="email"
          placeholder="E-mail"
          required
          v-model:value="email"
        ></f7-list-input>
      </f7-list>

      <f7-block strong outline :class="{ 'display-none': !error.common }">
        {{ error.common }}
      </f7-block>

      <f7-block strong-ios outline-ios class="grid grid-cols-2 grid-gap">
        <f7-button fill type="submit" :disabled="loading || submitting"
          >Пожертвовать</f7-button
        >
      </f7-block>
    </form>
  </f7-page>
</template>

<style>
.checkout-modal__container {
  margin-top: var(--f7-safe-area-top) !important;
  margin-bottom: var(--f7-safe-area-bottom) !important;
}
</style>

<script setup>
import { ref, watch, onMounted } from "vue";
import { f7, f7ready } from "framework7-vue";
import { Dom7 as $ } from "framework7";
import { getNativePlatform } from "@/services/native/nativeRpc";
import { ensureNativePay, nativePay } from "@/services/native/pay";

const donation = ref(1);
const email = ref(
  localStorage.getItem("donation-email") || "vl.yaroslavtsev@gmail.com",
);
const error = ref({});
const loading = ref(false);
const submitting = ref(false);

// Нативная оплата через ЮKassa SDK (нативный мост, capability "pay"), вне приложения остаётся виджет
const API =
  import.meta.env.VITE_PAYMENT_API_URL ||
  (import.meta.env.MODE === "development"
    ? "https://dev.valaam.ru/api"
    : "https://dev.valaam.ru/api" //"https://valaam.ru/api");
  );
const DONATION_TYPE_ID = "175617";
const DONATION_TYPE_NAME = "Валаамский монастырь";
const GID_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

// gid живёт только в памяти формы и запрашивается заново при каждом открытии
let gidPromise = null;
// id пожертвования переживает неудачную попытку: повтор идёт с новым токеном
let donationId = null;

const getUID = () => {
  return window.crypto
    .getRandomValues(new Uint32Array(4))
    .reduce((acc, el) => (acc += el.toString(16)), "");
};

const renderWidget = (
  payment,
  { onDone = () => {}, onError = () => {} } = {},
) => {
  const checkout = new window.YooMoneyCheckoutWidget({
    confirmation_token: payment.confirmationToken,
    customization: {
      //Настройка способа отображения
      modal: true,
    },
    error_callback: (error) => onError(error),
  });

  checkout.on("complete", ({ status }) => {
    onDone(status);
    checkout.destroy();
    alert("Пожертвование отправлено!");
  });

  //Отображение платежной формы в контейнере
  checkout.render();
};

const getClientId = () => {
  let id = localStorage.getItem("donation-client-id");
  if (!id) {
    id = getUID();
    localStorage.setItem("donation-client-id", id);
  }
  return id;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requestGid = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GID_TIMEOUT_MS);
  try {
    const platform = getNativePlatform();
    const response = await fetch(
      `${API}/rites/valaamGid?referer1=valaam.prayers.${platform}`,
      { credentials: "omit", signal: controller.signal },
    );
    if (!response.ok) {
      throw new Error("HTTP error: " + response.status);
    }
    const { gid } = await response.json();
    return gid ?? null;
  } catch (ex) {
    console.error("Не удалось получить gid:", ex);
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const onFormOpen = async () => {
  if (await ensureNativePay()) {
    gidPromise = requestGid();
  }
};

const describeServerErrors = (result) => {
  const messages = [
    ...Object.values(result?.fieldsErrors ?? {}),
    ...Object.values(result?.fullErrors ?? {}),
  ]
    .map((item) => item?.description)
    .filter(Boolean);
  return messages.join("\n") || "Не удалось выполнить платёж. Попробуйте ещё раз";
};

const isDonationPaid = async (id) => {
  const res = await fetch(
    `${API}/donations?clientId=${encodeURIComponent(getClientId())}`,
  );
  if (!res.ok) {
    throw new Error("HTTP error: " + res.status);
  }
  const { items = [] } = await res.json();
  return items.some((item) => item.id === id && item.active);
};

const waitDonationPaid = async (id) => {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    try {
      if (await isDonationPaid(id)) return true;
    } catch (ex) {
      console.error("Ошибка опроса статуса платежа:", ex);
    }
  }
  return false;
};

const donateNative = async (sum) => {
  const pay = nativePay;

  submitting.value = true;
  error.value = {};

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

  let preloader = null;
  const hideLoader = () => {
    preloader?.close();
    preloader = null;
  };

  const onSuccess = () => {
    hideLoader();
    localStorage.setItem("donation-email", email.value.trim());
    donationId = null;
    f7.dialog.alert("Пожертвование отправлено!");
  };

  const onPending = async () => {
    const paid = await waitDonationPaid(donationId);
    hideLoader();
    if (paid) {
      onSuccess();
    } else {
      f7.dialog.alert("Платёж обрабатывается, статус появится в истории");
    }
  };

  try {
    gidPromise ??= requestGid();
    const gid = await gidPromise;

    const tokenResult = await pay.tokenize({
      amount: sum.toFixed(2),
      title: "Пожертвование",
      subtitle: DONATION_TYPE_NAME,
    });
    if (tokenResult.status === "cancelled") return;
    if (tokenResult.status !== "success") {
      error.value = { common: tokenResult.message || "Ошибка оплаты" };
      return;
    }

    preloader = f7.dialog.preloader("Оформляем платёж...");

    const res = await fetch(`${API}/donations`, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      body: JSON.stringify({
        id: donationId,
        clientId: getClientId(),
        email: email.value,
        payment: "sdk",
        paymentToken: tokenResult.paymentToken,
        valaamGid: gid,
        summ: sum,
        donationTypeId: DONATION_TYPE_ID,
      }),
    });
    const result = await res.json().catch(() => null);

    if (res.status !== 200 || !result?.donation) {
      hideLoader();
      error.value = { common: describeServerErrors(result) };
      return;
    }

    donationId = result.donation.id;
    const { confirmationUrl, status } = result.payment ?? {};

    if (confirmationUrl) {
      const confirmResult = await pay.confirm({
        confirmationUrl,
        paymentMethodType: tokenResult.paymentMethodType,
      });
      await closeNative();

      switch (confirmResult.status) {
        case "success":
          onSuccess();
          break;
        case "cancelled":
          hideLoader();
          error.value = { common: "Платёж не завершён. Попробуйте ещё раз" };
          break;
        case "error":
          hideLoader();
          error.value = { common: confirmResult.message || "Ошибка оплаты" };
          break;
        default:
          await onPending();
      }
      return;
    }

    await closeNative();
    if (status === "succeeded") {
      onSuccess();
    } else {
      await onPending();
    }
  } catch (ex) {
    hideLoader();
    error.value = { common: "Ошибка: " + (ex?.message ?? ex) };
  } finally {
    hideLoader();
    await closeNative();
    submitting.value = false;
  }
};

const donate = async (event) => {
  event.preventDefault();

  const sum = Number(donation.value);
  if (!Number.isInteger(sum) || sum < 1) {
    error.value = { common: "Введите сумму целым числом рублей" };
    return;
  }

  if (await ensureNativePay()) {
    await donateNative(sum);
    return;
  }

  loading.value = true;
  error.value = {};

  try {
    try {
      await loadYooKassaScript();
    } catch (ex) {
      throw new Error("Ошибка загрузки виджета: " + (ex?.message ?? ex));
    }

    const res = await fetch(`${API}/donations`, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      body: JSON.stringify({
        id: donationId,
        clientId: getClientId(),
        email: email.value,
        payment: "widget",
        summ: sum,
        donationTypeId: DONATION_TYPE_ID,
      }),
    });
    const result = await res.json().catch(() => null);

    if (res.status !== 200 || !result?.donation) {
      error.value = { common: describeServerErrors(result) };
      return;
    }

    donationId = result.donation.id;
    const payment = result.payment;

    if (!payment?.confirmationToken) {
      error.value = { common: describeServerErrors(null) };
      return;
    }

    renderWidget(payment, {
      onDone: (status) => {
        if (status === "success" && email.value) {
          localStorage.setItem("donation-email", email.value.trim());
          donationId = null;
        }
      },
      onError: (ex) => {
        error.value = {
          common: "Ошибка при работе с виджетом! " + (ex?.message ?? ex),
        };
      },
    });
  } catch (ex) {
    error.value = { common: "Ошибка: " + (ex?.message ?? ex) };
  } finally {
    loading.value = false;
  }
};

const loadYooKassaScript = () => {
  return new Promise((resolve, reject) => {
    // Проверяем, не загружен ли уже скрипт
    if (window.YooMoneyCheckoutWidget) {
      resolve(window.YooMoneyCheckoutWidget);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://static.yoomoney.ru/checkout-client/checkout-widget.js';
    script.async = true;
    
    script.onload = () => resolve(window.YooMoneyCheckoutWidget);
    script.onerror = (error) => reject(new Error('Не удалось загрузить скрипт YooKassa: ' + error));
    
    document.head.appendChild(script);
  });
};
</script>
