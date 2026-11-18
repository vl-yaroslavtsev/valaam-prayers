<template>
  <f7-sheet
    v-model:opened="opened"
    class="rite-amount-sheet"
    bottom
    backdrop
    backdrop-el=".rite-popup .rite-sheet-backdrop"
    close-by-backdrop-click
    swipe-to-close
    swipe-handler=".swipe-handler"
    :style="{ '--rite-keyboard-inset': `${inset}px` }"
    @sheet:open="fillDraft"
  >
    <div class="swipe-handler"></div>
    <f7-toolbar class="rite-amount-sheet__toolbar" :outline="false">
      <span class="rite-amount-sheet__title">Сумма пожертвования</span>
      <f7-button fill round small type="button" class="rite-amount-sheet__apply" :disabled="!canApply" @click="apply">
        Применить
      </f7-button>
    </f7-toolbar>

    <div class="rite-amount-sheet__body">
      <div class="rite-amount-sheet__field">
        <f7-list no-hairlines inset>
          <f7-list-input :input="false" :value="draftText" :class="{ 'item-input-invalid': inputInvalid }">
            <template #input>
              <div class="rite-amount-sheet__value" @click="focusInput">
                <input
                  ref="inputRef"
                  class="rite-amount-sheet__input"
                  type="text"
                  name="sheet-donate"
                  inputmode="numeric"
                  enterkeyhint="done"
                  autocomplete="off"
                  aria-label="Сумма пожертвования"
                  :placeholder="amountPlaceholder"
                  :value="draftDisplay"
                  :style="{ width: inputWidth }"
                  @input="onInput"
                  @keydown.enter="onEnter"
                />
                <span v-if="draftText" class="rite-amount-sheet__currency" aria-hidden="true">&nbsp;₽</span>
                <span class="input-clear-button" :class="{ 'is-on': draftText }" @click.stop="clearDraft"></span>
              </div>
            </template>
          </f7-list-input>
        </f7-list>
        <div class="rite-amount-sheet__notice">
          <f7-block
            class="rite-amount-sheet__message"
            :class="{ 'is-error': fieldError, 'is-hidden': showAlert }"
            :aria-hidden="showAlert ? true : undefined"
          >
            <f7-icon
              v-if="fieldError"
              class="rite-amount-sheet__error-icon"
              f7="exclamationmark_circle_fill"
              aria-hidden="true"
            />
            <!-- Сервер может прислать ссылку mailto -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-if="fieldError && serverError" v-html="externalMailLinks(serverError.full || serverError.short)"></span>
            <span v-else-if="fieldError">{{ fieldError.full }}</span>
            <span v-else>Укажите любую посильную сумму от {{ formatPrice(minAmount) }} ₽</span>
          </f7-block>
          <div
            class="rite-amount-sheet__alert"
            :class="{ 'is-reserved': !showAlert }"
            :role="showAlert ? 'alert' : undefined"
            :aria-hidden="showAlert ? undefined : true"
          >
            <f7-icon f7="exclamationmark_circle_fill" aria-hidden="true" />
            <p>
              Мы не можем подать вашу записку в автоматическом режиме. Пожалуйста, напишите нам на
              <a class="external" :href="mailHref" target="_blank" rel="noopener" :tabindex="showAlert ? undefined : -1">rites@valaam.ru</a>
            </p>
          </div>
        </div>
      </div>

      <!--
      <f7-block class="rite-amount-sheet__recommend">
        <f7-chip class="rite-amount-sheet__chip" outline @click="useAmount(recommended)">
          Рекомендуемая: {{ formatPrice(recommended) }} ₽
        </f7-chip>
        <f7-chip
          v-if="halfAmount > 0"
          class="rite-amount-sheet__chip"
          outline
          @click="useAmount(halfAmount)"
        >
          {{ formatPrice(halfAmount) }} ₽
        </f7-chip>
        <f7-chip
          v-if="minAmount > 0"
          class="rite-amount-sheet__chip"
          outline
          @click="useAmount(minAmount)"
        >
          {{ formatPrice(minAmount) }} ₽
        </f7-chip>
      </f7-block>
      -->
    </div>
  </f7-sheet>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { focusSheetInput, useSheetFocusScrollLock } from "@/composables/focusSheetInput";
import { useKeyboardInset } from "@/composables/useKeyboardInset";
import {
  DONATE_BELOW_MIN,
  externalMailLinks,
  formatNoteRow,
  parseDonate,
  validateDonateAmount,
  type FieldError,
  type NoteRowItem,
} from "@/services/rites/riteForm";
import { formatPrice } from "@/services/rites/ritesFormat";

const opened = defineModel<boolean>("opened", { default: false });

const { amount, recommended, minAmount, serverError = null, kindName, typeName, rows } = defineProps<{
  /** Сумма на бланке, из неё заполняется черновик */
  amount: number;
  recommended: number;
  minAmount: number;
  serverError?: FieldError | null;
  kindName: string;
  typeName: string;
  rows: NoteRowItem[];
}>();

const emit = defineEmits<{
  apply: [amount: number];
  "clear-server-error": [];
}>();

const inset = useKeyboardInset();
useSheetFocusScrollLock();
const draftText = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

const amountPlaceholder = computed(() => `Рекомендуемая: ${formatPrice(recommended)} ₽`);
const draftAmount = computed(() => parseDonate(draftText.value));
const draftDisplay = computed(() => (draftText.value ? formatPrice(draftAmount.value) : ""));
const inputWidth = computed(() => {
  const text = draftDisplay.value || amountPlaceholder.value;
  if (!draftDisplay.value) return `${Math.max(text.length, 1)}ch`;
  const gaps = (text.match(/\s/g) ?? []).length;
  const solids = Math.max(text.length - gaps, 1);
  return gaps ? `calc(${solids}ch + ${gaps * 0.5}ch)` : `${solids}ch`;
});
const clientError = computed(() => validateDonateAmount(draftAmount.value, minAmount));
/** «Сумма меньше минимальной» не показываем: об этом говорит alert ниже */
const fieldError = computed(() => {
  if (serverError) return serverError;
  const error = clientError.value;
  return error && error !== DONATE_BELOW_MIN ? error : null;
});
const inputInvalid = computed(() => Boolean(serverError || clientError.value));
const canApply = computed(() => clientError.value === null);
const belowMin = computed(() => draftAmount.value > 0 && draftAmount.value < minAmount);
const showAlert = computed(() => belowMin.value && !fieldError.value);
const halfAmount = computed(() => Math.floor(recommended / 2));

const mailHref = computed(() => {
  const names = rows.map((row) => formatNoteRow(row)).filter(Boolean);
  const body = [
    `Вид записки: ${kindName}`,
    `Поминовение: ${typeName}`,
    "Имена:",
    names.length ? names.join("\n") : "—",
    `Сумма: ${draftAmount.value}`,
  ].join("\n");
  return `mailto:rites@valaam.ru?subject=${encodeURIComponent("Записка с суммой меньше минимальной")}&body=${encodeURIComponent(body)}`;
});

function fillDraft(): void {
  draftText.value = amount > 0 ? String(amount) : "";
}

function focusInput(event: MouseEvent): void {
  const target = event.target;
  if (target instanceof HTMLInputElement) return;
  if (target instanceof Element && target.closest(".input-clear-button")) return;
  focusSheetInput(inputRef.value);
}

function onInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  const value = input.value.replace(/\D/g, "");
  if (input.value !== value) input.value = value;
  draftText.value = value;
  emit("clear-server-error");
}

function clearDraft(): void {
  draftText.value = "";
  emit("clear-server-error");
  focusSheetInput(inputRef.value);
}

function useAmount(value: number): void {
  draftText.value = value > 0 ? String(value) : "";
  emit("clear-server-error");
}

function apply(): void {
  if (!canApply.value) return;
  emit("apply", draftAmount.value);
  opened.value = false;
}

function onEnter(event: KeyboardEvent): void {
  event.preventDefault();
  apply();
}
</script>

<style lang="less">
.rite-amount-sheet {
  --f7-sheet-height: auto;
  --f7-toolbar-height: 60px;
  --f7-toolbar-inner-padding-left: 16px;
  --f7-toolbar-inner-padding-right: 16px;
  --f7-input-font-size: 20px;
  --f7-input-item-bg-color: var(--content-color-white-100);
  --f7-input-item-border-radius: 8px 8px 0 0;
  --f7-input-text-color: var(--content-color-black-primary);
  --f7-input-placeholder-color: var(--content-color-black-60);
  --f7-input-invalid-border-color: var(--red-r-100);
  --f7-input-clear-button-color: rgba(31, 27, 26, 0.45);
  color: var(--content-color-black-primary);
  font-family: "PT Sans", sans-serif;

  &.sheet-modal {
    bottom: var(--rite-keyboard-inset, 0px);
    max-height: calc(100% - var(--rite-keyboard-inset, 0px) - var(--f7-safe-area-top));
  }

  &.sheet-modal.modal-in {
    display: flex;
    flex-direction: column;
  }

  .sheet-modal-inner {
    display: flex;
    flex: 1;
    flex-direction: column;
    height: auto;
    min-height: 0;
    overflow: visible;
  }

  .swipe-handler {
    top: calc(-1 * var(--f7-toolbar-height));
  }

  &__toolbar {
    flex: none;

    .toolbar-inner {
      justify-content: space-between;
      gap: 12px;
      padding-top: 24px;
    }
  }

  &__title {
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
  }

  &__apply.button {
    width: auto;
    margin: 0;
  }

  &__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 calc(12px + var(--f7-safe-area-bottom));
  }

  .list {
    margin-top: 0;
    margin-bottom: 0;
  }

  .item-input .item-content,
  .item-input.item-content {
    margin-left: 0;
    margin-right: 0;
  }

  li.item-input-invalid .item-content::after {
    background: var(--red-r-100) !important;
    transform: scaleY(2) !important;
  }

  &__value {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    min-height: var(--f7-input-height);
    cursor: text;
  }

  &__input {
    flex: none;
    box-sizing: content-box;
    min-width: 1ch;
    max-width: calc(100% - 48px);
    margin: 0;
    padding: 0;
    border: none;
    outline: none;
    background: transparent;
    box-shadow: none;
    font-family: "PT Sans", sans-serif;
    font-size: 20px;
    line-height: 28px;
    color: var(--content-color-black-primary);

    &::placeholder {
      color: var(--content-color-black-60);
      opacity: 1;
    }
  }

  &__currency {
    flex: none;
    font-size: 20px;
    line-height: 28px;
    color: var(--content-color-black-primary);
    pointer-events: none;
  }

  &__value .input-clear-button {
    top: 50%;
    right: 0;
    margin-top: calc(-1 * var(--f7-input-clear-button-size) / 2);
    display: none;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;

    &.is-on {
      display: block;
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }
  }

  &__notice {
    display: grid;

    > .rite-amount-sheet__message,
    > .rite-amount-sheet__alert {
      grid-area: 1 / 1;
      align-self: start;
    }
  }

  &__message.block {
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 16px;
    line-height: 1.3;
    color: var(--content-color-black-60);

    &.is-error {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      color: var(--red-r-100);
    }

    &.is-hidden {
      visibility: hidden;
    }

    a {
      color: var(--brand-color-primary-accent-50);
    }
  }

  &__error-icon.icon {
    flex: none;
    margin-top: 2px;
    font-size: 20px;
    color: var(--red-r-100);
  }

  &__recommend.block {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
    margin-bottom: 0;
  }

  &__chip.chip {
    --f7-chip-outline-border-color: var(--content-color-black-20);
    --f7-chip-text-color: var(--content-color-black-primary);
    margin: 0;
    color: var(--content-color-black-primary);
  }

  &__alert {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 0 16px;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(235, 87, 87, 0.12);
    font-size: 16px;
    line-height: 18px;
    color: var(--content-color-black-primary);

    // Текст всегда в вёрстке: появление предупреждения не меняет высоту шторки
    &.is-reserved {
      visibility: hidden;
    }

    .icon {
      flex: none;
      font-size: 20px;
      color: var(--red-r-100);
    }

    p {
      margin: 0;
    }

    a {
      color: var(--brand-color-primary-accent-50);
      text-decoration: underline;
    }
  }
}
</style>
