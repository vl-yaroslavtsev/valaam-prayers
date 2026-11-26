<template>
  <f7-page
    ref="pageRef"
    name="calendar"
    :page-content="false"
    @page:afterin="refreshToday"
    @page:tabshow="refreshToday"
  >
    <f7-navbar transparent>
      <f7-nav-left>
        <f7-link panel-open="left">
          <SvgIcon icon="burger" :size="32" />
        </f7-link>
      </f7-nav-left>
      <f7-nav-title sliding>{{ navTitle }}</f7-nav-title>
      <f7-nav-right>
        <Transition name="calendar-today">
          <f7-link
            v-if="showTodayButton"
            icon-only
            aria-label="Сегодня"
            @click="goToToday"
          >
            <svg
              class="calendar-today-icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <g transform="translate(3.75 3.75)">
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M4.00098 4.25V3.5H2.25C1.83579 3.5 1.5 3.83579 1.5 4.25V14.25C1.5 14.6642 1.83579 15 2.25 15H14.25C14.6642 15 15 14.6642 15 14.25V4.25C15 3.83579 14.6642 3.5 14.25 3.5H12.501V4.25C12.501 4.66421 12.1652 5 11.751 5C11.3368 5 11.001 4.66421 11.001 4.25V3.5H5.50098V4.25C5.50098 4.66421 5.16519 5 4.75098 5C4.33676 5 4.00098 4.66421 4.00098 4.25ZM11.001 2H5.50098V0.75C5.50098 0.335786 5.16519 0 4.75098 0C4.33676 0 4.00098 0.335786 4.00098 0.75V2H2.25C1.00736 2 0 3.00736 0 4.25V14.25C0 15.4926 1.00736 16.5 2.25 16.5H14.25C15.4926 16.5 16.5 15.4926 16.5 14.25V4.25C16.5 3.00736 15.4926 2 14.25 2H12.501V0.75C12.501 0.335786 12.1652 0 11.751 0C11.3368 0 11.001 0.335786 11.001 0.75V2Z"
                  fill="currentColor"
                />
              </g>
              <text
                x="12"
                y="16.8"
                text-anchor="middle"
                fill="currentColor"
                class="calendar-today-day"
              >
                {{ todayDay }}
              </text>
            </svg>
          </f7-link>
        </Transition>
        <f7-link
          icon-only
          popover-open=".calendar-view-filter-popover"
          aria-label="Вид календаря"
        >
          <SvgIcon :icon="viewIcon" :color="navIconColor" :size="24" />
        </f7-link>
      </f7-nav-right>
    </f7-navbar>

    <f7-popover class="calendar-view-filter-popover no-arrow" :close-on-escape="true">
      <CalendarViewFilter v-model="calendarView" @update:model-value="closeViewFilter" />
    </f7-popover>

    <f7-page-content v-if="calendarView === 'month'">
      <CalendarMonth @select-day="openDay" />
    </f7-page-content>
    <CalendarWeek
      v-else-if="calendarView === 'week'"
      ref="weekRef"
      v-model="selectedDayCode"
      @select-day="openDay"
    />
    <CalendarDay v-else v-model="selectedDayCode" :f7router="f7router" />
  </f7-page>
</template>
<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { f7 } from "framework7-vue";
import { useTheme } from "@/composables/useTheme";
import SvgIcon from "@/components/SvgIcon.vue";
import CalendarViewFilter from "@/components/calendar/CalendarViewFilter.vue";
import CalendarMonth from "@/components/calendar/CalendarMonth.vue";
import CalendarDay from "@/components/calendar/CalendarDay.vue";
import CalendarWeek from "@/components/calendar/CalendarWeek.vue";
import { toDateCode } from "@/components/calendar/calendarMarkers";
import { formatDayShortDate, formatMonthTitle } from "@/components/calendar/dayFormat";
import { useCalendarStore } from "@/stores/calendar";
import { useSettingsStore } from "@/stores/settings";

defineProps({
  f7router: Object,
});

const { isDarkMode } = useTheme();
const calendarStore = useCalendarStore();
const settingsStore = useSettingsStore();
const pageRef = ref(null);
const weekRef = ref(null);
const today = ref(new Date());
const todayCode = computed(() => toDateCode(today.value));
const todayDay = computed(() => today.value.getDate());
const refreshToday = () => {
  today.value = new Date();
};
// Вид запоминается: при следующем открытии вкладки показывается тот же
const calendarView = computed({
  get: () => settingsStore.calendarView,
  set: (view) => settingsStore.setCalendarView(view),
});
// День, с которого открываются виды «неделя» и «день» (в них он же обновляется при прокрутке
// и может задаваться снаружи по диплинку #calendar:/days/YYYYMMDD); null - сегодняшний
const selectedDayCode = computed({
  get: () => calendarStore.selectedDayCode,
  set: (code) => calendarStore.setSelectedDayCode(code),
});
const showTodayButton = computed(
  () =>
    calendarView.value !== "month" &&
    selectedDayCode.value != null &&
    selectedDayCode.value !== todayCode.value
);
const navIconColor = computed(() => (isDarkMode.value ? "baige-90" : "black-primary"));
const VIEW_ICONS = {
  month: "calendar-month",
  week: "calendar-week",
  day: "calendar-day",
};
const viewIcon = computed(() => VIEW_ICONS[calendarView.value] ?? "calendar-month");
// В прозрачном навбаре заголовок появляется при прокрутке: в «дне» - дата («17 ноября»),
// в «неделе» - месяц верхнего дня
const navTitle = computed(() => {
  const code = selectedDayCode.value ?? todayCode.value;
  if (calendarView.value === "week") return formatMonthTitle(code);
  if (calendarView.value === "day") return formatDayShortDate(code);
  return "";
});

// При смене вида синхронизируем прозрачность навбара со scrollTop нового экрана
watch(calendarView, async () => {
  await nextTick();
  const pageEl = pageRef.value?.$el;
  if (!pageEl) return;
  const scrollEl =
    pageEl.querySelector("swiper-slide.swiper-slide-active .page-content") ??
    pageEl.querySelector(".page-content");
  scrollEl?.dispatchEvent(new Event("scroll"));
});

const closeViewFilter = () => {
  f7.popover.close(".calendar-view-filter-popover");
};

const openDay = (code) => {
  selectedDayCode.value = code;
  calendarView.value = "day";
};

const goToToday = () => {
  refreshToday();
  const code = todayCode.value;
  selectedDayCode.value = code;
  if (calendarView.value === "week") {
    weekRef.value?.scrollToDay(code);
  }
};
</script>

<style scoped lang="less">
.calendar-today-icon {
  width: 24px;
  height: 24px;
  display: block;
}

.calendar-today-day {
  font-family: var(--font-family);
  font-size: 9px;
  font-weight: 700;
}

.calendar-today-enter-active,
.calendar-today-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.calendar-today-enter-from,
.calendar-today-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

.calendar-view-filter-popover {
  --f7-popover-width: 230px;
  --f7-list-margin-vertical: 0;
  --f7-list-item-padding-horizontal: 16px;
  --f7-block-padding-horizontal: 16px;
  --f7-list-item-min-height: 48px;
  --f7-list-item-media-margin: 8px;
  --f7-list-font-size: var(--mobile-main-text-regular-b3);
  --f7-list-item-title-font-size: var(--mobile-main-text-regular-b3);
  --f7-list-item-title-line-height: var(--mobile-main-text-regular-b3-line-height);
  --f7-list-item-border-color: transparent;

  padding-top: 8px;
  padding-bottom: 8px;

  &.no-arrow {
    :deep(.popover-arrow) {
      display: none;
    }
  }
}
</style>

<style lang="less">
.calendar-view-filter-popover.popover {
  --f7-list-item-title-text-color: var(--content-color-black-60);
  --f7-list-chevron-icon-area: 0;
  --f7-popover-width: 280px;

  .item-link .item-inner::before,
  .item-link .item-inner::after {
    display: none;
  }

  .calendar-view-filter-heading {
    --f7-list-item-title-text-color: var(--content-color-black-primary);
  }

  .is-active {
    --f7-list-item-title-text-color: var(--content-color-black-primary);
  }
}

.dark .calendar-view-filter-popover.popover,
.calendar-view-filter-popover.popover.dark {
  --f7-list-item-title-text-color: var(--content-color-baige-60);

  .calendar-view-filter-heading,
  .is-active {
    --f7-list-item-title-text-color: var(--content-color-white-100);
  }
}
</style>
