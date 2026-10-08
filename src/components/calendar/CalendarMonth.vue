<template>
  <div class="calendar-month-view">
    <div class="calendar-month-card">
      <template v-if="range">
        <div class="calendar-month-header">
          <div class="calendar-month-nav">
            <button
              type="button"
              class="calendar-month-nav-button"
              aria-label="Предыдущий месяц"
              :disabled="!canPrevMonth"
              @click="prevMonth"
            >
              <SvgIcon icon="chevron-left" :color="iconColor" :size="24" />
            </button>
            <span class="calendar-month-title">{{ MONTH_NAMES[viewMonth] }}</span>
            <button
              type="button"
              class="calendar-month-nav-button"
              aria-label="Следующий месяц"
              :disabled="!canNextMonth"
              @click="nextMonth"
            >
              <SvgIcon icon="chevron-right" :color="iconColor" :size="24" />
            </button>
          </div>
          <div class="calendar-month-nav">
            <button
              type="button"
              class="calendar-month-nav-button"
              aria-label="Предыдущий год"
              :disabled="!canPrevYear"
              @click="prevYear"
            >
              <SvgIcon icon="chevron-left" :color="iconColor" :size="24" />
            </button>
            <span class="calendar-month-title">{{ viewYear }}</span>
            <button
              type="button"
              class="calendar-month-nav-button"
              aria-label="Следующий год"
              :disabled="!canNextYear"
              @click="nextYear"
            >
              <SvgIcon icon="chevron-right" :color="iconColor" :size="24" />
            </button>
          </div>
        </div>
        <div ref="calendarEl" />
      </template>
      <div v-else-if="markersError" class="calendar-month-state">
        <p>Не удалось загрузить календарь</p>
        <f7-button small outline @click="calendarStore.refreshMarkers()">Повторить</f7-button>
      </div>
      <div v-else class="calendar-month-state">
        <f7-preloader />
      </div>
    </div>

    <div class="calendar-month-card calendar-month-legend">
      <div v-for="item in LEGEND" :key="item.title" class="calendar-month-legend-item">
        <span :class="['calendar-month-legend-mark', item.markClass]"></span>
        <span>{{ item.title }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { f7 } from "framework7-vue";
import type { Calendar } from "framework7/types";

import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";
import { useCalendarStore } from "@/stores/calendar";
import { DAY_CLASSES, buildDayStyles, getDaysRange, toDateCode } from "./calendarMarkers";

const emit = defineEmits<{ "select-day": [code: string] }>();

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
// Индекс = Date.getDay(), неделя начинается с воскресенья
const DAY_NAMES_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const LEGEND = [
  { title: "Пасха. Воскресение Христово", markClass: "is-easter" },
  { title: "Двунадесятые праздники", markClass: "is-holiday" },
  { title: "Великие праздники", markClass: "is-great" },
  { title: "Праздники Валаамской обители", markClass: "is-valaam" },
  { title: "Посты", markClass: "is-fast" },
  { title: "Сплошные седмицы", markClass: "is-week" },
  { title: "Особые дни поминовения усопших", markClass: "is-memorial" },
];

const { isDarkMode } = useTheme();
const iconColor = computed(() => (isDarkMode.value ? "white" : "black-primary"));

const calendarStore = useCalendarStore();
const { markers, markersError } = storeToRefs(calendarStore);

const styles = computed(() => (markers.value ? buildDayStyles(markers.value.days) : null));
// Границы берём из самих дней: так они не зависят от часового пояса пользователя
const range = computed(() => (markers.value ? getDaysRange(markers.value.days) : null));

const calendarEl = ref<HTMLElement | null>(null);
const viewYear = ref(0);
const viewMonth = ref(0);
let calendar: Calendar.Calendar | null = null;

const monthIndexOf = (date: Date) => date.getFullYear() * 12 + date.getMonth();
const viewIndex = computed(() => viewYear.value * 12 + viewMonth.value);
const minIndex = computed(() => (range.value ? monthIndexOf(range.value.min) : 0));
const maxIndex = computed(() => (range.value ? monthIndexOf(range.value.max) : 0));
const canPrevMonth = computed(() => viewIndex.value > minIndex.value);
const canNextMonth = computed(() => viewIndex.value < maxIndex.value);
const canPrevYear = computed(() => viewIndex.value - 12 >= minIndex.value);
const canNextYear = computed(() => viewIndex.value + 12 <= maxIndex.value);

function syncView(instance: Calendar.Calendar) {
  viewYear.value = instance.currentYear;
  viewMonth.value = instance.currentMonth;
}

const prevMonth = () => calendar?.prevMonth(300);
const nextMonth = () => calendar?.nextMonth(300);
const prevYear = () => calendar?.prevYear();
const nextYear = () => calendar?.nextYear();

function destroyCalendar() {
  calendar?.destroy();
  calendar = null;
}

function createCalendar(days: { min: Date; max: Date }) {
  if (!calendarEl.value) return;

  const instance = f7.calendar.create({
    containerEl: calendarEl.value,
    cssClass: "month-calendar",
    toolbar: false,
    firstDay: 1,
    weekendDays: [0],
    monthNames: MONTH_NAMES,
    dayNamesShort: DAY_NAMES_SHORT,
    minDate: days.min,
    maxDate: days.max,
    // Дней, которых нет в API, нет в карте стилей: они неактивны
    disabled: (date: Date) => !styles.value?.has(toDateCode(date)),
    rangesClasses: DAY_CLASSES.map((cssClass) => ({
      cssClass,
      range: (date: Date) => styles.value?.get(toDateCode(date))?.includes(cssClass) ?? false,
    })),
    on: {
      dayClick: (_calendar: Calendar.Calendar, _dayEl: HTMLElement, year: number, month: number, day: number) => {
        emit("select-day", toDateCode(new Date(year, month, day)));
      },
      // В аргументах события приходит ещё старый месяц, поэтому читаем его из календаря
      monthYearChangeStart: (changed: Calendar.Calendar) => syncView(changed),
    },
  });
  calendar = instance;

  // Если сегодня вне диапазона API, открываем ближайший доступный месяц
  const today = new Date();
  const start = today < days.min ? days.min : today > days.max ? days.max : today;
  if (start.getFullYear() !== instance.currentYear || start.getMonth() !== instance.currentMonth) {
    instance.setYearMonth(start.getFullYear(), start.getMonth(), 0);
  }
  syncView(instance);
}

function syncCalendar() {
  const days = range.value;
  if (!days) {
    destroyCalendar();
    return;
  }
  if (!calendar) {
    createCalendar(days);
    return;
  }
  calendar.params.minDate = days.min;
  calendar.params.maxDate = days.max;
  calendar.update();
}

onMounted(syncCalendar);
// flush: "post" - контейнер календаря появляется в DOM только после рендера
watch(markers, syncCalendar, { flush: "post" });
onBeforeUnmount(destroyCalendar);
</script>

<style scoped lang="less">
.calendar-month-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px var(--f7-block-padding-horizontal) 20px;
  font-family: var(--font-family);
}

.calendar-month-card {
  overflow: hidden;
  border-radius: 16px;
  background: var(--calendar-card-bg);
  color: var(--calendar-text);
}

.calendar-month-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--content-color-black-20);
}

.calendar-month-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calendar-month-nav-button {
  display: flex;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
}

.calendar-month-title {
  font-size: var(--mobile-main-text-bold-b3);
  font-weight: 700;
  line-height: var(--mobile-main-text-bold-b3-line-height);
}

.calendar-month-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 24px;
  font-size: var(--mobile-main-text-regular-b3);
  text-align: center;

  p {
    margin: 0;
  }
}

.calendar-month-legend {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px 24px 30px;
  font-size: var(--mobile-main-text-regular-b3);
  line-height: var(--mobile-main-text-regular-b3-line-height);
}

.calendar-month-legend-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.calendar-month-legend-mark {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  border-radius: 50%;

  &.is-easter {
    background-color: var(--calendar-easter);
  }

  &.is-holiday {
    background-color: var(--calendar-holiday);
  }

  &.is-great {
    border: 1px solid var(--calendar-outline-great);
  }

  &.is-valaam {
    background-color: var(--calendar-valaam);
  }

  &.is-fast {
    background-color: var(--calendar-fast-band);
  }

  &.is-week {
    background-color: var(--calendar-week-band);
  }

  &.is-memorial {
    border: 1px solid var(--calendar-outline-memorial);
  }
}
</style>
