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
import { f7, useStore } from 'framework7-vue';


export default {
  props: {
    f7route: Object,
  },
  setup(props) {
    const days = useStore('days');
    const dayId = props.f7route.params.id;
    let currentDay;
    days.value.forEach(function (day) {
      if (day.id === dayId) {
        currentDay = day;
      }
    });

    if (!currentDay) {
      currentDay = {
        id: dayId,
        title: 'День ' + dayId,
        description: 'Описание дня ' + dayId
      }
    }

    console.log(`App version:`, f7.store.state.version);

    return {
      day: currentDay,
    };
  },
};
</script>
