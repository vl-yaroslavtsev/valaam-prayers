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

    <div ref="fieldEl" class="rite-amount-sheet__body">
      <div class="rite-amount-sheet__field">
        <f7-list no-hairlines inset>
          <f7-list-input
            type="text"
            name="sheet-donate"
            inputmode="numeric"
            placeholder="0"
            clear-button
            :class="{ 'item-input-invalid': Boolean(visibleError) }"
            :value="draftText"
            @update:value="onDraft"
            @keydown.enter="onEnter"
          >
            <template #input>
              <span class="rite-amount-sheet__currency" aria-hidden="true">₽</span>
            </template>
          </f7-list-input>
        </f7-list>
        <f7-block class="rite-amount-sheet__note">Сумму можно изменить</f7-block>
        <f7-block v-if="visibleError" class="rite-amount-sheet__message is-error">
          <f7-icon
            class="rite-amount-sheet__error-icon"
            f7="exclamationmark_circle_fill"
            aria-hidden="true"
          />
          <!-- Сервер может прислать ссылку mailto -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-if="serverError" v-html="externalMailLinks(serverError.full || serverError.short)"></span>
          <span v-else>{{ clientError?.short }}</span>
        </f7-block>
      </div>

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

  .list input[type="text"] {
    box-sizing: border-box;
    padding-right: 28px;
    font-family: "PT Sans", sans-serif;
    font-size: 20px;
    line-height: 28px;
    color: var(--content-color-black-primary);

    text-align: right;

    &::placeholder {
      color: var(--content-color-black-60);
      opacity: 1;
    }
  }

  .item-input-with-value input[type="text"] {
    padding-right: 56px;
  }

  &__currency {
    position: absolute;
    z-index: 1;
    top: 50%;
    right: 0;
    font-size: 20px;
    line-height: 28px;
    color: var(--content-color-black-primary);
    transform: translateY(-50%);
    pointer-events: none;
  }

  .item-input-with-value &__currency {
    right: 28px;
  }

  &__message.block {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 16px;
    line-height: 1.3;
    color: var(--red-r-100);

    a {
      color: var(--brand-color-primary-accent-50);
    }
  }

  &__error-icon.icon {
    flex: none;
    margin-top: 2px;
    font-size: 22px;
    color: var(--red-r-100);
  }

  &__note.block {
    margin-top: 0;
    margin-bottom: 0;
    font-size: 16px;
    line-height: 1.3;
    color: var(--content-color-black-60);
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
    margin: 12px 16px 0;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(235, 87, 87, 0.12);
    font-size: 14px;
    line-height: 18px;
    color: var(--content-color-black-primary);

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
