<template>
  <f7-page name="day">
    <f7-navbar :title="day.title" back-link="Back"></f7-navbar>
    <f7-block-title>День {{ day.id }}</f7-block-title>
    <f7-block>
      {{ day.description }}
    </f7-block>
  </f7-page>
</template>
<script>
import { useCalendarStore } from "@/stores/calendar";

export default {
  props: {
    f7route: Object,
  },
  setup(props) {
    const calendarStore = useCalendarStore();
    const dayId = props.f7route.params.id;
    let currentDay = calendarStore.getDayById(dayId);

    if (!currentDay) {
      currentDay = {
        id: dayId,
        title: "День " + dayId,
        description: "Описание дня " + dayId,
      };
    }

    return {
      day: currentDay,
    };
  },
};
</script>
