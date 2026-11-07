<template>
  <div class="rite-date">
    <SvgIcon class="rite-date__icon" icon="calendar" :size="16" color="primary-accent-50" />
    <input
      ref="inputEl"
      class="rite-date__input"
      type="text"
      name="date"
      aria-label="Дата поминовения"
      :value="label"
      :disabled="disabled"
    />
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

/** Один день или период: «27 ноября 2026» / «27 ноября - 5 января 2027» */
const label = computed(() => {
  if (!model.value) return "";
  const from = model.value;
  const to = type ? getToDate(from, type) : from;
  const period = formatPeriodLong({ from: { ts: from, value: "" }, to: { ts: to, value: "" } });
  return period ? [period.from, period.to].filter(Boolean).join(" - ") : "";
});

/** Подсветка дней поминовения: начало, середина и конец периода */
function inPeriod(date: Date, position: "start" | "middle" | "end"): boolean {
  if (!model.value || !type) return false;
  const from = model.value;
  const to = getToDate(from, type);
  if (to <= from) return false;
  const day = wallDateToDayTs(date);
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
.rite-calendar {
  --f7-calendar-sheet-bg-color: var(--f7-popover-bg-color);
  --f7-calendar-modal-bg-color: var(--f7-popover-bg-color);
  --rite-range-bg: rgba(161, 109, 79, 0.3);

  // Период поминовения: полоса от первого до последнего дня, концы половинные
  .calendar-day.rite-day-middle {
    background: var(--rite-range-bg);
  }

  .calendar-day.rite-day-start {
    background: linear-gradient(90deg, transparent 50%, var(--rite-range-bg) 50%);
  }

  .calendar-day.rite-day-end {
    background: linear-gradient(90deg, var(--rite-range-bg) 50%, transparent 50%);
  }
}
</style>
