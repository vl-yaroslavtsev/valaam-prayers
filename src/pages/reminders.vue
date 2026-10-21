<template>
  <f7-page name="reminders">
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
import EventReminderSection from "@/components/reminders/EventReminderSection.vue";
import PrayerRuleSection from "@/components/reminders/PrayerRuleSection.vue";
</script>