<template>
  <f7-page
    ref="pageRef"
    name="rites"
    class="rites-page"
    :page-content="false"
    @page:beforein="onPageBeforeIn"
    @page:afterin="onPageShown"
    @page:tabshow="onPageShown"
    @page:beforeout="onPageHidden"
    @page:tabhide="onPageHidden"
  >
    <f7-navbar no-hairline>
      <f7-nav-left :back-link="!isFirstPage">
        <f7-link v-if="isFirstPage" panel-open="left" v-html="BurgerIcon"></f7-link>
      </f7-nav-left>
      <f7-nav-title>Записки</f7-nav-title>
      <f7-nav-right v-if="activeTab === 'history' && historyNav.showControls">
        <div
          class="history-nav-actions"
          :class="{ 'history-nav-actions--visible': historyNav.showNavActions }"
        >
          <f7-link
            icon-only
            class="history-nav-action ripple-blur"
            :tabindex="historyNav.showNavActions ? 0 : -1"
            aria-label="Фильтры"
            aria-haspopup="dialog"
            @click="historyTabRef?.openFilters()"
          >
            <SvgIcon icon="sliders" :size="24" :color="navIconColor" />
            <span
              v-if="historyNav.isFilterActive"
              class="history-nav-action__dot"
              aria-hidden="true"
            ></span>
          </f7-link>
          <f7-link
            icon-only
            class="history-nav-action ripple-blur"
            :tabindex="historyNav.showNavActions ? 0 : -1"
            popover-open=".history-order-popover"
            :aria-label="`Сортировка: ${historyNav.currentOrderLabel}`"
            aria-haspopup="listbox"
          >
            <SvgIcon icon="arrow-up-down" :size="24" :color="navIconColor" />
          </f7-link>
        </div>
      </f7-nav-right>
    </f7-navbar>

    <f7-toolbar ref="tabbarRef" tabbar top class="rites-tabbar">
      <f7-link
        tab-link
        :href="false"
        class="rites-tabbar__link"
        :tab-link-active="activeTab === 'cart'"
        @click="selectTab('cart')"
      >
        <span>В корзине</span>
        <f7-badge v-if="store.items.length > 0" class="rites-tabbar__badge">
          {{ store.items.length }}
        </f7-badge>
      </f7-link>
      <f7-link
        tab-link
        :href="false"
        class="rites-tabbar__link"
        :tab-link-active="activeTab === 'history'"
        @click="selectTab('history')"
      >
        <span>Поданные</span>
      </f7-link>
    </f7-toolbar>

    <f7-page-content v-show="activeTab === 'cart'" class="rites-tab-content">
      <div class="rites-cart" :class="{ 'rites-cart--empty': isEmpty }">
        <!-- Загрузка корзины -->
        <div v-if="!store.isLoaded && !store.loadError" class="rites-state" aria-busy="true">
          <f7-skeleton-block class="rites-skeleton rites-skeleton--select" effect="wave" />
          <f7-skeleton-block class="rites-skeleton rites-skeleton--card" effect="wave" />
          <f7-skeleton-block class="rites-skeleton rites-skeleton--card" effect="wave" />
        </div>

        <!-- Ошибка загрузки -->
        <div v-else-if="store.loadError" class="rites-state rites-state--center">
          <p class="rites-state__text">{{ store.loadError }}</p>
          <f7-button
            outline
            large
            :preloader="store.isLoading"
            :loading="store.isLoading"
            :disabled="store.isLoading"
            @click="refreshCart()"
          >
            Повторить
          </f7-button>
        </div>

        <!-- Пустая корзина -->
        <div v-else-if="isEmpty" class="rites-empty">
          <div class="rites-empty__text">
            <p class="rites-empty__title">Корзина записок пуста</p>
            <p class="rites-empty__hint">
              Заполните форму подачи записки, и она появится здесь.
            </p>
          </div>
          <div class="rites-empty__actions">
            <f7-button fill large @click="openPopup('create')">
              Подать записку
            </f7-button>
          </div>
        </div>

        <!-- Корзина -->
        <template v-else>
          <div class="rites-items">
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
              <span class="rites-table-head__names">Имена</span>
              <span class="rites-table-head__period">Период</span>
              <span class="rites-table-head__sum">Сумма</span>
            </div>

            <f7-list class="rites-list" no-hairlines no-hairlines-between>
              <template #list>
                <!-- Без tag: список остаётся прямым потомком ul, а удаление и возврат записки анимируются хуками -->
                <TransitionGroup
                  :css="false"
                  @before-enter="handleItemBeforeEnter"
                  @enter="handleItemEnter"
                  @leave="onItemLeave"
                >
                  <RitesCartItem
                    v-for="item in store.items"
                    :key="item.id"
                    :item="item"
                    :pending="store.isPendingPayment(item.id)"
                    @toggle="toggleItem(item, $event)"
                    @edit="openPopup('edit', item, 'cart')"
                    @copy="openPopup('copy', item, 'cart')"
                    @remove="store.removeItems([item.id])"
                  />
                </TransitionGroup>
              </template>
            </f7-list>
          </div>

          <form class="rites-form" novalidate @submit.prevent="onPay">
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

            <div class="rites-email-group">
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
            </div>

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
    </f7-page-content>

    <f7-page-content
      v-show="activeTab === 'history'"
      class="rites-tab-content"
      infinite
      :infinite-distance="200"
      :infinite-preloader="historyNav.hasMore"
      @infinite="historyTabRef?.loadMore()"
    >
      <RitesHistoryTab
        ref="historyTabRef"
        :active="activeTab === 'history'"
        @create="openPopup('create')"
        @edit="openPopup('edit', $event, 'history')"
        @copy="openPopup('copy', $event, 'history')"
        @nav-state="historyNav = $event"
      />
    </f7-page-content>

    <RitePopup
      v-model:opened="popupOpened"
      :mode="popupMode"
      :item="popupItem"
      :resolve-source-el="popupSourceResolver"
      @saved="onRiteSaved"
    />
  </f7-page>
</template>

<script setup lang="ts">
import { f7 } from "framework7-vue";
import type { Dialog, Router, Toast } from "framework7/types";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import BurgerIcon from "@/assets/icons/burger.svg?raw";
import SvgIcon from "@/components/SvgIcon.vue";
import RitePopup, { type RitePopupMode } from "@/components/rites/RitePopup.vue";
import RitesCartItem from "@/components/rites/RitesCartItem.vue";
import RitesHistoryTab, { type HistoryNavState } from "@/components/rites/RitesHistoryTab.vue";
import { useTheme } from "@/composables/useTheme";
import {
  getSavedEmail,
  rememberConfirmedEmail,
  saveEmail,
  type ApiErrors,
  type Rite,
} from "@/services/rites/ritesApi";
import { onItemBeforeEnter, onItemEnter, onItemLeave } from "@/services/rites/collapseTransition";
import { preloadRiteFormDirectory } from "@/services/rites/ritesDirectory";
import { closeOpenToast, syncUndoToast } from "@/services/rites/undoToast";
import { formatPrice, isValidEmail } from "@/services/rites/ritesFormat";
import {
  parsePaymentErrors,
  payRites,
  prepareRitesPayment,
} from "@/services/rites/ritesPayment";
import {
  ERROR_VISIBLE_MS,
  useRitesCartStore,
  type CartItem,
  type RitesTab,
} from "@/stores/ritesCart";

const { f7router, f7route } = defineProps<{
  f7router: Router.Router;
  f7route: Router.Route;
}>();

// Ссылка может открыть страницу с ?EMAIL=: запоминаем до первого чтения поля
rememberConfirmedEmail(f7route.query.EMAIL);

const store = useRitesCartStore();
const { isDarkMode } = useTheme();
const navIconColor = computed(() => (isDarkMode.value ? "white" : "black-primary"));

if (f7route.path === "/rites/my/") {
  store.setActiveTab("history");
}

const activeTab = computed(() => store.activeTab);
const tabbarRef = ref<{ $el?: HTMLElement } | null>(null);
const historyTabRef = ref<InstanceType<typeof RitesHistoryTab> | null>(null);
const historyNav = ref<HistoryNavState>({
  showControls: false,
  showNavActions: false,
  isFilterActive: false,
  currentOrderLabel: "Сначала новые",
  hasMore: false,
});

function syncTabHighlight(): void {
  const tabbarEl = tabbarRef.value?.$el;
  if (tabbarEl) {
    f7.toolbar.setHighlight(tabbarEl);
  }
}

function toggleItem(item: CartItem, checked: boolean): void {
  if (!store.isPendingPayment(item.id)) {
    item.checked = checked;
  }
}

function selectTab(tab: RitesTab): void {
  store.setActiveTab(tab);
}

watch(activeTab, (tab) => {
  void nextTick(syncTabHighlight);
  if (tab === "history") {
    historyTabRef.value?.refresh();
  }
});

const isEmpty = computed(
  () => store.isLoaded && !store.loadError && store.items.length === 0,
);

// Корневая страница вкладки открывает левую панель, открытая из панели — кнопку «Назад»
const isFirstPage = ref(true);
// Страница на экране: возврат в приложение обновляет данные только на ней
const isActive = ref(false);
const onPageBeforeIn = () => {
  isFirstPage.value = f7router.history.length <= 1;
};

const email = ref(getSavedEmail());
const emailError = ref(false);
const emailErrorText = ref("");
const isSubmitting = ref(false);

const pageRef = ref<{ $el?: HTMLElement } | null>(null);
const popupOpened = ref(false);
const popupMode = ref<RitePopupMode>("create");
const popupItem = ref<Rite | null>(null);
const popupSource = ref<RitesTab>("cart");
const popupSourceResolver = ref<(() => HTMLElement | null) | null>(null);
/** Новая записка, в которую прямо сейчас свернётся попап: не анимируем её повторно через collapseTransition */
let skipEnterRiteId: number | null = null;

function handleItemBeforeEnter(el: Element): void {
  if (Number((el as HTMLElement).dataset.riteId) === skipEnterRiteId) return;
  onItemBeforeEnter(el);
}

function handleItemEnter(el: Element, done: () => void): void {
  if (Number((el as HTMLElement).dataset.riteId) === skipEnterRiteId) {
    skipEnterRiteId = null;
    done();
    return;
  }
  onItemEnter(el, done);
}

function findRiteCard(source: RitesTab, id: number): HTMLElement | null {
  const root = pageRef.value?.$el ?? document;
  const listSelector = source === "cart" ? ".rites-list" : ".history-list";
  return root.querySelector<HTMLElement>(`${listSelector} [data-rite-id="${id}"]`);
}

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

function showDatesUpdatedToast(numbers: string[]): void {
  let text = "Мы изменили даты записок на актуальные";
  // if (numbers.length === 1) {
  //   text = `Мы изменили дату записки №${numbers[0]} на актуальную`;
  // } else if (numbers.length > 1) {
  //   text = `Мы изменили даты записок (${numbers.map((num) => `№${num}`).join(", ")}) на актуальные`;
  // }

  if (numbers.length === 1) {
    text = `Мы изменили дату записки на актуальную`;
  }
  datesToast?.destroy();
  datesToast = f7.toast.create({
    text,
    position: "bottom",
    closeTimeout: DATES_TOAST_MS,
    destroyOnClose: true,
  });
  datesToast.open();
}

/** Обновляет корзину и пересчитывает устаревшие даты записок */
async function refreshCart(): Promise<void> {
  await store.load();
  const changed = await store.validateAndFixDates();
  if (changed === 0) return;
  showDatesUpdatedToast(store.lastFixedDateNumbers);
}

function onPageShown(): void {
  isActive.value = true;
  const emailChanged = rememberConfirmedEmail(f7route.query.EMAIL);
  if (!email.value.trim()) email.value = getSavedEmail();
  if (emailChanged) historyTabRef.value?.invalidate();
  if (store.pendingDeleted.length > 0) {
    undoToast = syncUndoToast(undoToast, store.pendingDeleted.length, openUndoToast);
  }
  void refreshCart();
  void prepareRitesPayment();
  preloadRiteFormDirectory();
  void nextTick(syncTabHighlight);
  if (activeTab.value === "history") {
    historyTabRef.value?.refresh();
  }
}

function onPageHidden(): void {
  isActive.value = false;
  closeOpenToast(undoToast);
  undoToast = null;
}

function openPopup(
  mode: RitePopupMode,
  item: Rite | null = null,
  source: RitesTab = activeTab.value,
): void {
  popupMode.value = mode;
  popupItem.value = item;
  popupSource.value = source;
  popupSourceResolver.value =
    mode !== "create" && item ? () => findRiteCard(source, item.id) : null;
  popupOpened.value = true;
}

function onRiteSaved(rite: Rite): void {
  if (popupMode.value === "edit") {
    if (popupSource.value === "history") {
      historyTabRef.value?.applyEdited(rite);
    } else {
      store.updateItem(rite);
    }
    return;
  }

  // Новая записка (создание, дублирование в корзине или «Подать ещё раз» из истории):
  // переключаемся на корзину и сворачиваем попап прямо в добавленную карточку
  skipEnterRiteId = rite.id;
  store.addItem(rite);
  store.setActiveTab("cart");
  popupSourceResolver.value = () => findRiteCard("cart", rite.id);
  // Если корзина была пустой, TransitionGroup монтируется с нуля и enter-хук не вызовется — сбрасываем флаг
  void nextTick(() => {
    if (skipEnterRiteId === rite.id) skipEnterRiteId = null;
  });
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

let processingText = "";

function setProcessing(active: boolean, text = "Отправляем записки..."): void {
  if (active && processingDialog && processingText === text) return;
  processingDialog?.close();
  processingText = active ? text : "";
  processingDialog = active ? f7.dialog.preloader(text) : null;
}

function focusEmail(): void {
  void nextTick(() => {
    const root = pageRef.value?.$el ?? document;
    root.querySelector<HTMLInputElement>("input[name='email']")?.focus();
  });
}

function setEmailError(text: string): void {
  emailError.value = true;
  emailErrorText.value = text;
  focusEmail();
}

/** Раскладывает ошибки сервера: email к полю, rite-<id> к записке, остальное в общий список */
function applyPaymentErrors(errors: ApiErrors | null | undefined): string[] {
  const parsed = parsePaymentErrors(
    errors,
    store.items.map((item) => item.id),
  );
  if (parsed.emailError) {
    setEmailError(parsed.emailError);
  }
  for (const [riteId, itemErrors] of parsed.riteErrors) {
    const item = store.items.find((candidate) => candidate.id === riteId);
    if (item) item.errors.push(...itemErrors);
  }
  return parsed.general;
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
    // Проверяем актуальность дат перед оплатой (например, если страница открыта через полночь МСК)
    await store.validateAndFixDates();
    const selectedSet = new Set(ids);
    const fixedSelectedIds = store.lastFixedDateIds.filter((id) => selectedSet.has(id));
    if (fixedSelectedIds.length > 0) {
      const numbers = store.items
        .filter((item) => fixedSelectedIds.includes(item.id))
        .map((item) => item.number);
      showDatesUpdatedToast(numbers);
      return;
    }
    const failedSelectedIds = store.lastFailedDateIds.filter((id) => selectedSet.has(id));
    if (failedSelectedIds.length > 0) {
      showError("Не удалось обновить устаревшие даты записок. Попробуйте ещё раз");
      return;
    }

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
        void store.load();
        f7.dialog.alert(
          "Спасибо! Записки приняты, пожертвование оформлено.",
          "Пожертвование",
          () => {
            historyTabRef.value?.resetForNewest(ids);
            store.setActiveTab("history");
          },
        );
        break;
      case "pending":
        saveEmail(trimmedEmail);
        store.markPendingPayment(ids);
        historyTabRef.value?.invalidate();
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
        store.scheduleClearErrors(ERROR_VISIBLE_MS);
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
    if (!isSubmitting.value) {
      void store.commitRemoval({ keepalive: true });
    }
  } else if (isActive.value) {
    // Вернулись в приложение, возможно на следующий день: даты могли устареть
    void refreshCart();
    if (activeTab.value === "history") {
      historyTabRef.value?.refresh({ force: true });
    } else {
      historyTabRef.value?.invalidate();
    }
  }
};

onMounted(() => {
  document.addEventListener("visibilitychange", onVisibilityChange);
  void nextTick(syncTabHighlight);
});

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisibilityChange);
  void store.commitRemoval({ keepalive: true });
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
  --rites-divider: var(--content-color-black-20);//var(--content-color-black-10);
  --rites-accent: var(--brand-color-primary-accent-50);
  --rites-note: rgba(0, 0, 0, 0.5);
  --rites-field-border: var(--content-color-black-20);
  --rites-field-bg: var(--content-color-white-100);
  --rites-field-placeholder: var(--content-color-black-60);
  --rites-select-text: #333;
  --rites-select-link: var(--content-color-black-60);
  --rites-empty-bg: var(--content-color-white-100);
  --rites-empty-hint: var(--content-color-black-60);
  // Колонки таблицы на планшете: чекбокс, номер, поминовение, имена, период, сумма, три иконки
  --rites-grid-columns: 24px 70px minmax(0, 1.5fr) minmax(0, 1.5fr) 95px 80px 24px 24px 24px;
}

.dark .rites-page {
  --rites-bg: var(--content-color-black-primary);
  --rites-card-bg: var(--content-color-black-secondary);
  --rites-text: var(--content-color-white-100);
  --rites-text-secondary: var(--content-color-white-100);
  --rites-muted: var(--content-color-baige-40);
  --rites-divider: var(--content-color-baige-20);//var(--content-color-baige-10);
  --rites-accent: var(--brand-color-primary-accent-70);
  --rites-note: var(--content-color-baige-40);
  --rites-field-border: var(--content-color-baige-30);
  --rites-field-bg: var(--content-color-black-secondary);
  --rites-field-placeholder: var(--content-color-baige-60);
  --rites-select-text: var(--content-color-baige-90);
  --rites-select-link: var(--content-color-baige-60);
  --rites-empty-bg: var(--content-color-black-secondary);
  --rites-empty-hint: var(--content-color-baige-60);
}

.rites-page {
  --f7-navbar-bg-color: var(--rites-bg);
  --f7-navbar-border-color: transparent;

  .navbar .title {
    //font-weight: 700;
  }

  .history-nav-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transform: translateY(-4px) scale(0.92);
    pointer-events: none;
    transition: opacity 180ms ease, transform 180ms ease;

    &--visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
  }

  .history-nav-action.link {
    position: relative;
    width: 40px;
    height: 40px;
    padding: 0;
    overflow: hidden;
    border-radius: 50%;
  }

  .history-nav-action__dot {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--rites-accent);
  }

  .rites-tabbar {
    --f7-toolbar-height: 48px;
    --f7-toolbar-bg-color: var(--rites-bg);
    --f7-toolbar-border-color: var(--rites-divider);
    --f7-tabbar-link-text-transform: none;
    --f7-tabbar-link-letter-spacing: normal;
    --f7-tabbar-link-font-weight: 600;
    --f7-tabbar-link-inactive-color: var(--rites-muted);
    --f7-tabbar-link-active-color: var(--rites-text);
    --f7-tabbar-link-active-border-color: var(--rites-accent);

    // border-bottom: 1px solid var(--rites-divider);

    .toolbar-inner {
      padding: 0;
    }

    &.tabbar:not(.tabbar-icons) .tab-link-highlight {
      height: 3px;
      border-radius: 3px 3px 0 0;
      background: var(--rites-accent);
    }

    &__link.tab-link {
      position: relative;
      flex-direction: row;
      gap: 6px;
      height: 100%;
      min-height: 0;
      // font-size: 15px;
      // line-height: 20px;

      &.tab-link-active {
        font-weight: 700;
      }
    }

    &__badge {
      --f7-badge-bg-color: var(--button-tonal-light-bg);
      --f7-badge-text-color: var(--button-tonal-light-text);
      --f7-badge-font-weight: 700;

      margin-left: 0;
    }

    .tab-link-active .rites-tabbar__badge {
      --f7-badge-bg-color: var(--rites-accent);
      --f7-badge-text-color: var(--f7-button-fill-text-color);
    }
  }

  .rites-tab-content {
    --f7-toolbar-height: 48px;
  }

  .rites-cart {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 16px 16px 30px;
    color: var(--rites-text);
  }

  .rites-items {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .rites-state {
    display: flex;
    flex-direction: column;
    gap: 16px;

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
    border-radius: 16px;

    &--select {
      height: 44px;
    }

    &--card {
      height: 190px;
    }
  }

  // Пустая корзина: карточка с текстом и кнопкой
  .rites-cart--empty {
    padding: 24px 16px 30px;
  }

  .rites-empty {
    display: flex;
    flex-direction: column;
    gap: 40px;
    padding: 16px;
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

  .rites-state .button-outline,
  .rites-empty .button-outline {
    --f7-button-border-color: var(--rites-text);
    --f7-button-text-color: var(--rites-text);
    --f7-button-border-width: 1px;
  }

  .rites-select {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-radius: 16px;
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
      gap: 16px;
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
      background: var(--f7-button-fill-text-color);
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
    gap: 30px;
  }

  .rites-email-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
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
}

.dark .rites-page {
  .rites-tabbar__badge {
    --f7-badge-bg-color: var(--button-tonal-dark-bg);
    --f7-badge-text-color: var(--button-tonal-dark-text);
  }
}

@media (min-width: 744px) {
  .rites-page {
    .rites-tabbar .toolbar-inner {
      right: 0;
      max-width: 924px;
      margin: 0 auto;
      padding: 0;
    }

    .rites-cart {
      max-width: 924px;
      margin: 0 auto;
      padding: 24px 30px 30px;
      gap: 20px;
    }

    .rites-items {
      gap: 24px;
    }

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

      &__names {
        grid-column: 4;
      }

      &__period {
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

    .rites-note {
      font-size: 14px;
      line-height: 18px;
    }
  }
}
</style>
