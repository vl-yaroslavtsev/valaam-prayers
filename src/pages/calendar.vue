<template>
  <f7-page name="calendar" :page-content="false">
    <f7-navbar>
      <f7-nav-left>
        <f7-link panel-open="left">
          <SvgIcon icon="burger" :size="32" />
        </f7-link>
      </f7-nav-left>
      <f7-nav-title>{{ navTitle }}</f7-nav-title>
      <f7-nav-right>
        <f7-link
          icon-only
          popover-open=".calendar-view-filter-popover"
          aria-label="Вид календаря"
        >
          <SvgIcon icon="more-vertical" :color="navIconColor" :size="24" />
        </f7-link>
      </f7-nav-right>
    </f7-navbar>

    <f7-popover class="calendar-view-filter-popover no-arrow" :close-on-escape="true">
      <CalendarViewFilter v-model="calendarView" @update:model-value="closeViewFilter" />
    </f7-popover>

    <f7-page-content v-if="calendarView === 'month'">
      <CalendarMonth @select-day="openDay" />
    </f7-page-content>
    <CalendarWeek v-else-if="calendarView === 'week'" v-model="selectedDayCode" @select-day="openDay" />
    <CalendarDay v-else v-model="selectedDayCode" :f7router="f7router" />
  </f7-page>
</template>
<script setup>
import { computed, ref } from "vue";
import { f7 } from "framework7-vue";
import { useTheme } from "@/composables/useTheme";
import SvgIcon from "@/components/SvgIcon.vue";
import CalendarViewFilter from "@/components/calendar/CalendarViewFilter.vue";
import CalendarMonth from "@/components/calendar/CalendarMonth.vue";
import CalendarDay from "@/components/calendar/CalendarDay.vue";
import CalendarWeek from "@/components/calendar/CalendarWeek.vue";
import { toDateCode } from "@/components/calendar/calendarMarkers";
import { formatMonthTitle } from "@/components/calendar/dayFormat";
import { useSettingsStore } from "@/stores/settings";

defineProps({
  f7router: Object,
});

const { isDarkMode } = useTheme();
const settingsStore = useSettingsStore();
// Вид запоминается: при следующем открытии вкладки показывается тот же
const calendarView = computed({
  get: () => settingsStore.calendarView,
  set: (view) => settingsStore.setCalendarView(view),
});
// День, с которого открываются виды «неделя» и «день» (в них он же обновляется при прокрутке);
// null - сегодняшний
const selectedDayCode = ref(null);
const navIconColor = computed(() => (isDarkMode.value ? "baige-90" : "black-primary"));
// В виде «неделя» в заголовке месяц дня, который сейчас вверху экрана
const navTitle = computed(() =>
  calendarView.value === "week"
    ? formatMonthTitle(selectedDayCode.value ?? toDateCode(new Date()))
    : "Календарь"
);

const closeViewFilter = () => {
  f7.popover.close(".calendar-view-filter-popover");
};

const openDay = (code) => {
  selectedDayCode.value = code;
  calendarView.value = "day";
};
</script>

<style scoped lang="less">
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
