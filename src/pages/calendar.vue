<template>
  <f7-page name="calendar">
    <f7-navbar>
      <f7-nav-left>
        <f7-link panel-open="left">
          <SvgIcon icon="burger" :size="32" />
        </f7-link>
      </f7-nav-left>
      <f7-nav-title>Календарь</f7-nav-title>
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

    <div v-if="calendarView === 'month'" class="calendar-placeholder">
      Календарь: месяц
    </div>
    <div v-else-if="calendarView === 'week'" class="calendar-placeholder">
      Календарь: неделя
    </div>
    <div v-else class="calendar-placeholder">
      Календарь: день
    </div>
  </f7-page>
</template>
<script setup>
import { computed, ref } from "vue";
import { f7 } from "framework7-vue";
import { useTheme } from "@/composables/useTheme";
import SvgIcon from "@/components/SvgIcon.vue";
import CalendarViewFilter from "@/components/calendar/CalendarViewFilter.vue";

const { isDarkMode } = useTheme();
const calendarView = ref("month");
const navIconColor = computed(() => (isDarkMode.value ? "baige-90" : "black-primary"));

const closeViewFilter = () => {
  f7.popover.close(".calendar-view-filter-popover");
};
</script>

<style scoped lang="less">
.calendar-placeholder {
  padding: 16px;
  font-family: var(--font-family);
  font-size: 16px;
  line-height: 1.3;
  color: var(--content-color-black-primary);
}

.dark .calendar-placeholder {
  color: var(--content-color-baige-90);
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
