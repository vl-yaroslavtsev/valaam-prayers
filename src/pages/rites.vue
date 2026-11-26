<template>
  <f7-page
    name="rites"
    class="rites-page"
    @page:beforein="onPageBeforeIn"
    @page:afterin="onPageShown"
    @page:tabshow="onPageShown"
    @page:beforeout="isActive = false"
    @page:tabhide="isActive = false"
  >
    <f7-navbar large transparent>
      <f7-nav-left :back-link="!isFirstPage">
        <f7-link v-if="isFirstPage" panel-open="left" v-html="BurgerIcon"></f7-link>
      </f7-nav-left>
      <f7-nav-title sliding>Корзина записок</f7-nav-title>
      <f7-nav-title-large>Корзина записок</f7-nav-title-large>
    </f7-navbar>

    <div class="rites-cart" :class="{ 'rites-cart--empty': isEmpty }">
      <!-- Загрузка корзины -->
      <div v-if="!store.isLoaded" class="rites-state" aria-busy="true">
        <f7-skeleton-block class="rites-skeleton rites-skeleton--button" effect="wave" />
        <f7-skeleton-block class="rites-skeleton rites-skeleton--select" effect="wave" />
        <f7-skeleton-block class="rites-skeleton rites-skeleton--card" effect="wave" />
        <f7-skeleton-block class="rites-skeleton rites-skeleton--card" effect="wave" />
      </div>

      <!-- Ошибка загрузки -->
      <div v-else-if="store.loadError" class="rites-state rites-state--center">
        <p class="rites-state__text">{{ store.loadError }}</p>
        <f7-button outline large @click="store.load()">Повторить</f7-button>
      </div>

      <!-- Пустая корзина -->
      <div v-else-if="isEmpty" class="rites-empty">
        <div class="rites-empty__text">
          <p class="rites-empty__title">Корзина записок пуста</p>
          <p class="rites-empty__hint">
            У Вас нет пожертвованных записок. Заполните форму подачи записки, и она появится здесь.
          </p>
        </div>
        <div class="rites-empty__actions">
          <f7-button fill large class="rites-primary-button" @click="openPopup('create')">
            Подать записку
          </f7-button>
          <f7-button outline large @click="onHistory">История записок</f7-button>
        </div>
      </div>

      <!-- Корзина -->
      <template v-else>
        <div class="rites-history">
          <f7-button outline large @click="onHistory">История записок</f7-button>
        </div>

        <div class="rites-select">
          <label class="rites-select__all">
            <f7-checkbox
              :checked="store.allSelected"
              aria-label="Выбрать все записки"
              @change="store.allSelected = ($event.target as HTMLInputElement).checked"
            />
            <span>Выбрать все</span>
          </label>
          <f7-link
            class="rites-select__remove"
            :class="{ disabled: !store.anySelected }"
            @click="store.removeSelected()"
          >
            Удалить выбранные
          </f7-link>
        </div>

        <!-- Шапка таблицы: только на планшете -->
        <div class="rites-table-head" aria-hidden="true">
          <span class="rites-table-head__number">Номер</span>
          <span class="rites-table-head__type">Поминовение</span>
          <span class="rites-table-head__period">Период</span>
          <span class="rites-table-head__names">Имена</span>
          <span class="rites-table-head__sum">Сумма</span>
        </div>

        <f7-list class="rites-list" no-hairlines no-hairlines-between>
          <template #list>
            <!-- Без tag: список остаётся прямым потомком ul, а удаление и возврат записки анимируются хуками -->
            <TransitionGroup
              :css="false"
              @before-enter="onItemBeforeEnter"
              @enter="onItemEnter"
              @leave="onItemLeave"
            >
              <RitesCartItem
                v-for="item in store.items"
                :key="item.id"
                :item="item"
                @toggle="item.checked = $event"
                @edit="openPopup('edit', item)"
                @copy="openPopup('copy', item)"
                @remove="store.removeItems([item.id])"
              />
            </TransitionGroup>
          </template>
        </f7-list>

        <div class="rites-summary">
          <f7-link class="rites-add" @click="openPopup('create')">
            <span class="rites-add__icon" aria-hidden="true"></span>
            <span>Добавить записку</span>
          </f7-link>

          <div class="rites-total">
            <span class="rites-total__label">Всего:</span>
            <span class="rites-total__sum">{{ formatPrice(store.total) }}&nbsp;₽</span>
          </div>
        </div>

        <form class="rites-form" novalidate @submit.prevent="onPay">
          <f7-list class="rites-email" no-hairlines>
            <f7-list-input
              v-model:value="email"
              type="email"
              name="email"
              label="Электронная почта"
              placeholder="Введите электронную почту"
              autocomplete="email"
              inputmode="email"
              :error-message="emailErrorText"
              :error-message-force="emailError"
              @input="emailError = false"
            />
          </f7-list>

          <p class="rites-note">
            При возникновении вопросов пишите нам на <b>rites@valaam.ru</b>
          </p>

          <f7-button
            fill
            large
            type="submit"
            class="rites-pay"
            :disabled="isSubmitting"
            :preloader="isSubmitting"
            :loading="isSubmitting"
          >
            Пожертвовать
          </f7-button>
        </form>
      </template>
    </div>

    <RitePopup
      v-model:opened="popupOpened"
      :mode="popupMode"
      :item="popupItem"
      @saved="onRiteSaved"
    />
  </f7-page>
</template>

<script setup lang="ts">
import { f7 } from "framework7-vue";
import type { Dialog, Router, Toast } from "framework7/types";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import BurgerIcon from "@/assets/icons/burger.svg?raw";
import RitePopup, { type RitePopupMode } from "@/components/rites/RitePopup.vue";
import RitesCartItem from "@/components/rites/RitesCartItem.vue";
import {
  getSavedEmail,
  rememberConfirmedEmail,
  saveEmail,
  toErrorList,
  type ApiErrors,
  type Rite,
} from "@/services/rites/ritesApi";
import { onItemBeforeEnter, onItemEnter, onItemLeave } from "@/services/rites/collapseTransition";
import { closeOpenToast, syncUndoToast } from "@/services/rites/undoToast";
import { formatPrice, isValidEmail } from "@/services/rites/ritesFormat";
import { payRites, prepareRitesPayment } from "@/services/rites/ritesPayment";
import { ERROR_VISIBLE_MS, useRitesCartStore, type CartItem } from "@/stores/ritesCart";

const { f7router, f7route } = defineProps<{
  f7router: Router.Router;
  f7route: Router.Route;
}>();

// Ссылка может открыть корзину с ?EMAIL=: запоминаем до первого чтения поля
rememberConfirmedEmail(f7route.query.EMAIL);

const store = useRitesCartStore();

const isEmpty = computed(
  () => store.isLoaded && !store.loadError && store.items.length === 0,
);

// Корневая страница вкладки открывает левую панель, открытая из панели — кнопку «Назад»
const isFirstPage = ref(true);
// Страница на экране: возврат в приложение обновляет корзину только на ней
const isActive = ref(false);
const onPageBeforeIn = () => {
  isFirstPage.value = f7router.history.length <= 1;
};

const email = ref(getSavedEmail());
const emailError = ref(false);
const emailErrorText = ref("");
const isSubmitting = ref(false);

const popupOpened = ref(false);
const popupMode = ref<RitePopupMode>("create");
const popupItem = ref<Rite | null>(null);

let undoToast: Toast.Toast | null = null;
let errorToast: Toast.Toast | null = null;
let processingDialog: Dialog.Dialog | null = null;

const ERROR_TOAST_MS = 5000;

function showError(text: string): void {
  errorToast?.destroy();
  errorToast = f7.toast.create({
    text,
    position: "bottom",
    closeTimeout: ERROR_TOAST_MS,
    destroyOnClose: true,
  });
  errorToast.open();
}

const DATES_TOAST_MS = 7000;
let datesToast: Toast.Toast | null = null;

/** Обновляет корзину и пересчитывает устаревшие даты записок */
async function refreshCart(): Promise<void> {
  await store.load();
  const changed = await store.validateAndFixDates();
  if (changed === 0) return;

  datesToast?.destroy();
  datesToast = f7.toast.create({
    text: "Мы изменили даты записок на актуальные",
    position: "bottom",
    closeTimeout: DATES_TOAST_MS,
    destroyOnClose: true,
  });
  datesToast.open();
}

function onPageShown(): void {
  isActive.value = true;
  rememberConfirmedEmail(f7route.query.EMAIL);
  if (!email.value.trim()) email.value = getSavedEmail();
  void refreshCart();
  void prepareRitesPayment();
}

function onHistory(): void {
  f7router.navigate("/rites/my/");
}

function openPopup(mode: RitePopupMode, item: CartItem | null = null): void {
  popupMode.value = mode;
  popupItem.value = item;
  popupOpened.value = true;
}

function onRiteSaved(rite: Rite): void {
  if (popupMode.value === "edit") {
    store.updateItem(rite);
  } else {
    store.addItem(rite);
  }
  popupOpened.value = false;
}

function openUndoToast(text: string): Toast.Toast {
  const toast = f7.toast.create({
    text,
    position: "bottom",
    closeButton: true,
    closeButtonText: "Отменить",
    destroyOnClose: true,
    on: {
      closeButtonClick: () => store.undoRemoval(),
    },
  });
  toast.open();
  return toast;
}

// Отмена удаления: пока тост на экране, записки ещё не удалены на сервере.
// Тост один на серию: текст обновляется, а не создаётся второй поверх первого.
watch(
  () => store.pendingDeleted.length,
  (count) => {
    undoToast = syncUndoToast(undoToast, count, openUndoToast);
  },
);

watch(
  () => store.deleteError,
  (text) => {
    if (text) showError(`Не удалось удалить записку: ${text}`);
  },
);

function setProcessing(active: boolean): void {
  processingDialog?.close();
  processingDialog = active ? f7.dialog.preloader("Отправляем записки...") : null;
}

function focusEmail(): void {
  void nextTick(() => {
    document.querySelector<HTMLInputElement>(".rites-page input[name='email']")?.focus();
  });
}

function setEmailError(text: string): void {
  emailError.value = true;
  emailErrorText.value = text;
  focusEmail();
}

/** Раскладывает ошибки сервера: email к полю, rite-<id> к записке, остальное в общий список */
function applyPaymentErrors(errors: ApiErrors | null | undefined): string[] {
  const general: string[] = [];
  for (const error of toErrorList(errors?.fieldsErrors)) {
    if (error.field === "email") {
      setEmailError(error.description);
      continue;
    }
    const riteId = error.field?.startsWith("rite") ? parseInt(error.field.split("-")[1], 10) : 0;
    const item = riteId ? store.items.find((candidate) => candidate.id === riteId) : null;
    if (item) {
      item.errors.push(error);
    } else {
      general.push(error.description);
    }
  }
  general.push(...toErrorList(errors?.fullErrors).map((error) => error.description));
  return general;
}

async function onPay(): Promise<void> {
  if (isSubmitting.value) return;

  store.clearErrors();
  emailError.value = false;

  const ids = store.selectedItems.map((item) => item.id);
  if (ids.length === 0) {
    showError("Выберите хотя бы одну записку");
    return;
  }

  const trimmedEmail = email.value.trim();
  if (!trimmedEmail) {
    setEmailError("Введите электронную почту");
    return;
  }
  if (!isValidEmail(trimmedEmail)) {
    setEmailError("Некорректный адрес электронной почты");
    return;
  }

  isSubmitting.value = true;
  try {
    const result = await payRites({
      ids,
      amount: store.total,
      email: trimmedEmail,
      onProcessing: setProcessing,
    });

    switch (result.status) {
      case "success":
        saveEmail(trimmedEmail);
        store.markPaid(ids);
        f7.dialog.alert("Спасибо! Записки приняты, пожертвование оформлено.", "Пожертвование");
        void store.load();
        break;
      case "pending":
        saveEmail(trimmedEmail);
        f7.dialog.alert(
          "Платёж обрабатывается. Записки останутся в корзине, пока оплата не подтвердится.",
          "Пожертвование",
        );
        void store.load();
        break;
      case "failed": {
        const general = applyPaymentErrors(result.errors).join(". ");
        const hasFieldErrors = emailError.value || store.items.some((item) => item.errors.length > 0);
        if (general) {
          showError(general);
        } else if (!hasFieldErrors) {
          showError(result.message || "Не удалось оформить платёж. Попробуйте позже");
        }
        setTimeout(() => store.clearErrors(), ERROR_VISIBLE_MS);
        break;
      }
      case "cancelled":
        break;
    }
  } finally {
    setProcessing(false);
    isSubmitting.value = false;
  }
}

// Закрытие приложения во время ожидания отмены: удаляем сразу
const onVisibilityChange = () => {
  if (document.visibilityState === "hidden") {
    void store.commitRemoval({ keepalive: true });
  } else if (isActive.value) {
    // Вернулись в приложение, возможно на следующий день: даты могли устареть
    void refreshCart();
  }
};

onMounted(() => {
  document.addEventListener("visibilitychange", onVisibilityChange);
});

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisibilityChange);
  closeOpenToast(undoToast);
  errorToast?.destroy();
  datesToast?.destroy();
  setProcessing(false);
});
</script>

<style lang="less">
.rites-page {
  --rites-bg: var(--content-color-baige-100);
  --rites-card-bg: var(--content-color-white-100);
  --rites-text: var(--content-color-black-primary);
  --rites-text-secondary: var(--content-color-black-secondary);
  --rites-muted: var(--content-color-black-40);
  --rites-divider: var(--content-color-black-10);
  --rites-accent: var(--brand-color-primary-accent-50);
  --rites-note: rgba(0, 0, 0, 0.5);
  --rites-field-border: var(--content-color-black-20);
  --rites-field-bg: var(--content-color-white-100);
  --rites-field-placeholder: var(--content-color-black-60);
  --rites-pay-bg: var(--content-color-black-primary);
  --rites-pay-text: var(--content-color-white-100);
  --rites-pay-border: var(--content-color-baige-5);
  --rites-select-text: #333;
  --rites-select-link: var(--content-color-black-60);
  --rites-empty-bg: var(--content-color-white-100);
  --rites-empty-hint: var(--content-color-black-60);
  // Колонки таблицы на планшете: чекбокс, номер, поминовение, период, имена, сумма, три иконки
  //--rites-grid-columns: 24px 60px minmax(0, 2.66fr) 78px minmax(0, 1fr) 65px 24px 24px 24px;
  --rites-grid-columns: 24px 70px minmax(0, 1.5fr) 85px minmax(0, 1.5fr) 80px 24px 24px 24px;
}

.dark .rites-page {
  --rites-bg: var(--content-color-black-primary);
  --rites-card-bg: var(--content-color-black-secondary);
  --rites-text: var(--content-color-white-100);
  --rites-text-secondary: var(--content-color-white-100);
  --rites-muted: var(--content-color-baige-40);
  --rites-divider: var(--content-color-baige-10);
  --rites-accent: var(--brand-color-primary-accent-70);
  --rites-note: var(--content-color-baige-40);
  --rites-field-border: var(--content-color-baige-30);
  --rites-field-bg: var(--content-color-black-secondary);
  --rites-field-placeholder: var(--content-color-baige-60);
  --rites-pay-bg: var(--content-color-white-100);
  --rites-pay-text: var(--content-color-black-primary);
  --rites-pay-border: var(--content-color-black-10);
  --rites-select-text: var(--content-color-baige-90);
  --rites-select-link: var(--content-color-baige-60);
  --rites-empty-bg: var(--content-color-black-secondary);
  --rites-empty-hint: var(--content-color-baige-60);
}

.rites-page {
  .rites-cart {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px 10px 30px;
    color: var(--rites-text);
  }

  .rites-state {
    display: flex;
    flex-direction: column;
    gap: 20px;

    &--center {
      align-items: center;
      padding-top: 40px;
      text-align: center;
    }

    &__title {
      margin: 0;
      font-size: var(--mobile-subtitle-bold-s2);
      line-height: var(--mobile-subtitle-bold-s2-line-height);
      font-weight: 700;
    }

    &__text {
      margin: 0;
      font-size: var(--mobile-main-text-regular-b3);
      line-height: 20px;
      color: var(--rites-muted);
    }
  }

  .rites-skeleton {
    border-radius: 8px;

    &--button {
      height: 52px;
      width: 190px;
      align-self: center;
    }

    &--select {
      height: 44px;
    }

    &--card {
      height: 190px;
    }
  }

  // Пустая корзина: карточка с текстом и двумя кнопками
  .rites-cart--empty {
    padding: 30px 15px;
  }

  .rites-empty {
    display: flex;
    flex-direction: column;
    gap: 40px;
    padding: 20px 14px 10px;
    border-radius: 16px;
    background: var(--rites-empty-bg);

    &__text {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 0 20px;
      text-align: center;
    }

    &__title {
      margin: 0;
      font-size: 20px;
      line-height: 24px;
      font-weight: 700;
      color: var(--rites-text);
    }

    &__hint {
      margin: 0;
      font-size: 14px;
      line-height: 18px;
      color: var(--rites-empty-hint);
    }

    &__actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .button {
      width: 100%;
    }
  }

  // Кнопки: контур и заливка по макету
  .rites-state .button,
  .rites-empty .button,
  .rites-history .button,
  .rites-pay.button {
    --f7-button-height: 52px;
    --f7-button-border-radius: 10px;

    padding: 0 30px;
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
  }

  .rites-history {
    display: flex;
    justify-content: center;

    .button {
      --f7-button-border-color: var(--rites-text);
      --f7-button-text-color: var(--rites-text);
      --f7-button-border-width: 1px;
    }
  }

  .rites-state .button-outline,
  .rites-empty .button-outline {
    --f7-button-border-color: var(--rites-text);
    --f7-button-text-color: var(--rites-text);
    --f7-button-border-width: 1px;
  }

  .rites-primary-button.button-fill {
    --f7-button-bg-color: var(--rites-pay-bg);
    --f7-button-fill-bg-color: var(--rites-pay-bg);
    --f7-button-fill-text-color: var(--rites-pay-text);
  }

  .rites-select {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px;
    border-radius: 8px;
    background: var(--rites-card-bg);

    &__all {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px; // 12px;
      line-height: 16px;
      font-weight: 700;
      color: var(--rites-select-text);
      cursor: pointer;
    }

    &__remove.link {
      height: auto;
      padding: 0;
      font-size: 14px;
      line-height: 18px;
      font-weight: 400;
      text-decoration: underline;
      text-transform: none;
      letter-spacing: normal;
      color: var(--rites-select-link);

      &.disabled {
        opacity: 0.4;
      }
    }
  }

  .rites-table-head {
    display: none;
  }

  .rites-list {
    margin: 0;

    ul {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 0;
      background: none;

      &::before,
      &::after {
        display: none;
      }
    }
  }

  .rites-summary {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .rites-add.link {
    align-self: flex-start;
    justify-content: flex-start;
    gap: 16px;
    height: auto;
    padding: 0;
    font-size: 14px;
    line-height: 18px;
    font-weight: 400;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    color: var(--rites-text);
  }

  // Плюс в круге рисуем без иконки: две линии по центру
  .rites-add__icon {
    position: relative;
    flex: 0 0 38px;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--rites-accent);

    &::before,
    &::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 14px;
      height: 1.5px;
      background: var(--content-color-white-100);
      transform: translate(-50%, -50%);
    }

    &::after {
      transform: translate(-50%, -50%) rotate(90deg);
    }
  }

  .rites-total {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 14px 44px;
    border-radius: 10px;
    background: var(--rites-card-bg);
    box-shadow:
      0 10px 20px rgba(0, 0, 0, 0.04),
      0 2px 6px rgba(0, 0, 0, 0.04),
      0 0 1px rgba(0, 0, 0, 0.04);
    color: var(--rites-select-text);

    &__label {
      font-size: 16px;
      line-height: 20px;
      opacity: 0.7;
    }

    &__sum {
      font-size: 20px;
      line-height: 24px;
      font-weight: 700;
    }
  }

  .rites-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .rites-email {
    margin: 0;

    ul {
      padding: 0;
      background: none;

      &::before,
      &::after {
        display: none;
      }
    }

    li {
      padding: 0;
    }

    .item-content {
      margin: 0;
      padding: 0;

      // Убираем «filled»-подложку и подчёркивание Material: поле рисуем по макету
      &.item-input::before,
      &.item-input::after,
      &.item-input.item-input-with-value::after,
      &.item-input.item-input-focused::after {
        display: none;
      }
    }

    .item-inner {
      padding: 0;
    }

    .item-title.item-label {
      margin-bottom: 8px;
      font-size: 16px;
      line-height: 20px;
      font-weight: 700;
      color: var(--rites-text);
    }

    .item-input-wrap {
      margin: 0;
    }

    input {
      height: 54px;
      padding: 16px 24px;
      border: 1px solid var(--rites-field-border);
      border-radius: 8px;
      background: var(--rites-field-bg);
      font-size: 20px; // 16px;
      line-height: 24px; // 20px;
      color: var(--rites-text);

      &::placeholder {
        color: var(--rites-field-placeholder);
      }
    }

    .item-input-with-error-message input {
      border-color: var(--red-r-100);
    }

    .item-input-error-message {
      margin-top: 4px;
      font-size: 14px;
      line-height: 16px;
      color: var(--red-r-100);
    }
  }

  .rites-note {
    margin: 0;
    font-size: 14px; // 12px;
    line-height: 16px;
    color: var(--rites-note);
  }

  .rites-pay.button-fill {
    --f7-button-bg-color: var(--rites-pay-bg);
    --f7-button-fill-bg-color: var(--rites-pay-bg);
    --f7-button-fill-text-color: var(--rites-pay-text);

    border: 1px solid var(--rites-pay-border);
  }
}

@media (min-width: 744px) {
  .rites-page {
    --f7-navbar-large-title-font-size: 32px;
    --f7-navbar-large-title-line-height: 34px;

    .rites-cart {
      max-width: 924px;
      margin: 0 auto;
      padding: 30px;
      gap: 30px;
    }

    .rites-history .button,
    .rites-empty .button-outline {
      padding: 0 64px;
      font-size: 14px; // 12px;
      letter-spacing: 1.38px;
    }

    .rites-empty {
      padding: 20px;

      &__text {
        align-items: center;
        gap: 14px;
        padding: 0;
      }

      &__title {
        font-size: 34px;
        line-height: 38px;
      }

      &__hint {
        max-width: 430px;
        font-size: 16px;
        line-height: 20px;
      }
    }

    .rites-skeleton--select {
      height: 56px;
    }

    .rites-select {
      padding: 16px 18px;

      &__all {
        gap: 20px;
        font-size: 16px;
        line-height: 20px;
      }

      &__remove.link {
        font-size: 16px;
        line-height: 20px;
      }
    }

    // Шапка таблицы и разделитель под ней
    .rites-table-head {
      display: grid;
      grid-template-columns: var(--rites-grid-columns);
      column-gap: 10px;
      margin-bottom: -10px;
      padding: 0 14px 15px;
      border-bottom: 1px solid #d9d9d9;
      font-size: 14px;
      line-height: 18px;
      color: var(--rites-select-text);

      span {
        opacity: 0.7;
      }

      &__number {
        grid-column: 2;
        padding-left: 4px;
      }

      &__type {
        grid-column: 3;
      }

      &__period {
        grid-column: 4;
      }

      &__names {
        grid-column: 5;
        padding-left: 10px;
      }

      &__sum {
        grid-column: 6;
        text-align: right;
      }
    }

    .rites-list ul {
      gap: 15px;
    }

    .rites-summary {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .rites-add.link {
      padding: 0 8px;
    }

    .rites-total {
      padding: 24px 44px;
    }

    .rites-form {
      gap: 30px;
    }

    .rites-note {
      font-size: 14px;
      line-height: 18px;
    }
  }
}
</style>
