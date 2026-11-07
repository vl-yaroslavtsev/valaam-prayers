<template>
  <div class="rite-row" :class="{ 'rite-row--error': Boolean(nameError || explanationError) }">
    <div ref="nameCell" class="rite-cell">
      <f7-list class="rite-field" no-hairlines>
        <f7-list-input
          type="text"
          :name="`name-${index}`"
          placeholder="Имя"
          autocomplete="off"
          :aria-label="`Имя ${index + 1}`"
          :value="name"
          :error-message="nameError?.short"
          :error-message-force="Boolean(nameError)"
          @input="onNameInput"
          @blur="nameTouched = true"
        >
          <template #input>
            <button
              v-if="nameError"
              type="button"
              class="rite-error-button"
              aria-label="Описание ошибки"
              @mousedown.prevent
              @click="emit('show-error', nameError.full)"
            >
              !
            </button>
          </template>
        </f7-list-input>
      </f7-list>
    </div>

    <div ref="explanationCell" class="rite-cell">
      <f7-list class="rite-field" no-hairlines>
        <f7-list-input
          type="text"
          :name="`explanation-${index}`"
          placeholder="Пометка"
          autocomplete="off"
          :aria-label="`Пометка ${index + 1}`"
          :value="explanation"
          :disabled="!isNameValid(name)"
          :error-message="explanationError?.short"
          :error-message-force="Boolean(explanationError)"
          @input="onExplanationInput"
          @blur="explanationTouched = true"
        >
          <template #input>
            <button
              v-if="explanationError"
              type="button"
              class="rite-error-button"
              aria-label="Описание ошибки"
              @mousedown.prevent
              @click="emit('show-error', explanationError.full)"
            >
              !
            </button>
          </template>
        </f7-list-input>
      </f7-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { f7 } from "framework7-vue";
import type { Autocomplete } from "framework7/types";
import {
  filterByPrefix,
  isNameValid,
  validateExplanation,
  validateName,
  type FieldError,
} from "@/services/rites/riteForm";

const MAX_NAME_HINTS = 15;

const {
  index,
  names,
  explanations,
  showErrors,
  serverNameError = null,
  serverExplanationError = null,
} = defineProps<{
  index: number;
  /** Имена для подсказки */
  names: string[];
  /** Пометки текущего вида записки: и подсказки, и список допустимых значений */
  explanations: string[];
  /** Показать ошибки сразу, не дожидаясь ухода из поля: так после нажатия на кнопку отправки */
  showErrors: boolean;
  serverNameError?: FieldError | null;
  serverExplanationError?: FieldError | null;
}>();

const name = defineModel<string>("name", { required: true });
const explanation = defineModel<string>("explanation", { required: true });

const emit = defineEmits<{
  "show-error": [text: string];
}>();

const nameTouched = ref(false);
const explanationTouched = ref(false);

// Ошибка сервера держится, пока поле не изменили: родитель сбрасывает её при вводе
const nameError = computed(
  () => serverNameError ?? (nameTouched.value || showErrors ? validateName(name.value) : null),
);
const explanationError = computed(
  () =>
    serverExplanationError ??
    (explanationTouched.value || showErrors ? validateExplanation(explanation.value, explanations) : null),
);

function onNameInput(event: Event): void {
  name.value = (event.target as HTMLInputElement).value;
}

function onExplanationInput(event: Event): void {
  explanation.value = (event.target as HTMLInputElement).value;
}

// Пометка доступна только при верном имени; очистили имя - пометка уходит вместе с ним
watch(name, (value) => {
  if (!value.trim()) explanation.value = "";
});

const nameCell = ref<HTMLElement | null>(null);
const explanationCell = ref<HTMLElement | null>(null);
let nameHints: Autocomplete.Autocomplete | null = null;
let explanationHints: Autocomplete.Autocomplete | null = null;

/** Выпадающий список под полем: его позиция задаётся стилями ячейки, а не F7 */
function createHints(
  cell: HTMLElement | null,
  source: (query: string) => string[],
): Autocomplete.Autocomplete | null {
  const inputEl = cell?.querySelector("input");
  if (!cell || !inputEl) return null;
  const hints: Autocomplete.Autocomplete = f7.autocomplete.create({
    inputEl,
    openIn: "dropdown",
    dropdownContainerEl: cell,
    highlightMatches: false,
    updateInputValueOnSelect: true,
    source(query, render) {
      const items = source(query);
      render(items);
      // Список может оказаться ниже видимой части: прокручиваем страницу к нему
      if (items.length) {
        requestAnimationFrame(() =>
          (hints.$dropdownEl?.[0] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" }),
        );
      }
    },
  });
  return hints;
}

onMounted(() => {
  nameHints = createHints(nameCell.value, (query) => filterByPrefix(names, query, MAX_NAME_HINTS));
  explanationHints = createHints(explanationCell.value, (query) =>
    query.trim() ? filterByPrefix(explanations, query, MAX_NAME_HINTS) : explanations,
  );
});

onBeforeUnmount(() => {
  nameHints?.destroy();
  explanationHints?.destroy();
});
</script>
