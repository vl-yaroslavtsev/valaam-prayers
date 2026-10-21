<template>
  <div class="reminder-time-row">
    <input
      ref="inputRef"
      class="reminder-time-input"
      type="text"
      readonly
      :disabled="disabled"
      :aria-label="ariaLabel"
    />
    <f7-link
      v-if="removable"
      class="reminder-time-remove"
      :class="{ disabled }"
      aria-label="Удалить время"
      @click="emit('remove')"
    >
      <SvgIcon icon="delete" color="primary-accent-50" :size="24" />
    </f7-link>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { f7 } from "framework7-vue";
import type { Picker } from "framework7/types";
import SvgIcon from "@/components/SvgIcon.vue";

/**
 * Строка времени: поле с Framework7 Picker (часы : минуты).
 * Значение — строка "HH:mm", в поле показывается как "H:mm".
 */
const props = withDefaults(
  defineProps<{
    modelValue: string;
    disabled?: boolean;
    removable?: boolean;
    ariaLabel?: string;
  }>(),
  { disabled: false, removable: false, ariaLabel: "Время напоминания" }
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  remove: [];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
let picker: Picker.Picker | null = null;

const HOURS = Array.from({ length: 24 }, (_, i) => String(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

const toPickerValue = (time: string): string[] => {
  const [h, m] = time.split(":");
  return [String(Number(h)), m];
};

const toTime = (values: unknown[]): string => `${String(values[0]).padStart(2, "0")}:${values[1]}`;

onMounted(() => {
  if (!inputRef.value) return;
  picker = f7.picker.create({
    inputEl: inputRef.value,
    rotateEffect: true,
    toolbarCloseText: "Готово",
    value: toPickerValue(props.modelValue),
    formatValue: (values) => `${values[0]}:${values[1]}`,
    cols: [
      { values: HOURS, textAlign: "right" },
      { divider: true, content: ":" },
      { values: MINUTES, textAlign: "left" },
    ],
    on: {
      closed: (instance) => {
        const time = toTime(instance.value as unknown[]);
        if (time !== props.modelValue) emit("update:modelValue", time);
      },
    },
  });
});

watch(
  () => props.modelValue,
  (time) => {
    if (!picker) return;
    const next = toPickerValue(time);
    const current = picker.value as unknown[];
    if (current[0] !== next[0] || current[1] !== next[1]) picker.setValue(next);
  }
);

onBeforeUnmount(() => {
  picker?.destroy();
  picker = null;
});
</script>

<style scoped lang="less">
.reminder-time-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

// Двойной класс — чтобы перебить стили `.list input[type=text]` из F7,
// когда строка лежит внутри f7-list (аккордеон)
.reminder-time-row .reminder-time-input.reminder-time-input {
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
  height: auto;
  box-sizing: border-box;
  padding: 8px 20px;
  border: none;
  border-radius: 10px;
  background: var(--content-color-black-10);
  color: var(--content-color-black-primary);
  font-family: var(--font-family);
  font-size: var(--mobile-main-text-regular-b1);
  line-height: 28px;
  cursor: pointer;

  &:focus {
    outline: none;
  }
}

.reminder-time-remove {
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  justify-content: center;
}

.dark {
  .reminder-time-row .reminder-time-input.reminder-time-input {
    background: var(--content-color-baige-10);
    color: var(--content-color-white-100);
  }
}
</style>
