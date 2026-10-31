<template>
  <f7-page name="reminders" @page:afterin="onPageIn">
    <f7-navbar large transparent title="Напоминания" back-link></f7-navbar>

    <!-- Секции — свои компоненты, поэтому кладём их в слот list (прямо в <ul>) -->
    <f7-list accordion-list accordion-opposite dividers class="reminders-page">
      <template #list>
        <EventReminderSection id="holidays" title="О праздниках" />
        <EventReminderSection id="memorial" title="О поминовении усопших" />
        <EventReminderSection id="fasting" title="О постных днях" />
        <PrayerRuleSection />
      </template>
    </f7-list>
  </f7-page>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import EventReminderSection from "@/components/reminders/EventReminderSection.vue";
import PrayerRuleSection from "@/components/reminders/PrayerRuleSection.vue";
import { scheduleReminderSync } from "@/services/native/reminderCalendar";
import { useRemindersStore } from "@/stores/reminders";

const store = useRemindersStore();

const onPageIn = () => {
  scheduleReminderSync("page", () => store.state);
};

const onVisibilityChange = () => {
  if (document.visibilityState === "visible") {
    scheduleReminderSync("page", () => store.state);
  }
};

onMounted(() => {
  document.addEventListener("visibilitychange", onVisibilityChange);
});

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisibilityChange);
});
</script>
