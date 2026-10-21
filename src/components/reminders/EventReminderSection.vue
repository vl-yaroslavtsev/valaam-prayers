<template>
  <ReminderSection
    :title="title"
    :description="describeEventReminder(reminder)"
    :enabled="reminder.enabled"
    @update:enabled="(value) => store.setEventEnabled(id, value)"
  >
    <f7-list class="reminder-list" no-hairlines>
      <f7-list-item
        v-for="offset in REMINDER_OFFSET_ORDER"
        :key="offset"
        :title="REMINDER_OFFSET_LABELS[offset]"
        :class="{ 'is-off': !reminder.offsets[offset] }"
      >
        <template #after>
          <f7-toggle
            small
            :checked="reminder.offsets[offset]"
            :disabled="!reminder.enabled"
            @change="(event: Event) => store.setEventOffset(id, offset, (event.target as HTMLInputElement).checked)"
          />
        </template>
      </f7-list-item>
    </f7-list>

    <div class="reminder-time-block">
      <div class="reminder-time-head">
        <SvgIcon icon="alarm" :color="iconColor" :size="24" />
        <span>Время:</span>
      </div>
      <ReminderTimeRow
        :model-value="reminder.time"
        :disabled="!reminder.enabled"
        @update:model-value="(value) => store.setEventTime(id, value)"
      />
    </div>
  </ReminderSection>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SvgIcon from "@/components/SvgIcon.vue";
import ReminderSection from "@/components/reminders/ReminderSection.vue";
import ReminderTimeRow from "@/components/reminders/ReminderTimeRow.vue";
import { useTheme } from "@/composables/useTheme";
import {
  describeEventReminder,
  REMINDER_OFFSET_LABELS,
  REMINDER_OFFSET_ORDER,
} from "@/js/reminderDescription";
import { useRemindersStore, type EventReminderSectionId } from "@/stores/reminders";

const props = defineProps<{
  id: EventReminderSectionId;
  title: string;
}>();

const store = useRemindersStore();
const reminder = computed(() => store.state[props.id]);

const { isDarkMode } = useTheme();
const iconColor = computed(() => (isDarkMode.value ? "baige-90" : "black-primary"));
</script>
