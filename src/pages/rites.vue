<template>
  <f7-page name="rites">
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
        <f7-button fill type="submit" :disabled="loading"
          >Пожертвовать</f7-button
        >
      </f7-block>
    </form>
  </f7-page>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { f7, f7ready } from "framework7-vue";
import { Dom7 as $ } from "framework7";

const donation = ref(1);
const email = ref(
  localStorage.getItem("donation-email") || "vl.yaroslavtsev@gmail.com",
);
const error = ref({});
const loading = ref(false);

const getUID = () => {
  return window.crypto
    .getRandomValues(new Uint32Array(4))
    .reduce((acc, el) => (acc += el.toString(16)), "");
};

const postJson = async (url, data = {}) => {
  try {
    await loadYooKassaScript();
  } catch (error) {
    throw 'Ошибка загрузки виджета: ' + error;
  }
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
    },
    credentials: "same-origin",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw "HTTP error: " + res.status;
  }

  return res.json();
};

const renderWidget = (
  payment,
  { onDone = () => {}, onError = () => {} } = {},
) => {
  const token = payment.confirmation.confirmation_token;
  const checkout = new window.YooMoneyCheckoutWidget({
    confirmation_token: token,
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

const donate = async (event) => {
  event.preventDefault();

  const data = {
    clientId: getUID(),
    donationTypeId: "175617",
    summ: donation.value,
    email: email.value,
    valaamGid: "BITRIX_SM.MzA0NTgyOTAuMjY0MDEzMTcuUlUuNS5ZLnMx",
    valaamKey: "Kv75zKdM4g8L3VfE2u4JlUv38Au5lIQz",
    payment: "widget",
  };

  console.log(data);

  loading.value = true;

  try {
    const res = await postJson(
      "https://valaam.ru/payments/form-donates.php",
      data,
    );

    if (res.error) {
      error.value = res.error;
      return;
    }

    error.value = {};

    const payment = res?.payment;

    if (res.status === "done" && payment) {
      renderWidget(payment, {
        onDone: (status) => {
          if (status === "success" && email.value) {
            localStorage.setItem("donation-email", email.value.trim());
          }
          //console.log("status", status, "payment", payment);
        },
        onError: (error) => {
          error.value.common = "Ошибка при работе с виджетом! " + error;
        },
      });
    }
  } catch (ex) {
    error.value.common = "Ошибка: " + ex;
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
