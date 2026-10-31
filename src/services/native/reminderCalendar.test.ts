import { afterEach, describe, expect, it, vi } from "vitest";
import { planReminderEvents } from "@/js/reminderCalendarPlan";
import { resetReminderCalendarForTests, scheduleReminderSync } from "@/services/native/reminderCalendar";
import { CALENDAR_RESULT_MESSAGE } from "@/services/native/protocol";
import type { RemindersState } from "@/stores/reminders";
import { FakeNativeBackend, type NativePlatform } from "@/test/fakeNativeBackend";

const { dialogMock } = vi.hoisted(() => ({
  dialogMock: {
    create: vi.fn(),
    alert: vi.fn(),
  },
}));

vi.mock("framework7-vue", () => ({
  f7: {
    dialog: dialogMock,
  },
}));

const offsets = {
  day0: false,
  day1: true,
  day2: false,
  day3: false,
  day5: false,
  week: false,
};

const reminders = (enabled: boolean): RemindersState => ({
  holidays: { enabled, offsets, time: "09:00" },
  memorial: { enabled: false, offsets, time: "09:00" },
  fasting: { enabled: false, offsets, time: "09:00" },
  prayerRule: {
    enabled: false,
    weekdays: { enabled: true, times: ["08:00", "21:00"] },
    weekends: { enabled: true, times: ["08:00", "21:00"] },
  },
});

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

describe("синхронизация напоминаний", () => {
  let backend: FakeNativeBackend;
  let uninstall: () => void;

  afterEach(() => {
    uninstall?.();
    resetReminderCalendarForTests();
    localStorage.clear();
    delete (window as any).androidJsHandler;
    dialogMock.create.mockReset();
    dialogMock.alert.mockReset();
  });

  const install = (platform: NativePlatform) => {
    backend = new FakeNativeBackend();
    uninstall = backend.install({ platform, capabilities: ["db", "calendar"] });
    backend.on("calendar.hasPermissions", () => ({ granted: true }));
    backend.on("calendar.listEventIds", () => ({ events: [] }));
    backend.on("calendar.deleteEvents", () => ({ results: [] }));
    backend.on("calendar.updateEvents", () => ({ results: [] }));
    backend.on("calendar.addEvents", () => ({ results: [] }));
  };

  it("лишний id нативки удаляется, чужой id остаётся", async () => {
    install("android");
    backend.on("calendar.listEventIds", () => ({
      events: [
        { id: "reminder:holidays:Y0107", revision: "09:00|Рождество Христово|day1|20270107" },
        { id: "test-event", revision: "" },
      ],
    }));
    backend.on("calendar.deleteEvents", ({ ids }) => ({
      results: ids.map((id) => ({ id, success: true })),
    }));

    scheduleReminderSync("startup", () => reminders(false));
    await flush();

    expect(backend.callsOf("calendar.deleteEvents")).toEqual([{ ids: ["reminder:holidays:Y0107"] }]);
    expect(backend.callsOf("calendar.addEvents")).toEqual([]);
  });

  it("совпавший revision из нативки не создаётся заново", async () => {
    install("android");
    const desired = planReminderEvents(reminders(true), new Date());
    backend.on("calendar.listEventIds", () => ({
      events: desired.map((item) => ({ id: item.id, revision: item.revision })),
    }));

    scheduleReminderSync("startup", () => reminders(true));
    await flush();

    expect(backend.callsOf("calendar.addEvents")).toEqual([]);
    expect(backend.callsOf("calendar.deleteEvents")).toEqual([]);
    expect(backend.callsOf("calendar.updateEvents")).toEqual([]);
  });

  it("другой revision обновляет то же событие и не удаляет его", async () => {
    install("android");
    const desired = planReminderEvents(reminders(true), new Date());
    backend.on("calendar.listEventIds", () => ({
      events: desired.map((item) => ({ id: item.id, revision: "старое" })),
    }));
    backend.on("calendar.updateEvents", ({ events }) => ({
      results: events.map((event) => ({ id: event.id, success: true })),
    }));

    scheduleReminderSync("startup", () => reminders(true));
    await flush();

    expect(backend.callsOf("calendar.deleteEvents")).toEqual([]);
    const updated = backend.callsOf("calendar.updateEvents");
    expect(updated).toHaveLength(1);
    const christmas = updated[0].events.find((event: { id: string }) => event.id === "reminder:holidays:Y0107");
    expect(christmas.allDay).toBe(true);
    expect(christmas.url).toContain("/days/");
    expect(christmas.alarmDates?.length).toBeGreaterThan(0);
    expect(backend.callsOf("calendar.addEvents")).toEqual([]);
  });

  it("при отказе в правах предлагает открыть настройки через openSettings", async () => {
    install("android");
    let permissionRequests = 0;
    backend.on("calendar.hasPermissions", () => ({ granted: false }));
    backend.on("calendar.requestPermissions", () => {
      permissionRequests += 1;
      return { granted: false };
    });

    let createdDialog: any = null;
    let openedSettingsType: string | null = null;
    (window as any).androidJsHandler = {
      openSettings: (type: string) => {
        openedSettingsType = type;
      },
    };
    dialogMock.create.mockImplementation((params: any) => {
      createdDialog = {
        params,
        open: vi.fn(),
      };
      return createdDialog;
    });

    scheduleReminderSync("page", () => reminders(true));
    await flush();

    expect(permissionRequests).toBe(1);
    expect(createdDialog).not.toBeNull();
    expect(createdDialog.params.title).toBe("Нет доступа к календарю");
    expect(createdDialog.open).toHaveBeenCalled();

    const settingsBtn = createdDialog.params.buttons.find((btn: any) => btn.text === "Настройки");
    expect(settingsBtn).toBeDefined();

    settingsBtn.onClick();
    expect(openedSettingsType).toBe("settings");

    // После нажатия «Настройки» флаг permissionAsked сбрасывается для повторной проверки
    scheduleReminderSync("page", () => reminders(true));
    await flush();
    expect(permissionRequests).toBe(2);
  });
});
