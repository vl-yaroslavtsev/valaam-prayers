<template>
  <f7-page name="calendar">
    <f7-navbar title="Календарь"></f7-navbar>
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

const calendarStore = useCalendarStore();
const days = computed(() => calendarStore.getDays());

</script>
