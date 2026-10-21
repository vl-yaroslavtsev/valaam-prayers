import { describe, expect, it } from "vitest";
import { describeEventReminder, describePrayerRule } from "@/js/reminderDescription";
import type { EventReminder, PrayerRule } from "@/stores/reminders";

const event = (overrides: Partial<EventReminder["offsets"]>, time = "09:00"): EventReminder => ({
  enabled: true,
  offsets: { day0: false, day1: false, day2: false, day3: false, day5: false, week: false, ...overrides },
  time,
});

describe("describeEventReminder", () => {
  it("перечисляет смещения по порядку и добавляет время", () => {
    expect(describeEventReminder(event({ week: true, day0: true, day1: true }))).toBe(
      "В день события, за 1 день, за неделю, в 09:00"
    );
  });

  it("«за 2 дня» стоит между «за 1 день» и «за 3 дня»", () => {
    expect(describeEventReminder(event({ day3: true, day2: true, day1: true }))).toBe(
      "За 1 день, за 2 дня, за 3 дня, в 09:00"
    );
  });

  it("первое смещение не «в день события» — всё равно с заглавной", () => {
    expect(describeEventReminder(event({ day3: true }, "18:30"))).toBe("За 3 дня, в 18:30");
  });

  it("если ничего не выбрано — сообщает об этом", () => {
    expect(describeEventReminder(event({}))).toBe("Ничего не выбрано");
  });
});

describe("describePrayerRule", () => {
  const rule = (over: Partial<PrayerRule>): PrayerRule => ({
    enabled: true,
    weekdays: { enabled: true, times: ["08:00", "21:00"] },
    weekends: { enabled: true, times: ["09:00"] },
    ...over,
  });

  it("описывает будни и выходные", () => {
    expect(describePrayerRule(rule({}))).toBe("По будням в 08:00, 21:00; по выходным в 09:00");
  });

  it("пропускает выключенную подгруппу", () => {
    expect(
      describePrayerRule(rule({ weekdays: { enabled: false, times: ["08:00"] } }))
    ).toBe("По выходным в 09:00");
  });

  it("если нечего показывать — сообщает об этом", () => {
    expect(
      describePrayerRule(
        rule({
          weekdays: { enabled: true, times: [] },
          weekends: { enabled: false, times: ["09:00"] },
        })
      )
    ).toBe("Ничего не выбрано");
  });
});
