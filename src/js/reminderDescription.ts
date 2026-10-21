import type { DeepReadonly } from "vue";
import type { EventReminder, PrayerRule, ReminderOffset } from "@/stores/reminders";

export const REMINDER_OFFSET_ORDER: ReminderOffset[] = ["day0", "day1", "day2", "day3", "day5", "week"];

export const REMINDER_OFFSET_LABELS: Record<ReminderOffset, string> = {
  day0: "в день события",
  day1: "за 1 день",
  day2: "за 2 дня",
  day3: "за 3 дня",
  day5: "за 5 дней",
  week: "за неделю",
};

const NOTHING_SELECTED = "Ничего не выбрано";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** «В день события, за 1 день, в 09:00» */
export function describeEventReminder(reminder: EventReminder): string {
  const offsets = REMINDER_OFFSET_ORDER.filter((key) => reminder.offsets[key]).map(
    (key) => REMINDER_OFFSET_LABELS[key]
  );
  if (!offsets.length) return NOTHING_SELECTED;
  return capitalize(`${offsets.join(", ")}, в ${reminder.time}`);
}

/** «По будням в 08:00, 21:00; по выходным в 08:00, 21:00» */
export function describePrayerRule(rule: DeepReadonly<PrayerRule>): string {
  const parts: string[] = [];
  if (rule.weekdays.enabled && rule.weekdays.times.length) {
    parts.push(`по будням в ${rule.weekdays.times.join(", ")}`);
  }
  if (rule.weekends.enabled && rule.weekends.times.length) {
    parts.push(`по выходным в ${rule.weekends.times.join(", ")}`);
  }
  if (!parts.length) return NOTHING_SELECTED;
  return capitalize(parts.join("; "));
}
