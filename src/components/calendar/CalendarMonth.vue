<template>
  <div class="calendar-month-view">
    <div class="calendar-month-card">
      <template v-if="range">
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

import chevronLeft from "@/assets/icons/chevron-left.svg?raw";
import chevronRight from "@/assets/icons/chevron-right.svg?raw";
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
  const root = instance.$el?.[0];
  if (!root) return;
  const toggle = (selector: string, enabled: boolean) => {
    root.querySelector(selector)?.classList.toggle("is-disabled", !enabled);
  };
  toggle(".calendar-prev-month-button", canPrevMonth.value);
  toggle(".calendar-next-month-button", canNextMonth.value);
  toggle(".calendar-prev-year-button", canPrevYear.value);
  toggle(".calendar-next-year-button", canNextYear.value);
}

function navSelector(kind: "month" | "year"): string {
  const prevClass = kind === "month" ? "calendar-prev-month-button" : "calendar-prev-year-button";
  const nextClass = kind === "month" ? "calendar-next-month-button" : "calendar-next-year-button";
  const valueClass = kind === "month" ? "current-month-value" : "current-year-value";
  const prevLabel = kind === "month" ? "Предыдущий месяц" : "Предыдущий год";
  const nextLabel = kind === "month" ? "Следующий месяц" : "Следующий год";
  const valueLabel = kind === "month" ? "Выбор месяца" : "Выбор года";
  return `<div class="calendar-${kind}-selector toolbar-pane"><a class="link icon-only ${prevClass}" aria-label="${prevLabel}">${chevronLeft}</a><a class="${valueClass} link" aria-label="${valueLabel}"></a><a class="link icon-only ${nextClass}" aria-label="${nextLabel}">${chevronRight}</a></div>`;
}

function destroyCalendar() {
  calendar?.destroy();
  calendar = null;
}

function createCalendar(days: { min: Date; max: Date }) {
  if (!calendarEl.value) return;

  const instance = f7.calendar.create({
    containerEl: calendarEl.value,
    cssClass: "month-calendar",
    toolbar: true,
    monthPicker: true,
    yearPicker: true,
    yearPickerMin: days.min.getFullYear(),
    yearPickerMax: days.max.getFullYear(),
    renderMonthSelector: () => navSelector("month"),
    renderYearSelector: () => navSelector("year"),
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
  calendar.params.yearPickerMin = days.min.getFullYear();
  calendar.params.yearPickerMax = days.max.getFullYear();
  calendar.update();
  syncView(calendar);
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
