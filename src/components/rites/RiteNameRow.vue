<template>
  <button
    type="button"
    class="rite-name-row"
    :class="{ 'rite-name-row--error': Boolean(errorText) }"
    :aria-label="ariaLabel"
    @pointerdown="keepPlace"
    @click="emit('select')"
  >
    <span class="rite-name-row__main">
      <span class="rite-name-row__text" :class="{ 'rite-name-row__text--placeholder': showPlaceholder }">
        {{ text || (showPlaceholder ? ADD_NAME : "") }}
      </span>
      <f7-icon
        v-if="errorText"
        class="rite-name-row__icon"
        f7="exclamationmark_circle_fill"
        aria-hidden="true"
      />
    </span>
    <span v-if="errorText" class="rite-name-row__error">{{ errorText }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatNoteRow } from "@/services/rites/riteForm";

const ADD_NAME = "Введите имя";

const { index, name, explanation, errorText = "", addPlaceholder = false } = defineProps<{
  index: number;
  name: string;
  explanation: string;
  /** Короткий текст ошибки строки. Пустая строка: ошибки нет */
  errorText?: string;
  /** Первая пустая строка бланка */
  addPlaceholder?: boolean;
}>();

const emit = defineEmits<{
  select: [];
}>();

const text = computed(() => formatNoteRow({ name, explanation }));
const showPlaceholder = computed(() => addPlaceholder && !text.value);

/** Фокус кнопки прокручивает бланк. Возвращаем его на место до следующей отрисовки */
function keepPlace(event: PointerEvent): void {
  const scroller = (event.currentTarget as HTMLElement).closest<HTMLElement>(".rite-scroll");
  if (!scroller) return;
  const top = scroller.scrollTop;
  const restore = (): void => {
    if (scroller.scrollTop !== top) scroller.scrollTop = top;
  };
  requestAnimationFrame(restore);
}
const ariaLabel = computed(() => {
  const base = text.value || (showPlaceholder.value ? ADD_NAME : `Имя ${index + 1}`);
  return errorText ? `${base}. ${errorText}` : base;
});
</script>

<style lang="less">
.rite-name-row {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  margin: 0;
  padding: 8px 0 6px;
  overflow: hidden;
  border: 0;
  border-bottom: 1px solid var(--rite-line);
  background: transparent;
  appearance: none;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;

  &__main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  &__text {
    flex: 1;
    min-width: 0;
    min-height: 26px;
    overflow: hidden;
    font-size: 20px;
    line-height: 26px;
    white-space: nowrap;
    text-overflow: ellipsis;

    &--placeholder {
      color: var(--rite-muted);
    }
  }

  &__icon {
    flex: none;
    font-size: 22px;
    color: var(--rite-error);
  }

  &__error {
    display: block;
    margin-top: 2px;
    overflow: hidden;
    font-size: 14px; // 12px;
    line-height: 16px;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--rite-error);
  }

  &--error {
    border-bottom: 2px solid var(--rite-error);

    .rite-name-row__text {
      color: var(--rite-error);
    }
  }
}
</style>
