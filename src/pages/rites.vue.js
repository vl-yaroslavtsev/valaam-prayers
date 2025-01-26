/// <reference types="../../node_modules/.vue-global-types/vue_3.4_false.d.ts" />
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
}; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
  const __VLS_ctx = {};
  let __VLS_components;
  let __VLS_directives;
  const __VLS_0 = {}.F7Page;
  /** @type { [typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, typeof __VLS_components.F7Page, typeof __VLS_components.f7Page, ] } */ // @ts-ignore
  const __VLS_1 = __VLS_asFunctionalComponent(
    __VLS_0,
    new __VLS_0({
      name: "rites",
    }),
  );
  const __VLS_2 = __VLS_1(
    {
      name: "rites",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_1),
  );
  var __VLS_6 = {};
  const __VLS_7 = {}.F7Navbar;
  /** @type { [typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, typeof __VLS_components.F7Navbar, typeof __VLS_components.f7Navbar, ] } */ // @ts-ignore
  const __VLS_8 = __VLS_asFunctionalComponent(
    __VLS_7,
    new __VLS_7({
      title: "Пожертвования",
    }),
  );
  const __VLS_9 = __VLS_8(
    {
      title: "Пожертвования",
    },
    ...__VLS_functionalComponentArgsRest(__VLS_8),
  );
  __VLS_elementAsFunction(
    __VLS_intrinsicElements.form,
    __VLS_intrinsicElements.form,
  )({
    ...{ onSubmit: __VLS_ctx.donate },
  });
  const __VLS_13 = {}.F7BlockTitle;
  /** @type { [typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, typeof __VLS_components.F7BlockTitle, typeof __VLS_components.f7BlockTitle, ] } */ // @ts-ignore
  const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({}));
  const __VLS_15 = __VLS_14({}, ...__VLS_functionalComponentArgsRest(__VLS_14));
  __VLS_18.slots.default;
  var __VLS_18;
  const __VLS_19 = {}.F7List;
  /** @type { [typeof __VLS_components.F7List, typeof __VLS_components.f7List, typeof __VLS_components.F7List, typeof __VLS_components.f7List, ] } */ // @ts-ignore
  const __VLS_20 = __VLS_asFunctionalComponent(
    __VLS_19,
    new __VLS_19({
      strongIos: true,
      dividersIos: true,
      outlineIos: true,
    }),
  );
  const __VLS_21 = __VLS_20(
    {
      strongIos: true,
      dividersIos: true,
      outlineIos: true,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_20),
  );
  const __VLS_25 = {}.F7ListInput;
  /** @type { [typeof __VLS_components.F7ListInput, typeof __VLS_components.f7ListInput, typeof __VLS_components.F7ListInput, typeof __VLS_components.f7ListInput, ] } */ // @ts-ignore
  const __VLS_26 = __VLS_asFunctionalComponent(
    __VLS_25,
    new __VLS_25({
      label: "Сумма в рублях",
      type: "number",
      min: "1",
      required: true,
      value: __VLS_ctx.donation,
    }),
  );
  const __VLS_27 = __VLS_26(
    {
      label: "Сумма в рублях",
      type: "number",
      min: "1",
      required: true,
      value: __VLS_ctx.donation,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_26),
  );
  const __VLS_31 = {}.F7ListInput;
  /** @type { [typeof __VLS_components.F7ListInput, typeof __VLS_components.f7ListInput, typeof __VLS_components.F7ListInput, typeof __VLS_components.f7ListInput, ] } */ // @ts-ignore
  const __VLS_32 = __VLS_asFunctionalComponent(
    __VLS_31,
    new __VLS_31({
      label: "E-mail",
      type: "email",
      placeholder: "E-mail",
      required: true,
      value: __VLS_ctx.email,
    }),
  );
  const __VLS_33 = __VLS_32(
    {
      label: "E-mail",
      type: "email",
      placeholder: "E-mail",
      required: true,
      value: __VLS_ctx.email,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_32),
  );
  __VLS_24.slots.default;
  var __VLS_24;
  const __VLS_37 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_38 = __VLS_asFunctionalComponent(
    __VLS_37,
    new __VLS_37({
      strong: true,
      outline: true,
      ...{ class: { "display-none": !__VLS_ctx.error.common } },
    }),
  );
  const __VLS_39 = __VLS_38(
    {
      strong: true,
      outline: true,
      ...{ class: { "display-none": !__VLS_ctx.error.common } },
    },
    ...__VLS_functionalComponentArgsRest(__VLS_38),
  );
  __VLS_ctx.error.common;
  __VLS_42.slots.default;
  var __VLS_42;
  const __VLS_43 = {}.F7Block;
  /** @type { [typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, typeof __VLS_components.F7Block, typeof __VLS_components.f7Block, ] } */ // @ts-ignore
  const __VLS_44 = __VLS_asFunctionalComponent(
    __VLS_43,
    new __VLS_43({
      strongIos: true,
      outlineIos: true,
      ...{ class: "grid grid-cols-2 grid-gap" },
    }),
  );
  const __VLS_45 = __VLS_44(
    {
      strongIos: true,
      outlineIos: true,
      ...{ class: "grid grid-cols-2 grid-gap" },
    },
    ...__VLS_functionalComponentArgsRest(__VLS_44),
  );
  const __VLS_49 = {}.F7Button;
  /** @type { [typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, typeof __VLS_components.F7Button, typeof __VLS_components.f7Button, ] } */ // @ts-ignore
  const __VLS_50 = __VLS_asFunctionalComponent(
    __VLS_49,
    new __VLS_49({
      fill: true,
      type: "submit",
      disabled: __VLS_ctx.loading,
    }),
  );
  const __VLS_51 = __VLS_50(
    {
      fill: true,
      type: "submit",
      disabled: __VLS_ctx.loading,
    },
    ...__VLS_functionalComponentArgsRest(__VLS_50),
  );
  __VLS_54.slots.default;
  var __VLS_54;
  __VLS_48.slots.default;
  var __VLS_48;
  __VLS_5.slots.default;
  var __VLS_5;
  ["display-none", "grid", "grid-cols-2", "grid-gap"];
  var __VLS_slots;
  var $slots;
  let __VLS_inheritedAttrs;
  var $attrs;
  const __VLS_refs = {};
  var $refs;
  var $el;
  return {
    attrs: {},
    slots: __VLS_slots,
    refs: $refs,
    rootEl: $el,
  };
}
const __VLS_self = (await import("vue")).defineComponent({
  setup() {
    return {
      donation: donation,
      email: email,
      error: error,
      loading: loading,
      donate: donate,
    };
  },
});
export default (await import("vue")).defineComponent({
  setup() {
    return {};
  },
}); /* PartiallyEnd: #4569/main.vue */
