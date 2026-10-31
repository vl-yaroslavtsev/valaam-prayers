import { defineStore } from "pinia";
import { ref, readonly } from "vue";
import { scheduleReminderSync, type ReminderSyncMode } from "@/services/native/reminderCalendar";

export const REMINDERS_STORAGE_KEY = "valaam-prayers-reminders";

export type ReminderOffset = "day0" | "day1" | "day2" | "day3" | "day5" | "week";
export type EventReminderSectionId = "holidays" | "memorial" | "fasting";
export type PrayerRuleGroupId = "weekdays" | "weekends";

/** Напоминание о событиях (праздники, поминовения, посты): одно время, набор смещений. */
export interface EventReminder {
  enabled: boolean;
  offsets: Record<ReminderOffset, boolean>;
  /** "HH:mm" */
  time: string;
}

export interface PrayerRuleGroup {
  enabled: boolean;
  /** "HH:mm" */
  times: string[];
}

export interface PrayerRule {
  enabled: boolean;
  weekdays: PrayerRuleGroup;
  weekends: PrayerRuleGroup;
}

export interface RemindersState {
  holidays: EventReminder;
  memorial: EventReminder;
  fasting: EventReminder;
  prayerRule: PrayerRule;
}

export const DEFAULT_EVENT_TIME = "09:00";
export const DEFAULT_NEW_PRAYER_TIME = "12:00";

const createEventReminder = (): EventReminder => ({
  enabled: false,
  offsets: { day0: false, day1: true, day2: false, day3: false, day5: false, week: false },
  time: DEFAULT_EVENT_TIME,
});

const createDefaultState = (): RemindersState => ({
  holidays: createEventReminder(),
  memorial: createEventReminder(),
  fasting: createEventReminder(),
  prayerRule: {
    enabled: false,
    weekdays: { enabled: true, times: ["08:00", "21:00"] },
    weekends: { enabled: true, times: ["10:00", "23:00"] },
  },
});

const isTime = (value: unknown): value is string =>
  typeof value === "string" && /^\d{2}:\d{2}$/.test(value);

const mergeEventReminder = (
  base: EventReminder,
  saved: Partial<EventReminder> | undefined
): EventReminder => {
  if (!saved || typeof saved !== "object") return base;
  const offsets = { ...base.offsets };
  (Object.keys(offsets) as ReminderOffset[]).forEach((key) => {
    if (typeof saved.offsets?.[key] === "boolean") offsets[key] = saved.offsets[key];
  });
  return {
    enabled: typeof saved.enabled === "boolean" ? saved.enabled : base.enabled,
    offsets,
    time: isTime(saved.time) ? saved.time : base.time,
  };
};

const mergeGroup = (
  base: PrayerRuleGroup,
  saved: Partial<PrayerRuleGroup> | undefined
): PrayerRuleGroup => {
  if (!saved || typeof saved !== "object") return base;
  return {
    enabled: typeof saved.enabled === "boolean" ? saved.enabled : base.enabled,
    times: Array.isArray(saved.times) ? saved.times.filter(isTime) : base.times,
  };
};

export const useRemindersStore = defineStore("reminders", () => {
  const state = ref<RemindersState>(createDefaultState());

  const save = () => {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(state.value));
  };

  const sync = (mode: ReminderSyncMode) => {
    scheduleReminderSync(mode, () => state.value);
  };

  const load = () => {
    const raw = localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (raw === null) return;
    try {
      const saved = JSON.parse(raw) as Partial<RemindersState>;
      const defaults = createDefaultState();
      state.value = {
        holidays: mergeEventReminder(defaults.holidays, saved.holidays),
        memorial: mergeEventReminder(defaults.memorial, saved.memorial),
        fasting: mergeEventReminder(defaults.fasting, saved.fasting),
        prayerRule: {
          enabled:
            typeof saved.prayerRule?.enabled === "boolean"
              ? saved.prayerRule.enabled
              : defaults.prayerRule.enabled,
          weekdays: mergeGroup(defaults.prayerRule.weekdays, saved.prayerRule?.weekdays),
          weekends: mergeGroup(defaults.prayerRule.weekends, saved.prayerRule?.weekends),
        },
      };
    } catch {
      // Битые данные: остаёмся на значениях по умолчанию
    }
  };

  const setEventEnabled = (id: EventReminderSectionId, enabled: boolean) => {
    state.value[id].enabled = enabled;
    save();
    sync("interactive");
  };

  const setEventOffset = (id: EventReminderSectionId, offset: ReminderOffset, value: boolean) => {
    state.value[id].offsets[offset] = value;
    save();
    sync("interactive");
  };

  const setEventTime = (id: EventReminderSectionId, time: string) => {
    state.value[id].time = time;
    save();
    sync("interactive");
  };

  const setPrayerRuleEnabled = (enabled: boolean) => {
    state.value.prayerRule.enabled = enabled;
    save();
    sync("interactive");
  };

  const setPrayerGroupEnabled = (group: PrayerRuleGroupId, enabled: boolean) => {
    state.value.prayerRule[group].enabled = enabled;
    save();
    sync("interactive");
  };

  const setPrayerTime = (group: PrayerRuleGroupId, index: number, time: string) => {
    const times = state.value.prayerRule[group].times;
    if (index < 0 || index >= times.length) return;
    times[index] = time;
    save();
    sync("interactive");
  };

  const addPrayerTime = (group: PrayerRuleGroupId, time = DEFAULT_NEW_PRAYER_TIME) => {
    state.value.prayerRule[group].times.push(time);
    save();
    sync("interactive");
  };

  const removePrayerTime = (group: PrayerRuleGroupId, index: number) => {
    state.value.prayerRule[group].times.splice(index, 1);
    save();
    sync("interactive");
  };

  const initStore = async () => {
    load();
    sync("startup");
  };

  return {
    state: readonly(state),
    setEventEnabled,
    setEventOffset,
    setEventTime,
    setPrayerRuleEnabled,
    setPrayerGroupEnabled,
    setPrayerTime,
    addPrayerTime,
    removePrayerTime,
    initStore,
  };
});
