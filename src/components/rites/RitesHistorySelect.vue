<template>
  <f7-list class="history-select" :class="`history-select--${variant}`" no-hairlines>
    <f7-list-item
      smart-select
      :after="selectedLabel"
      :smart-select-params="{
        openIn: 'popover',
        closeOnSelect: true,
        setValueText: false,
        scrollToSelectedItem: true,
        cssClass: 'history-filter-popover',
      }"
    >
      <template v-if="icon" #media>
        <SvgIcon :icon="icon" :size="24" :color="iconColor" />
      </template>
      <template #inner-end>
        <SvgIcon class="history-select__arrow" icon="chevron-down" :size="24" :color="iconColor" />
      </template>
      <select v-model="model" :name="name" :aria-label="label">
        <option
          v-for="option in allOptions"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
    </f7-list-item>
  </f7-list>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";
import type { IconName } from "@/types/icon-name";

export interface HistorySelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const {
  options,
  allLabel = "",
  label,
  name,
  icon,
  variant = "field",
} = defineProps<{
  options: HistorySelectOption[];
  /** Подпись варианта «не выбрано» (значение ""). Без неё такого варианта нет */
  allLabel?: string;
  label: string;
  name: string;
  icon?: IconName;
  /** field: заливка (на странице), outlined: контур (в окне фильтров) */
  variant?: "field" | "outlined";
}>();

/** Значение "" это «не выбрано» */
const model = defineModel<string>({ default: "" });

const { isDarkMode } = useTheme();
const iconColor = computed(() => (isDarkMode.value ? "white" : "black-primary"));

const allOptions = computed<HistorySelectOption[]>(() =>
  allLabel ? [{ value: "", label: allLabel }, ...options] : options,
);
const selectedLabel = computed(
  () => allOptions.value.find((option) => option.value === model.value)?.label ?? allLabel,
);
</script>

<style lang="less">
.history-select {
  --history-select-bg: var(--rites-field-bg);
  --history-select-border: transparent;
  --history-select-text: var(--rites-text);
  --f7-list-item-min-height: 40px;
  --f7-list-item-padding-horizontal: 16px;
  --f7-list-item-padding-vertical: 8px;
  --f7-list-item-after-font-size: 16px;
  --f7-list-item-after-text-color: var(--history-select-text);

  margin: 0;

  ul {
    padding: 0;
    border: 1px solid var(--history-select-border);
    border-radius: 8px;
    background: var(--history-select-bg);

    &::before,
    &::after {
      display: none;
    }
  }

  .item-content {
    min-height: 40px;
    padding-left: var(--f7-list-item-padding-horizontal);
  }

  .item-media {
    margin: 0;
    padding: 0;
  }

  // Специфичность выше, чем у стрелки и отступов ссылки списка F7
  .item-link .item-inner {
    min-height: 40px;
    margin-left: 0;
    padding: 8px 12px 8px 0;

    &::before,
    &::after {
      display: none;
    }
  }

  .item-media + .item-inner {
    margin-left: 8px;
  }

  .item-title {
    display: none;
  }

  // Значение слева, стрелка справа
  .item-after {
    flex: 1;
    margin: 0;
    padding: 0;
    font-size: 16px;
    line-height: 20px;
    text-align: left;
    color: var(--history-select-text);
  }

  &--outlined {
    --history-select-bg: transparent;
    --history-select-border: var(--rites-field-border);
  }
}

// Поповер рендерится вне компонента: длинные названия треб переносятся
.history-filter-popover.smart-select-popover {
  .item-title {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
  }
}
</style>
