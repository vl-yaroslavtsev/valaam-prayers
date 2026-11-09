<template>
  <f7-list class="rite-select" :class="`rite-select--${size}`" no-hairlines>
    <f7-list-item
      smart-select
      :after="selectedLabel"
      :smart-select-params="{
        openIn: 'popover',
        closeOnSelect: true,
        setValueText: false,
        scrollToSelectedItem: true,
        cssClass: 'rite-select-popover',
      }"
    >
      <template #inner-end>
        <SvgIcon class="rite-select__arrow" icon="chevron-down" :size="size === 'large' ? 24 : 24" color="black-primary" />
      </template>
      <select v-model="model" :name="name" :aria-label="label">
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </f7-list-item>
  </f7-list>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SvgIcon from "@/components/SvgIcon.vue";

export interface RiteSelectOption {
  value: string | number;
  label: string;
}

const {
  options,
  label,
  name,
  size = "large",
} = defineProps<{
  options: RiteSelectOption[];
  label: string;
  name: string;
  /** large: вид записки («О здравии»), small: подтип */
  size?: "large" | "small";
}>();

const model = defineModel<string | number>({ required: true });

const selectedLabel = computed(
  () => options.find((option) => option.value === model.value)?.label ?? "",
);
</script>

<style lang="less">
.rite-select {
  --f7-list-item-min-height: 0;
  --f7-list-item-padding-horizontal: 0;
  --f7-list-item-padding-vertical: 0;
  --f7-list-item-after-text-color: var(--rite-accent);
  --f7-list-item-after-font-size: 32px; //26px;
  --rite-select-line-height: 32px;

  margin: 0;

  ul {
    padding: 0;
    background: none;

    &::before,
    &::after {
      display: none;
    }
  }

  .item-content {
    min-height: 0;
    padding-left: 0;
  }

  // Специфичность выше, чем у стрелки и отступов ссылки списка F7
  .item-link .item-inner {
    min-height: 0;
    margin-left: 0;
    padding: 0;
    justify-content: center;
    gap: 6px;

    &::before,
    &::after {
      display: none;
    }
  }

  .item-title {
    display: none;
  }

  .item-after {
    flex: 0 1 auto;
    max-width: none;
    margin: 0;
    padding: 0;
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
    font-family: var(--font3), serif;
    font-weight: 400;
    font-size: var(--f7-list-item-after-font-size);
    line-height: var(--rite-select-line-height);
    text-align: center;
    color: var(--rite-accent);
  }

  // Стрелка того же цвета, что и название: красная в записке о здравии
  .rite-select__arrow.icon {
    color: var(--rite-accent);
  }

  &--small {
    --f7-list-item-after-font-size: 24px;//22px;
    --rite-select-line-height: 24px;
  }
}

// Окно выбора рендерится вне записки: длинные названия переносятся
.rite-select-popover.smart-select-popover {
  .item-title {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
  }
}
</style>
