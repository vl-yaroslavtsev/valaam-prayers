<template>
  <div class="rite-date" @click="openCalendar">
    <input
      ref="inputEl"
      class="rite-date__input"
      type="text"
      name="date"
      aria-label="Дата поминовения"
      :value="label"
      :size="Math.max(label.length, 1)"
      :disabled="disabled"
    />
    <!-- В SVG много пустых полей: 32px дают рисунок около 16px, как иконка в макете -->
    <SvgIcon class="rite-date__icon" icon="calendar" :size="32" color="primary-accent-50" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { f7 } from "framework7-vue";
import type { Calendar } from "framework7/types";
import SvgIcon from "@/components/SvgIcon.vue";
import { formatPeriodLong } from "@/services/rites/ritesFormat";
import {
  dayTsToWallDate,
  getToDate,
  isValidDate,
  wallDateToDayTs,
} from "@/services/rites/ritesDates";
import type { RiteType, TypeRestriction } from "@/services/rites/ritesApi";

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

const { type, minDate, restrictions, disabled = false } = defineProps<{
  type: RiteType | null;
  /** Ближайшая допустимая дата: начало московского дня */
  minDate: number;
  restrictions: TypeRestriction[];
  disabled?: boolean;
}>();

/** Начало московского дня первого дня поминовения; null, пока дата не выбрана */
const model = defineModel<number | null>({ default: null });

const inputEl = ref<HTMLInputElement | null>(null);
let calendar: Calendar.Calendar | null = null;

/** Календарь открывается по полю. Клик по иконке рядом тоже его открывает */
function openCalendar(event: MouseEvent): void {
  if (disabled || event.target === inputEl.value) return;
  inputEl.value?.click();
}

/** Один день или период: «27 ноября 2026» / «27 ноября - 5 января 2027» */
const label = computed(() => {
  if (!model.value) return "";
  const from = model.value;
  const to = type ? getToDate(from, type) : from;
  const period = formatPeriodLong({ from: { ts: from, value: "" }, to: { ts: to, value: "" } });
  return period ? [period.from, period.to].filter(Boolean).join(" - ") : "";
});

/** Подсветка дней поминовения: начало, середина и конец периода. Один день — и начало, и конец */
function inPeriod(date: Date, position: "start" | "middle" | "end"): boolean {
  if (!model.value || !type) return false;
  const from = model.value;
  const to = getToDate(from, type);
  const day = wallDateToDayTs(date);
  if (to <= from) return day === from && position !== "middle";
  if (position === "start") return day === from;
  if (position === "end") return day === to;
  return day > from && day < to;
}

function syncParams(instance: Calendar.Calendar): void {
  instance.params.minDate = dayTsToWallDate(minDate);
  instance.params.disabled = (date: Date) =>
    !type || !isValidDate(wallDateToDayTs(date), type, restrictions);
}

function syncValue(instance: Calendar.Calendar): void {
  const current = instance.value?.[0];
  if (model.value) {
    if (!current || wallDateToDayTs(current) !== model.value) {
      instance.setValue([dayTsToWallDate(model.value)]);
    }
  } else if (current) {
    instance.setValue([]);
  }
  // Закрытый календарь отрисуется заново при открытии, а update() без разметки падает
  if (instance.opened) instance.update();
}

onMounted(() => {
  if (!inputEl.value) return;

  const instance = f7.calendar.create({
    inputEl: inputEl.value,
    openIn: "auto",
    cssClass: "rite-calendar",
    // На телефоне календарь открывается листом: подложка и закрытие по ней, как у остальных листов
    backdrop: true,
    closeByBackdropClick: true,
    closeOnSelect: true,
    firstDay: 1,
    weekendDays: [0],
    monthNames: MONTH_NAMES,
    dayNamesShort: DAY_NAMES_SHORT,
    toolbarCloseText: "Готово",
    // Надпись в поле собираем сами: период, а не один день
    formatValue: () => label.value,
    rangesClasses: [
      { cssClass: "rite-day-start", range: (date: Date) => inPeriod(date, "start") },
      { cssClass: "rite-day-middle", range: (date: Date) => inPeriod(date, "middle") },
      { cssClass: "rite-day-end", range: (date: Date) => inPeriod(date, "end") },
    ],
    on: {
      change: (_calendar: Calendar.Calendar, values: unknown) => {
        const picked = (values as Date[])[0];
        if (picked) model.value = wallDateToDayTs(picked);
      },
    },
  });
  calendar = instance;
  syncParams(instance);
  syncValue(instance);
});

// Тип, ограничения и выбранный день влияют на допустимые и подсвеченные дни
watch([() => type, () => minDate, () => restrictions, model], () => {
  if (!calendar) return;
  syncParams(calendar);
  syncValue(calendar);
});

onBeforeUnmount(() => {
  calendar?.destroy();
  calendar = null;
});
</script>

<style lang="less">
// Календарь рендерится вне записки (лист или поповер), поэтому стили не привязаны к .rite-popup
.sheet-modal.rite-calendar {
  --f7-sheet-bg-color: #fff;
  --f7-toolbar-bg-color: #fff;
  background: #fff;
}

.popover.calendar-popover:has(.rite-calendar) {
  --f7-popover-bg-color: #fff;
  --f7-toolbar-bg-color: #fff;
  background: #fff;
}

.rite-calendar {
  // Сетка как в макете: белая, числа чёрные. Иначе проценты чёрного не читаются на тёмной теме
  --f7-calendar-sheet-bg-color: #fff;
  --f7-calendar-modal-bg-color: #fff;
  --f7-calendar-week-header-bg-color: #fff;
  --f7-calendar-week-header-text-color: var(--content-color-black-60);
  --rite-range-bg: #f4e6c7;

  color: #1f1b1a;
  background: #fff;

  .toolbar {
    --f7-toolbar-bg-color: #fff;
    background: #fff;
  }

  .calendar-month-selector,
  .calendar-year-selector,
  .toolbar a {
    color: #1f1b1a;
  }

  .calendar-day-number {
    font-weight: 700;
    background: none;
    color: inherit;
  }

  .calendar-day {
    color: #1f1b1a;
  }

  .calendar-day-weekend {
    color: var(--red-r-100);
  }

  // Числа соседнего месяца
  .calendar-day-prev,
  .calendar-day-next {
    color: var(--content-color-black-60);

    &.calendar-day-weekend {
      color: var(--red-r-60);
    }
  }

  // Недоступные для выбора: и этого месяца, и соседнего
  .calendar-day-disabled {
    color: var(--content-color-black-20);

    &.calendar-day-weekend {
      color: rgba(235, 87, 87, 0.2);
    }
  }

  // Выбранный день не красится кругом темы: цвет даёт полоса периода
  .calendar-day-selected .calendar-day-number {
    background: none;
    color: inherit;
  }

  // Период поминовения: сплошная бежевая полоса, концы скруглены, как в макете
  .calendar-day.rite-day-start,
  .calendar-day.rite-day-middle,
  .calendar-day.rite-day-end {
    // Иначе полоса позиционируется от строки и растягивается на всю неделю
    position: relative;
    color: #1f1b1a;

    &.calendar-day-weekend {
      color: var(--red-r-100);
    }

    &::before {
      content: "";
      position: absolute;
      z-index: 0;
      top: 50%;
      left: 0;
      width: 100%;
      height: 70%; //28px;
      background: var(--rite-range-bg);
      transform: translateY(-50%);
    }

    .calendar-day-number {
      z-index: 1;
      background: none;
      color: inherit;
    }
  }

  .calendar-day.rite-day-start::before {
    border-radius: 40px 0 0 40px;
  }

  .calendar-day.rite-day-end::before {
    border-radius: 0 40px 40px 0;
  }

  // Полоса продолжается на соседней неделе: у края строки небольшое скругление
  .calendar-day.rite-day-middle:first-child::before,
  .calendar-day.rite-day-end:first-child::before {
    border-top-left-radius: 2px;
    border-bottom-left-radius: 2px;
  }

  .calendar-day.rite-day-middle:last-child::before,
  .calendar-day.rite-day-start:last-child::before {
    border-top-right-radius: 2px;
    border-bottom-right-radius: 2px;
  }

  // Однодневная треба: тот же беж, что у периода, кругом на один день
  .calendar-day.rite-day-start.rite-day-end::before {
    border-radius: 40px;
  }

  .calendar-day-today .calendar-day-number {
    background: none;
    color: inherit;
  }
}

// Лист календаря рисуется поверх попапа, поэтому подложка должна быть выше попапа
html:has(.rite-calendar.modal-in) .sheet-backdrop.backdrop-in {
  z-index: 12000;
}
</style>
