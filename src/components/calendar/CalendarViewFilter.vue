<template>
  <f7-list>
    <f7-list-item class="calendar-view-filter-heading" title="Просмотр календаря" />
  </f7-list>
  <f7-list>
    <f7-list-item
      v-for="option in options"
      :key="option.value"
      :title="option.label"
      :class="{ 'is-active': model === option.value }"
      link
      no-chevron
      @click.prevent="model = option.value"
    >
      <template #media>
        <SvgIcon
          :icon="option.icon"
          :color="itemIconColor(option.value)"
          :size="24"
        />
      </template>
    </f7-list-item>
  </f7-list>
</template>

<script setup lang="ts">
import { useTheme } from "@/composables/useTheme";
import SvgIcon from "@/components/SvgIcon.vue";

export type CalendarViewMode = "month" | "week" | "day";

const model = defineModel<CalendarViewMode>({ default: "month" });
const { isDarkMode } = useTheme();

const options = [
  { value: "month" as const, label: "Месяц", icon: "calendar-month" as const },
  { value: "week" as const, label: "Неделя", icon: "calendar-week" as const },
  { value: "day" as const, label: "День", icon: "calendar-day" as const },
];

const itemIconColor = (value: CalendarViewMode) => {
  if (model.value === value) {
    return isDarkMode.value ? "white" : "black-primary";
  }
  return isDarkMode.value ? "baige-60" : "black-60";
};
</script>

<style scoped lang="less">
.calendar-view-filter-heading {
  pointer-events: none;
  --f7-list-item-title-font-size: 22px;
  --f7-list-item-title-font-weight: 700;
  --f7-list-item-title-line-height: 1.3;
  --f7-list-item-title-text-color: var(--content-color-black-primary);
}

.is-active {
  --f7-list-item-title-text-color: var(--content-color-black-primary);
}
</style>
