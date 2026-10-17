<template>
  <f7-page name="day" :page-content="false">
    <f7-navbar :title="title" back-link />
    <CalendarDay v-model="dayCode" :f7router="f7router" />
  </f7-page>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { Router } from "framework7/types";
import CalendarDay from "@/components/calendar/CalendarDay.vue";
import { formatDayTitleDate } from "@/components/calendar/dayFormat";

const { id, f7router } = defineProps<{
  /** Код дня (YYYYMMDD) из адреса /days/:id */
  id?: string;
  f7router: Router.Router;
}>();

// День меняется свайпом слайдера, поэтому заголовок следует за ним
const dayCode = ref<string | null>(/^\d{8}$/.test(id ?? "") ? id! : null);

const title = computed(() => (dayCode.value ? formatDayTitleDate(dayCode.value) : "День"));
</script>
