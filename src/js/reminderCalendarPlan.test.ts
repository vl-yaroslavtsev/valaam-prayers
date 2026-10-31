import { describe, expect, it } from "vitest";
import { calculateEaster } from "@/components/saint/memoDays";
import {
  diffReminderEvents,
  planReminderEvents,
  type StoredReminderEvent,
} from "@/js/reminderCalendarPlan";
import type { ReminderOffset, RemindersState } from "@/stores/reminders";

const offsets = (on: ReminderOffset[] = ["day1"]): Record<ReminderOffset, boolean> => ({
  day0: on.includes("day0"),
  day1: on.includes("day1"),
  day2: on.includes("day2"),
  day3: on.includes("day3"),
  day5: on.includes("day5"),
  week: on.includes("week"),
});

const state = (patch: Partial<RemindersState> = {}): RemindersState => ({
  holidays: { enabled: false, offsets: offsets(), time: "09:00" },
  memorial: { enabled: false, offsets: offsets(), time: "09:00" },
  fasting: { enabled: false, offsets: offsets(), time: "09:00" },
  prayerRule: {
    enabled: false,
    weekdays: { enabled: true, times: ["08:00", "21:00"] },
    weekends: { enabled: true, times: ["08:00", "21:00"] },
  },
  ...patch,
});

const ymd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

describe("planReminderEvents", () => {
  const october = new Date(2026, 9, 30, 12, 0, 0);

  it("постоянный праздник — одно событие на весь день со ссылкой на ближайший день и звонком накануне", () => {
    const planned = planReminderEvents(
      state({ holidays: { enabled: true, offsets: offsets(), time: "09:00" } }),
      october
    );
    const christmas = planned.find((item) => item.id === "reminder:holidays:Y0107");

    expect(christmas).toMatchObject({
      revision: "09:00|Рождество Христово|day1|20270107",
      event: {
        title: "Рождество Христово",
        date: "2027-01-07T00:00:00",
        allDay: true,
        url: "https://app.valaam.ru/webview/#calendar:/days/20270107",
        alarmDates: ["2027-01-06T09:00:00"],
        recurrence: { frequency: "yearly" },
      },
    });
  });

  it("несколько смещений — несколько напоминаний одного события", () => {
    const planned = planReminderEvents(
      state({
        holidays: { enabled: true, offsets: offsets(["day0", "day2"]), time: "09:00" },
      }),
      october
    );
    const christmas = planned.find((item) => item.id === "reminder:holidays:Y0107");

    expect(christmas?.event.alarmDates).toEqual(["2027-01-07T09:00:00", "2027-01-05T09:00:00"]);
    expect(christmas?.revision).toBe("09:00|Рождество Христово|day0,day2|20270107");
  });

  it("на следующий день после праздника ссылка переходит на следующий год", () => {
    const planned = planReminderEvents(
      state({ holidays: { enabled: true, offsets: offsets(), time: "09:00" } }),
      new Date(2027, 0, 8, 9, 0, 0)
    );

    expect(planned.find((item) => item.id === "reminder:holidays:Y0107")?.event.url).toBe(
      "https://app.valaam.ru/webview/#calendar:/days/20280107"
    );
  });

  it("в день праздника ссылка остаётся на этот год", () => {
    const planned = planReminderEvents(
      state({ holidays: { enabled: true, offsets: offsets(), time: "09:00" } }),
      new Date(2027, 0, 7, 18, 0, 0)
    );

    expect(planned.find((item) => item.id === "reminder:holidays:Y0107")?.event.date).toBe(
      "2027-01-07T00:00:00"
    );
  });

  it("прошедшая Пасха этого года не создаётся, следующая — одно событие без повторения", () => {
    const planned = planReminderEvents(
      state({ holidays: { enabled: true, offsets: offsets(), time: "09:00" } }),
      october
    );
    const easters = planned.filter((item) => item.id.startsWith("reminder:holidays:E:"));

    expect(easters.map((item) => item.id)).toEqual(["reminder:holidays:E:2027"]);
    expect(easters[0].event.recurrence).toBeUndefined();
    expect(easters[0].event.date.startsWith(ymd(calculateEaster(2027)))).toBe(true);
  });

  it("в начале года есть Пасха этого и следующего года", () => {
    const planned = planReminderEvents(
      state({ holidays: { enabled: true, offsets: offsets(), time: "09:00" } }),
      new Date(2027, 0, 15, 12, 0, 0)
    );
    const easters = planned.filter((item) => item.id.startsWith("reminder:holidays:E:"));

    expect(easters.map((item) => item.id)).toEqual(["reminder:holidays:E:2027", "reminder:holidays:E:2028"]);
  });

  it("выключенный раздел и раздел без смещений не дают событий", () => {
    const disabled = planReminderEvents(state(), october);
    const noOffsets = planReminderEvents(
      state({ fasting: { enabled: true, offsets: offsets([]), time: "09:00" } }),
      october
    );

    expect(disabled).toEqual([]);
    expect(noOffsets).toEqual([]);
  });

  it("утреннее правило раньше 15:00, вечернее — с 15:00, по своим дням недели", () => {
    const planned = planReminderEvents(
      state({
        prayerRule: {
          enabled: true,
          weekdays: { enabled: true, times: ["08:00", "15:00"] },
          weekends: { enabled: false, times: ["08:00"] },
        },
      }),
      october
    );

    expect(planned.map((item) => item.event.title)).toEqual(["Утреннее правило", "Вечернее правило"]);
    expect(planned[0].event).toMatchObject({
      date: "2026-11-02T08:00:00",
      url: "https://app.valaam.ru/webview/#prayers:/prayers/text/47166",
      recurrence: { frequency: "weekly", byDay: ["MO", "TU", "WE", "TH", "FR"] },
    });
    expect(planned[1].event).toMatchObject({
      date: "2026-10-30T15:00:00",
      url: "https://app.valaam.ru/webview/#prayers:/prayers/text/47167",
    });
    expect(planned[0].event.allDay).toBeUndefined();
  });
});

describe("diffReminderEvents", () => {
  const desired = planReminderEvents(
    state({ holidays: { enabled: true, offsets: offsets(), time: "09:00" } }),
    new Date(2026, 9, 30, 12, 0, 0)
  );
  const christmas = desired.find((item) => item.id === "reminder:holidays:Y0107")!;

  it("совпавший revision не пишется заново, даже если нативка id уже не помнит", () => {
    const stored: StoredReminderEvent[] = [{ id: christmas.id, revision: christmas.revision }];

    expect(diffReminderEvents(stored, [christmas], [])).toEqual({ deleteIds: [], add: [], update: [] });
  });

  it("id нативки, которого нет в списке, удаляется, чужой id не трогается", () => {
    const diff = diffReminderEvents([], [], ["reminder:holidays:E:2026", "test-event"]);

    expect(diff.deleteIds).toEqual(["reminder:holidays:E:2026"]);
    expect(diff.add).toEqual([]);
    expect(diff.update).toEqual([]);
  });

  it("смена времени обновляет то же событие и не снимает его", () => {
    const stored: StoredReminderEvent[] = [{ id: christmas.id, revision: "08:00|старое|day1|20270107" }];
    const diff = diffReminderEvents(stored, [christmas], [christmas.id]);

    expect(diff.deleteIds).toEqual([]);
    expect(diff.add).toEqual([]);
    expect(diff.update.map((item) => item.id)).toEqual([christmas.id]);
  });
});
