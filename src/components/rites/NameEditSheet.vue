<template>
  <f7-sheet
    v-model:opened="opened"
    class="rite-name-sheet"
    bottom
    backdrop
    backdrop-el=".rite-popup .rite-sheet-backdrop"
    close-by-backdrop-click
    swipe-to-close
    swipe-handler=".swipe-handler"
    :style="{ '--rite-keyboard-inset': `${inset}px` }"
    @sheet:opened="onOpened"
  >
    <div class="swipe-handler"></div>
    <f7-toolbar class="rite-name-sheet__toolbar" :outline="false">
      <div class="rite-name-sheet__nav">
        <button
          type="button"
          class="rite-name-sheet__nav-button ripple-inset"
          aria-label="Предыдущее имя"
          :disabled="activeIndex === 0"
          @click="step(-1)"
        >
          <SvgIcon class="is-prev" icon="arrow-circle" :size="32" color="black-primary" />
        </button>
        <button
          type="button"
          class="rite-name-sheet__nav-button ripple-inset"
          aria-label="Следующее имя"
          :disabled="activeIndex >= MAX_NAMES - 1"
          @click="step(1)"
        >
          <SvgIcon icon="arrow-circle" :size="32" color="black-primary" />
        </button>
      </div>
      <span class="rite-name-sheet__counter">Имя {{ activeIndex + 1 }} из {{ MAX_NAMES }}</span>
      <f7-button fill round small type="button" class="rite-name-sheet__done" @click="close">Готово</f7-button>
    </f7-toolbar>

    <div ref="bodyEl" class="rite-name-sheet__body page-content">
      <div ref="nameField" class="rite-name-sheet__field">
        <f7-list no-hairlines inset>
          <f7-list-input
            type="text"
            name="sheet-name"
            placeholder="Имя"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            clear-button
            :class="{ 'item-input-invalid': Boolean(nameError) }"
            :value="row.name"
            @update:value="onNameValue"
            @focus="onNameFocus"
            @blur="onNameBlur"
            @keydown.enter="onNameEnter"
          />
        </f7-list>
        <f7-block class="rite-name-sheet__message" :class="{ 'is-error': nameError }">
          <f7-icon
            v-if="nameError"
            class="rite-name-sheet__error-icon"
            f7="exclamationmark_circle_fill"
            aria-hidden="true"
          />
          <span>{{ nameError?.full || NAME_HINT }}</span>
        </f7-block>
      </div>

      <div ref="explanationBlock" class="rite-name-sheet__field">
        <f7-list no-hairlines inset>
          <f7-list-input
            type="text"
            name="sheet-explanation"
            placeholder="Пометка"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            clear-button
            :class="{ 'item-input-invalid': Boolean(explanationError) }"
            :value="row.explanation"
            @update:value="onExplanationValue"
            @focus="onExplanationFocus"
            @blur="onExplanationBlur"
            @keydown.enter="onExplanationEnter"
          />
        </f7-list>
        <f7-block class="rite-name-sheet__message" :class="{ 'is-error': explanationError }">
          <f7-icon
            v-if="explanationError"
            class="rite-name-sheet__error-icon"
            f7="exclamationmark_circle_fill"
            aria-hidden="true"
          />
          <span>{{ explanationError?.full || EXPLANATION_HINT }}</span>
        </f7-block>
      </div>
    </div>
  </f7-sheet>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { f7 } from "framework7-vue";
import type { Autocomplete } from "framework7/types";
import SvgIcon from "@/components/SvgIcon.vue";
import { focusSheetInput, useSheetFocusScrollLock } from "@/composables/focusSheetInput";
import { useKeyboardInset } from "@/composables/useKeyboardInset";
import {
  EXPLANATION_HINT,
  MAX_NAMES,
  NAME_HINT,
  soleExplanation,
  sortByUsage,
  suggestByPrefix,
  type FieldError,
  type NoteRowItem,
} from "@/services/rites/riteForm";
import {
  readSuggestionUsage,
  rememberSuggestion,
  usageKey,
  type SuggestionKind,
} from "@/services/rites/suggestionUsage";

const MAX_HINTS = 15;

const opened = defineModel<boolean>("opened", { default: false });
const activeIndex = defineModel<number>("activeIndex", { required: true });

const { rows, names, explanations, nameError = null, explanationError = null } = defineProps<{
  rows: NoteRowItem[];
  names: string[];
  explanations: string[];
  nameError?: FieldError | null;
  explanationError?: FieldError | null;
}>();

const emit = defineEmits<{
  "update:name": [index: number, value: string];
  "update:explanation": [index: number, value: string];
  "explanation-focus": [];
  "explanation-blur": [];
}>();

const inset = useKeyboardInset();
useSheetFocusScrollLock();
const usage = ref(readSuggestionUsage());
const bodyEl = ref<HTMLElement | null>(null);
const nameField = ref<HTMLElement | null>(null);
const explanationBlock = ref<HTMLElement | null>(null);
let nameHints: Autocomplete.Autocomplete | null = null;
let explanationHints: Autocomplete.Autocomplete | null = null;
/** null: поле в этой строке ещё не фокусировали, ввод не засчитываем */
let nameBaseline: string | null = null;
let explanationBaseline: string | null = null;
let openingHints = false;

const row = computed(() => rows[activeIndex.value] ?? { name: "", explanation: "" });

function inputOf(block: HTMLElement | null): HTMLInputElement | null {
  return block?.querySelector("input") ?? null;
}

/** Единственная подсказка, совпадающая с уже введённым текстом, не нужна */
function withoutExactOnly(items: string[], query: string): string[] {
  const typed = query.trim().toUpperCase();
  if (items.length === 1 && items[0].toUpperCase() === typed) return [];
  return items;
}

function nameSuggestions(query: string): string[] {
  return withoutExactOnly(suggestByPrefix(names, query, MAX_HINTS, usage.value.names), query);
}

function explanationSuggestions(query: string): string[] {
  const typed = query.trim();
  const items = typed
    ? suggestByPrefix(explanations, typed, MAX_HINTS, usage.value.explanations)
    : sortByUsage(explanations, usage.value.explanations);
  return withoutExactOnly(items, query);
}

function rememberIfChanged(kind: SuggestionKind, value: string, baseline: string): string {
  const key = usageKey(value);
  if (!key || key === baseline) return baseline;
  usage.value = rememberSuggestion(kind, value);
  return key;
}

/**
 * После выбора и после крестика список закрыт.
 * Новый ввод сам его не открывает: открываем, если есть подсказки.
 */
function reopenHints(ac: Autocomplete.Autocomplete | null, items: string[]): void {
  const input = ac?.inputEl;
  if (openingHints || !ac || ac.opened || items.length === 0 || document.activeElement !== input) return;
  openingHints = true;
  try {
    ac.open();
  } finally {
    openingHints = false;
  }
}

const heldDropdowns = new WeakSet<HTMLElement>();

/** Повторный фокус, если касание всё же успело снять его с поля */
function keepTyping(input: HTMLInputElement): void {
  if (document.activeElement === input) return;
  focusSheetInput(input);
  const end = input.value.length;
  input.setSelectionRange(end, end);
}

/**
 * blur у поля нельзя отменить. mousedown по пункту не уводит фокус,
 * и настоящий click Framework7 по-прежнему выбирает значение.
 * touchstart отменять нельзя: это гасит click, а свой click Framework7 отбрасывает.
 */
function holdInputFocus(ac: Autocomplete.Autocomplete): void {
  const dropdown = ac.el;
  const input = ac.inputEl;
  if (!dropdown || !input || heldDropdowns.has(dropdown)) return;
  heldDropdowns.add(dropdown);

  dropdown.addEventListener("mousedown", (event) => {
    event.preventDefault();
    if (input instanceof HTMLInputElement) keepTyping(input);
  });
}

function syncEnterKeyHint(): void {
  const nameInput = inputOf(nameField.value);
  nameInput?.setAttribute("enterkeyhint", "next");
  nameInput?.setAttribute("aria-label", `Имя ${activeIndex.value + 1}`);
  const explanationInput = inputOf(explanationBlock.value);
  explanationInput?.setAttribute("enterkeyhint", activeIndex.value >= MAX_NAMES - 1 ? "done" : "next");
  explanationInput?.setAttribute("aria-label", `Пометка ${activeIndex.value + 1}`);
}

function focusName(): void {
  void nextTick(() => {
    if (!opened.value) return;
    syncEnterKeyHint();
    const input = inputOf(nameField.value);
    focusSheetInput(input);
    nameBaseline = usageKey(input?.value ?? row.value.name);
  });
}

function destroyHints(): void {
  nameHints?.destroy();
  explanationHints?.destroy();
  nameHints = null;
  explanationHints = null;
}

function mountHints(): void {
  destroyHints();
  const nameInput = inputOf(nameField.value);
  const explanationInput = inputOf(explanationBlock.value);
  if (nameInput) {
    nameHints = f7.autocomplete.create({
      inputEl: nameInput,
      openIn: "dropdown",
      highlightMatches: true,
      updateInputValueOnSelect: true,
      source(query, render) {
        render(nameSuggestions(query));
      },
      on: {
        open(instance: Autocomplete.Autocomplete) {
          holdInputFocus(instance);
        },
        change() {
          if (nameBaseline !== null) nameBaseline = rememberIfChanged("names", nameInput.value, nameBaseline);
          keepTyping(nameInput);
        },
      },
    });
  }
  if (explanationInput) {
    explanationHints = f7.autocomplete.create({
      inputEl: explanationInput,
      openIn: "dropdown",
      highlightMatches: true,
      updateInputValueOnSelect: true,
      requestSourceOnOpen: true,
      source(query, render) {
        render(explanationSuggestions(query));
      },
      on: {
        open(instance: Autocomplete.Autocomplete) {
          holdInputFocus(instance);
        },
        change() {
          if (explanationBaseline !== null) {
            explanationBaseline = rememberIfChanged("explanations", explanationInput.value, explanationBaseline);
          }
          keepTyping(explanationInput);
        },
      },
    });
  }
}

/** Поле пометки не должно упираться в нижний край экрана */
function revealExplanation(): void {
  void nextTick(() => {
    requestAnimationFrame(() => {
      const body = bodyEl.value;
      const input = inputOf(explanationBlock.value);
      if (!body || !input) return;
      const inputBottom = input.getBoundingClientRect().bottom;
      const screenBottom = window.visualViewport?.height ?? window.innerHeight;
      const room = screenBottom - inputBottom;
      if (room < 48) body.scrollTop += 48 - room;
    });
  });
}

function fieldValue(block: HTMLElement | null, fallback: string): string {
  return inputOf(block)?.value ?? fallback;
}

function finishName(): void {
  if (nameBaseline === null) return;
  nameBaseline = rememberIfChanged("names", fieldValue(nameField.value, row.value.name), nameBaseline);
}

/** Единственная подходящая пометка подставляется, когда поле покидают */
function finishExplanation(): void {
  if (explanationBaseline === null) return;
  const index = activeIndex.value;
  const current = fieldValue(explanationBlock.value, rows[index]?.explanation ?? "");
  const sole = soleExplanation(current, explanations);
  if (sole) emit("update:explanation", index, sole);
  explanationBaseline = rememberIfChanged("explanations", sole ?? current, explanationBaseline);
}

function leaveRow(): void {
  finishName();
  finishExplanation();
  nameBaseline = null;
  explanationBaseline = null;
  emit("explanation-blur");
}

onBeforeUnmount(() => {
  leaveRow();
  destroyHints();
});

function onOpened(): void {
  void nextTick(() => {
    if (!opened.value) return;
    mountHints();
    focusName();
  });
}

watch(activeIndex, () => {
  if (!opened.value) return;
  if (!inputOf(nameField.value)?.closest(".sheet-modal.modal-in")) return;
  void nextTick(() => {
    mountHints();
    focusName();
  });
});

watch(opened, (isOpen) => {
  if (isOpen) return;
  leaveRow();
  destroyHints();
});

watch(inset, () => {
  if (opened.value && document.activeElement === inputOf(explanationBlock.value)) revealExplanation();
});

function step(delta: number): void {
  const next = activeIndex.value + delta;
  if (next < 0 || next >= MAX_NAMES) return;
  leaveRow();
  activeIndex.value = next;
}

function close(): void {
  opened.value = false;
}

function onNameValue(value: string): void {
  emit("update:name", activeIndex.value, value);
  reopenHints(nameHints, nameSuggestions(value));
}

function onExplanationValue(value: string): void {
  emit("update:explanation", activeIndex.value, value);
  reopenHints(explanationHints, explanationSuggestions(value));
}

function onNameFocus(): void {
  explanationHints?.close();
  nameBaseline = usageKey(fieldValue(nameField.value, row.value.name));
  syncEnterKeyHint();
}

function onNameBlur(): void {
  finishName();
}

function onExplanationFocus(): void {
  nameHints?.close();
  explanationBaseline = usageKey(fieldValue(explanationBlock.value, row.value.explanation));
  emit("explanation-focus");
  syncEnterKeyHint();
  revealExplanation();
}

function onExplanationBlur(): void {
  finishExplanation();
  emit("explanation-blur");
}

function onNameEnter(event: KeyboardEvent): void {
  event.preventDefault();
  nameHints?.close();
  focusSheetInput(inputOf(explanationBlock.value));
}

function onExplanationEnter(event: KeyboardEvent): void {
  event.preventDefault();
  explanationHints?.close();
  if (activeIndex.value >= MAX_NAMES - 1) {
    opened.value = false;
    return;
  }
  leaveRow();
  activeIndex.value += 1;
}
</script>

<style lang="less">
// Шторка при открытии переносится в корень приложения, поэтому селектор от html
html:has(.rite-name-sheet.modal-in) .rite-popup .rite-scroll {
  overflow: hidden;
}

.rite-name-sheet {
  --f7-sheet-height: auto;
  --f7-toolbar-height: 60px;

  --f7-toolbar-inner-padding-left: 16px;
  --f7-toolbar-inner-padding-right: 16px;
  
  --f7-input-font-size: 20px; //22px;
  --f7-input-item-bg-color: var(--content-color-white-100);
  --f7-input-item-border-radius: 8px 8px 0 0;
  // --f7-input-padding-left: 24px;
  // --f7-input-padding-right: 24px;
  --f7-input-text-color: var(--content-color-black-primary);
  --f7-input-placeholder-color: var(--content-color-black-60);
  --f7-input-invalid-border-color: var(--red-r-100);
  --f7-input-error-text-color: var(--red-r-100);
  // padding-top: 32px;
  color: var(--content-color-black-primary);
  font-family: "PT Sans", sans-serif;

  overscroll-behavior: none;

  &.sheet-modal {
    // Высота не зависит от текста ошибки и списка подсказок
    bottom: var(--rite-keyboard-inset, 0px);
    --f7-sheet-height: min(410px, calc(100% - var(--rite-keyboard-inset, 0px) - var(--f7-safe-area-top)));
  }

  &.sheet-modal.modal-in {
    display: flex;
    flex-direction: column;
  }

  // Тулбар F7 выносит из внутренней области, поэтому ручка свайпа оказывается под ним
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
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      padding-top: 24px;
    }
  }

  &__nav {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-self: start;
  }

  &__nav-button {
    position: relative;
    isolation: isolate;
    display: flex;
    flex: none;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    overflow: hidden;
    background: none;
    cursor: pointer;

    .is-prev {
      transform: rotate(180deg);
    }

    &:disabled {
      opacity: 0.35;
      pointer-events: none;
    }
  }

  &__counter {
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
    text-align: center;
    color: var(--f7-toolbar-link-color);
  }

  &__done.button {
    justify-self: end;
    width: auto;
    margin: 0;
    // --f7-button-font-weight: 700;
  }

  // Не page-content: с этим классом Autocomplete ставит список в конец страницы и двигает его координатами
  &__body {
    position: relative;
    flex: 1;
    height: auto;
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

  // Класс с компонента попадает на li. В теме Material линия — это .item-content::after
  li.item-input-invalid .item-content::after {
    background: var(--red-r-100) !important;
    transform: scaleY(2) !important;
  }

  .list input[type="text"] {
    font-family: "PT Sans", sans-serif;
    font-size: 20px;
    line-height: 28px;
    color: var(--content-color-black-primary);

    &::placeholder {
      color: var(--content-color-black-60);
      opacity: 1;
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
  }

  &__error-icon.icon {
    flex: none;
    margin-top: 2px;
    font-size: 22px; //16px;
    color: var(--red-r-100);
  }

  .autocomplete-dropdown {
    border-radius: 0 0 8px 8px;
    --f7-autocomplete-dropdown-bg-color: var(--content-color-white-100);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    clip-path: inset(0 -40px -40px -40px);

    .autocomplete-dropdown-inner {
      height: auto;
      max-height: none!important;
      overflow: visible;
    }

    .list,
    .item-title {
      color: var(--content-color-black-primary);
    }

    .item-title b {
      font-weight: 700;
      color: var(--content-color-black-primary);
    }

    &:has(ul:empty) {
      display: none !important;
      box-shadow: none;
    }
  }
}
</style>
