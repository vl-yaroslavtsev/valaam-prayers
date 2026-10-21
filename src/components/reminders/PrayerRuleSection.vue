<template>
  <ReminderSection
    title="О молитвенном правиле"
    :description="describePrayerRule(rule)"
    :enabled="rule.enabled"
    @update:enabled="(value) => store.setPrayerRuleEnabled(value)"
  >
    <template v-for="group in groups" :key="group.id">
      <f7-list class="reminder-list" no-hairlines>
        <f7-list-item
          :title="group.title"
          :class="{ 'is-off': !rule[group.id].enabled }"
        >
          <template #after>
            <f7-toggle
              small
              :checked="rule[group.id].enabled"
              :disabled="!rule.enabled"
              @change="(event: Event) => store.setPrayerGroupEnabled(group.id, (event.target as HTMLInputElement).checked)"
            />
          </template>
        </f7-list-item>
      </f7-list>

      <div
        class="reminder-time-block"
        :class="{ 'is-off': !rule[group.id].enabled }"
      >
        <div class="reminder-time-head">
          <SvgIcon icon="alarm" :color="iconColor" :size="24" />
          <span>Время:</span>
        </div>
        <ReminderTimeRow
          v-for="(time, index) in rule[group.id].times"
          :key="`${group.id}-${index}`"
          :model-value="time"
          :disabled="!rule.enabled || !rule[group.id].enabled"
          removable
          @update:model-value="(value) => store.setPrayerTime(group.id, index, value)"
          @remove="store.removePrayerTime(group.id, index)"
        />
        <f7-link
          class="reminder-add-time"
          :class="{ disabled: !rule.enabled || !rule[group.id].enabled }"
          @click="store.addPrayerTime(group.id)"
        >
          <span>Добавить время</span>
          <SvgIcon icon="plus" :color="iconColor" :size="24" />
        </f7-link>
      </div>
    </template>
  </ReminderSection>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SvgIcon from "@/components/SvgIcon.vue";
import ReminderSection from "@/components/reminders/ReminderSection.vue";
import ReminderTimeRow from "@/components/reminders/ReminderTimeRow.vue";
import { useTheme } from "@/composables/useTheme";
import { describePrayerRule } from "@/js/reminderDescription";
import { useRemindersStore, type PrayerRuleGroupId } from "@/stores/reminders";

const store = useRemindersStore();
const rule = computed(() => store.state.prayerRule);

const groups: { id: PrayerRuleGroupId; title: string }[] = [
  { id: "weekdays", title: "по будням" },
  { id: "weekends", title: "по выходным" },
];

const { isDarkMode } = useTheme();
const iconColor = computed(() => (isDarkMode.value ? "baige-90" : "black-primary"));
</script>
