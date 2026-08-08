<template>
  <div class="calendar-view-filter">
    <div class="calendar-view-filter__title">Просмотр календаря</div>
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="calendar-view-filter__item"
      :class="{ 'is-active': model === option.value }"
      @click="model = option.value"
    >
      <SvgIcon
        :icon="option.icon"
        :color="model === option.value ? 'white' : 'baige-60'"
        :size="24"
      />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import SvgIcon from "@/components/SvgIcon.vue";

export type CalendarViewMode = "month" | "week" | "day";

const model = defineModel<CalendarViewMode>({ default: "month" });

const options = [
  { value: "month" as const, label: "Месяц", icon: "calendar-month" as const },
  { value: "week" as const, label: "Неделя", icon: "calendar-week" as const },
  { value: "day" as const, label: "День", icon: "calendar-day" as const },
];
</script>

<style scoped lang="less">
.calendar-view-filter {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 8px 4px 8px 8px;
  border-radius: 8px;
  background-color: var(--content-color-black-primary);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  overflow: clip;

  &__title {
    padding: 8px;
    font-family: var(--font-family);
    font-size: 22px;
    font-weight: 700;
    line-height: 1.3;
    color: var(--content-color-baige-100);
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    padding: 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    font-family: var(--font-family);
    font-size: 16px;
    font-weight: 400;
    line-height: 1.3;
    color: var(--content-color-baige-60);
    text-align: left;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;

    &.is-active {
      color: var(--content-color-white-100);
    }
  }
}
</style>
