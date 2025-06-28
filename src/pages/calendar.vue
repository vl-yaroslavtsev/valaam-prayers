<template>
  <f7-page name="calendar">
    <f7-navbar >
      <f7-nav-left>
        <f7-link panel-open="left">
          <SvgIcon icon="burger" :size="32" />
        </f7-link>
      </f7-nav-left>
      <f7-nav-title>Календарь</f7-nav-title>
    </f7-navbar>
    <f7-list strong dividers-ios outline-ios inset-md>
      <f7-list-item
        v-for="day in days"
        :key="day.id"
        :title="day.title"
        :link="`/days/${day.id}/`"
      ></f7-list-item>
    </f7-list>
  </f7-page>
</template>
<script setup>
import { computed } from "vue";
import { useCalendarStore } from "@/stores/calendar";
import SvgIcon from "@/components/SvgIcon.vue";

const calendarStore = useCalendarStore();
const days = computed(() => calendarStore.getDays());

</script>
