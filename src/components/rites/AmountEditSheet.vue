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
      <f7-button small fill class="rite-amount-sheet__apply" :disabled="!canApply" @click="apply">
        Применить
      </f7-button>
    </f7-toolbar>

    <div ref="fieldEl" class="rite-amount-sheet__body">
      <div class="rite-amount-sheet__field" :class="{ 'is-error': Boolean(visibleError) }">
        <f7-list no-hairlines>
          <f7-list-input
            type="text"
            name="sheet-donate"
            inputmode="numeric"
            placeholder="0"
            clear-button
            :value="draftText"
            @update:value="onDraft"
            @keydown.enter="onEnter"
          >
            <template #input>
              <span v-if="visibleError" class="rite-amount-sheet__error-icon" aria-hidden="true">
                <img src="@/assets/rite/input-error.svg" width="20" height="20" alt="" />
                <img class="is-hover" src="@/assets/rite/input-error-hover.svg" width="20" height="20" alt="" />
              </span>
              <span class="rite-amount-sheet__currency" aria-hidden="true">₽</span>
            </template>
          </f7-list-input>
        </f7-list>
      </div>

      <f7-chip class="rite-amount-sheet__chip" outline @click="useRecommended">
        Рекомендуемая сумма: {{ formatPrice(recommended) }} ₽
      </f7-chip>

      <p v-if="serverError" class="rite-amount-sheet__message">
        <!-- Сервер может прислать ссылку mailto -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-html="externalMailLinks(serverError.full || serverError.short)"></span>
      </p>
      <p v-else-if="clientError" class="rite-amount-sheet__message">{{ clientError.short }}</p>

      <div v-if="belowMin" class="rite-amount-sheet__alert" role="alert">
        <f7-icon f7="exclamationmark_circle_fill" aria-hidden="true" />
        <p>
          Мы не можем подать вашу записку в автоматическом режиме. Пожалуйста, напишите нам на
          <a class="external" :href="mailHref" target="_blank" rel="noopener">rites@valaam.ru</a>
        </p>
      </div>
    </div>
  </f7-sheet>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useSheetFocusScrollLock } from "@/composables/focusSheetInput";
import { useKeyboardInset } from "@/composables/useKeyboardInset";
import {
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
const fieldEl = ref<HTMLElement | null>(null);

const draftAmount = computed(() => parseDonate(draftText.value));
const clientError = computed(() => validateDonateAmount(draftAmount.value, minAmount));
const visibleError = computed(() => serverError ?? clientError.value);
const canApply = computed(() => clientError.value === null);
const belowMin = computed(() => draftAmount.value > 0 && draftAmount.value < minAmount);

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
  void nextTick(syncHint);
}

function syncHint(): void {
  fieldEl.value?.querySelector("input")?.setAttribute("enterkeyhint", "done");
  fieldEl.value?.querySelector("input")?.setAttribute("aria-label", "Сумма пожертвования");
}

function onDraft(value: string): void {
  draftText.value = value.replace(/\D/g, "");
  emit("clear-server-error");
}

function useRecommended(): void {
  draftText.value = recommended > 0 ? String(recommended) : "";
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
  --f7-input-height: 60px;
  --f7-input-font-size: 22px;
  --f7-input-padding-left: 24px;
  --f7-input-padding-right: 52px;
  --f7-input-text-color: var(--content-color-black-primary);
  --f7-input-placeholder-color: var(--content-color-black-60);
  padding-top: 32px;
  color: var(--content-color-black-primary);
  font-family: "PT Sans", sans-serif;

  &.sheet-modal {
    bottom: var(--rite-keyboard-inset, 0px);
    max-height: calc(100% - var(--rite-keyboard-inset, 0px));
  }

  &.sheet-modal.modal-in {
    display: flex;
    flex-direction: column;
  }

  .sheet-modal-inner {
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
    --f7-button-height: 32px;
    --f7-button-font-size: 14px;
    --f7-button-border-radius: 8px;
    width: auto;
    margin: 0;
  }

  &__body {
    padding: 8px 20px calc(20px + var(--f7-safe-area-bottom));
  }

  .list {
    margin: 0;
  }

  ul {
    padding: 0;
    background: none;

    &::before,
    &::after {
      display: none;
    }
  }

  .item-content,
  .item-inner {
    min-height: 0;
    margin: 0;
    padding: 0;

    &::before,
    &::after {
      display: none;
    }
  }

  .item-input-wrap {
    position: relative;
    margin: 0;
    border: 1px solid var(--content-color-black-20);
    border-radius: 8px;
    background: var(--content-color-white-100);
  }

  &__field:hover .item-input-wrap {
    border-color: var(--content-color-black-40);
  }

  &__field:focus-within .item-input-wrap {
    border-color: var(--content-color-black-60);
  }

  &__field.is-error .item-input-wrap,
  &__field.is-error:hover .item-input-wrap,
  &__field.is-error:focus-within .item-input-wrap {
    border-color: var(--red-r-100);
  }

  .list input[type="text"] {
    box-sizing: border-box;
    padding-top: 16px;
    padding-bottom: 16px;
    background: transparent;
    font-family: "PT Sans", sans-serif;
    font-size: 22px;
    line-height: 28px;
    font-weight: 400;
    color: var(--content-color-black-primary);

    &::placeholder {
      color: var(--content-color-black-60);
      opacity: 1;
    }
  }

  .item-input-with-value input {
    --f7-input-padding-right: 80px;
  }

  .is-error input {
    --f7-input-padding-right: 80px;
    color: var(--content-color-black-primary);
  }

  .is-error .item-input-with-value input {
    --f7-input-padding-right: 112px;
  }

  .input-clear-button {
    right: 20px;
  }

  .is-error .input-clear-button {
    right: 52px;
  }

  &__error-icon {
    position: absolute;
    top: 50%;
    right: 24px;
    width: 20px;
    height: 20px;
    margin-top: -10px;
    pointer-events: none;

    img {
      display: block;
      width: 20px;
      height: 20px;
    }

    .is-hover {
      display: none;
    }
  }

  &__field.is-error:hover &__error-icon {
    img {
      display: none;
    }

    .is-hover {
      display: block;
    }
  }

  &__currency {
    position: absolute;
    top: 50%;
    right: 24px;
    font-size: 22px;
    line-height: 28px;
    font-weight: 400;
    color: var(--content-color-black-primary);
    transform: translateY(-50%);
    pointer-events: none;
  }

  .item-input-with-value &__currency {
    right: 48px;
  }

  .is-error &__currency {
    right: 52px;
  }

  .is-error .item-input-with-value &__currency {
    right: 80px;
  }

  &__chip {
    margin-top: 12px;
  }

  &__message {
    margin: 8px 0 0;
    font-size: 16px;
    line-height: 1.3;
    color: var(--red-r-100);

    a {
      color: var(--brand-color-primary-accent-50);
    }
  }

  &__alert {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(235, 87, 87, 0.12);
    font-size: 14px;
    line-height: 18px;

    .icon {
      flex: none;
      font-size: 18px;
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
