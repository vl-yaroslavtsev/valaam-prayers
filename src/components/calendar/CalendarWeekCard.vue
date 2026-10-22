<template>
  <f7-card
    :class="[
      'week-card',
      `is-${tint.background}`,
      tint.outline && `is-outline-${tint.outline}`,
      { 'is-sunday': isSunday },
    ]"
    role="link"
    tabindex="0"
    @click="emit('select')"
    @keydown.enter="emit('select')"
  >
    <f7-card-content :padding="false">
      <div class="week-card-header">
        <div class="week-card-date">
          <p class="week-card-old-style">{{ header.oldStyle }}</p>
          <p class="week-card-long-date">{{ header.longDate }}</p>
        </div>
        <SvgIcon icon="arrow-small" :size="24" :color="arrowColor" />
      </div>

      <div class="week-card-fasting">
        <SvgIcon :icon="fastingIcon" :size="42" :color="mutedColor" />
        <p class="week-card-fasting-text">{{ fastingText }}</p>
      </div>

      <div class="week-card-body">
        <p v-if="titleHtml" class="week-card-title" v-html="titleHtml"></p>
        <p v-if="saintsHtml" class="week-card-saints" v-html="saintsHtml"></p>
      </div>
    </f7-card-content>
  </f7-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useTheme } from "@/composables/useTheme";
import SvgIcon from "@/components/SvgIcon.vue";
import type { CalendarDayApiElement } from "@/services/api/DaysApi";
import { FASTING_ICONS, getDayHeader, parseDayCode } from "./dayFormat";
import { buildWeekSaintsHtml, buildWeekTitleHtml, type WeekCardStyle } from "./weekCard";

const { day, tint } = defineProps<{
  day: CalendarDayApiElement;
  tint: WeekCardStyle;
}>();

const emit = defineEmits<{ select: [] }>();

const { isDarkMode } = useTheme();

const header = computed(() => getDayHeader(day.code));
const isSunday = computed(() => parseDayCode(day.code).getDay() === 0);

const fastingIcon = computed(() => FASTING_ICONS[day.fasting.rules.monastic?.code ?? "none"]);
const fastingText = computed(() => day.fasting.rules.monastic?.title ?? day.fasting.title);

const titleHtml = computed(() => buildWeekTitleHtml(day));
const saintsHtml = computed(() => buildWeekSaintsHtml(day));

const mutedColor = computed(() => (isDarkMode.value ? "baige-60" : "black-60"));
const arrowColor = computed(() => (isDarkMode.value ? "baige-40" : "black-40"));
</script>

<style scoped lang="less">
.week-card {
  --week-card-text: var(--content-color-black-primary);
  --week-card-date: var(--content-color-black-primary);
  --week-card-faint: var(--content-color-black-40);
  --week-card-muted: var(--content-color-black-60);
  --week-card-accent: var(--brand-color-primary-accent-50);
  --week-card-outline: transparent;

  --f7-card-margin-horizontal: 0;
  --f7-card-margin-vertical: 0;
  --f7-card-border-radius: 16px;
  --f7-card-bg-color: #f1f1f1;
  --f7-card-text-color: var(--week-card-text);

  box-shadow: inset 0 0 0 1px var(--week-card-outline);
  font-family: var(--font-family);
  cursor: pointer;

  p {
    margin: 0;
  }

  &.is-fast {
    --f7-card-bg-color: rgba(204, 230, 250, 0.4);
  }

  &.is-holiday {
    --f7-card-bg-color: rgba(235, 87, 87, 0.3);
  }

  &.is-week {
    --f7-card-bg-color: rgba(244, 230, 199, 0.8);
  }

  &.is-valaam {
    --f7-card-bg-color: rgba(193, 221, 188, 0.6);
  }

  // Поминовение усопших: белая карточка в чёрном контуре
  &.is-none.is-outline-memorial {
    --f7-card-bg-color: var(--content-color-white-100);
  }

  &.is-outline-memorial {
    --week-card-outline: var(--content-color-black-primary);
  }

  &.is-outline-great {
    --week-card-outline: var(--calendar-outline-great);
  }

  &.is-sunday {
    --week-card-date: var(--red-r-100);
  }
}

.dark .week-card {
  --week-card-text: var(--content-color-white-100);
  --week-card-date: var(--content-color-white-100);
  --week-card-faint: var(--content-color-baige-40);
  --week-card-muted: var(--content-color-baige-60);
  --week-card-accent: var(--brand-color-primary-accent-70);

  --f7-card-bg-color: var(--content-color-baige-10);

  &.is-fast {
    --f7-card-bg-color: rgba(204, 230, 250, 0.2);
  }

  &.is-holiday {
    --f7-card-bg-color: rgba(235, 87, 87, 0.2);
  }

  &.is-week {
    --f7-card-bg-color: rgba(244, 221, 171, 0.2);
  }

  &.is-valaam {
    --f7-card-bg-color: rgba(146, 221, 133, 0.2);
  }

  &.is-none.is-outline-memorial {
    --f7-card-bg-color: transparent;
  }

  &.is-outline-memorial {
    --week-card-outline: var(--content-color-white-100);
  }

  // В тёмной теме воскресенье не красное
  &.is-sunday {
    --week-card-date: var(--content-color-white-100);
  }
}

.week-card :deep(.card-content) {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
}

.week-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
}

.week-card-date {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.week-card-old-style {
  font-size: var(--mobile-main-text-bold-b3);
  font-weight: 700;
  line-height: var(--mobile-main-text-bold-b3-line-height);
  color: var(--week-card-faint);
}

.week-card-long-date {
  font-size: var(--mobile-main-text-bold-b1);
  font-weight: 700;
  line-height: var(--mobile-main-text-bold-b1-line-height);
  color: var(--week-card-date);
}

.week-card-fasting {
  display: flex;
  align-items: center;
  gap: 12px;
}

.week-card-fasting-text {
  flex: 1;
  min-width: 0;
  font-size: 17px;
  line-height: 1.1;
  color: var(--week-card-muted);
}

.week-card-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 10px;
  font-size: var(--mobile-main-text-regular-b2);
  line-height: var(--mobile-main-text-regular-b2-line-height);

  // Ссылки только окрашены: нажатие по карточке открывает день
  :deep(a) {
    color: var(--week-card-accent);
    text-decoration: none;
    pointer-events: none;
  }
}

.week-card-title {
  color: var(--week-card-text);
}

// Высота как в макете: три строки святых, остальное обрезается многоточием
.week-card-saints {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  height: 80px;
  overflow: hidden;
  color: var(--week-card-muted);

  :deep(strong),
  :deep(b) {
    font-weight: 400;
  }
}
</style>
