import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { REMINDERS_STORAGE_KEY, useRemindersStore } from "@/stores/reminders";

describe("useRemindersStore", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("значения по умолчанию: всё выключено, «за 1 день», 9:00, правило 8:00 и 21:00", () => {
    const { state } = useRemindersStore();

    for (const id of ["holidays", "memorial", "fasting"] as const) {
      expect(state[id].enabled).toBe(false);
      expect(state[id].offsets).toEqual({
        day0: false,
        day1: true,
        day2: false,
        day3: false,
        day5: false,
        week: false,
      });
      expect(state[id].time).toBe("09:00");
    }
    expect(state.prayerRule.enabled).toBe(false);
    expect(state.prayerRule.weekdays.times).toEqual(["08:00", "21:00"]);
    expect(state.prayerRule.weekends.times).toEqual(["10:00", "23:00"]);
  });

  it("изменения сохраняются в localStorage и подхватываются после перезагрузки", async () => {
    const store = useRemindersStore();
    store.setEventEnabled("holidays", true);
    store.setEventOffset("holidays", "day0", true);
    store.setEventTime("fasting", "07:15");
    store.setPrayerRuleEnabled(true);

    expect(localStorage.getItem(REMINDERS_STORAGE_KEY)).not.toBeNull();

    setActivePinia(createPinia());
    const reloaded = useRemindersStore();
    await reloaded.initStore();

    expect(reloaded.state.holidays.enabled).toBe(true);
    expect(reloaded.state.holidays.offsets.day0).toBe(true);
    expect(reloaded.state.fasting.time).toBe("07:15");
    expect(reloaded.state.prayerRule.enabled).toBe(true);
  });

  it("добавляет, меняет и удаляет время молитвенного правила", () => {
    const store = useRemindersStore();

    store.addPrayerTime("weekdays");
    expect(store.state.prayerRule.weekdays.times).toEqual(["08:00", "21:00", "12:00"]);

    store.setPrayerTime("weekdays", 2, "13:45");
    store.removePrayerTime("weekdays", 0);

    expect(store.state.prayerRule.weekdays.times).toEqual(["21:00", "13:45"]);
    expect(store.state.prayerRule.weekends.times).toEqual(["10:00", "23:00"]);
  });

  it("битые данные в localStorage не ломают загрузку", async () => {
    localStorage.setItem(REMINDERS_STORAGE_KEY, "{not json");
    const store = useRemindersStore();
    await store.initStore();

    expect(store.state.holidays.time).toBe("09:00");
  });

  it("частично сохранённые данные дополняются значениями по умолчанию", async () => {
    localStorage.setItem(
      REMINDERS_STORAGE_KEY,
      JSON.stringify({ holidays: { enabled: true, time: "bad" } })
    );
    const store = useRemindersStore();
    await store.initStore();

    expect(store.state.holidays.enabled).toBe(true);
    expect(store.state.holidays.time).toBe("09:00");
    expect(store.state.holidays.offsets.day1).toBe(true);
    expect(store.state.prayerRule.weekdays.times).toEqual(["08:00", "21:00"]);
  });
});
