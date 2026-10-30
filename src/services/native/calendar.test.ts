import { afterEach, describe, expect, it } from "vitest";
import { getNativePlatform } from "@/services/native/nativeRpc";
import { ensureNativeCalendar, isNativeCalendarAvailable, nativeCalendar } from "@/services/native/calendar";
import { CALENDAR_RESULT_MESSAGE } from "@/services/native/protocol";
import { FakeNativeBackend, type NativePlatform } from "@/test/fakeNativeBackend";

describe("календарь без моста", () => {
  it("в браузере календарь недоступен", async () => {
    expect(await ensureNativeCalendar()).toBe(false);
    expect(isNativeCalendarAvailable()).toBe(false);
  });
});

describe("календарь без capability", () => {
  let uninstall: () => void;

  afterEach(() => uninstall?.());

  it("старая нативка без calendar не принимается", async () => {
    uninstall = new FakeNativeBackend().install({ capabilities: ["db", "download"] });

    expect(await ensureNativeCalendar()).toBe(false);
    expect(isNativeCalendarAvailable()).toBe(false);
  });
});

describe.each<NativePlatform>(["android", "ios"])("календарь (%s)", (platform) => {
  let backend: FakeNativeBackend;
  let uninstall: () => void;

  afterEach(() => uninstall?.());

  const install = () => {
    backend = new FakeNativeBackend();
    uninstall = backend.install({ platform, capabilities: ["db", "calendar"] });
  };

  it("рукопожатие открывает календарь и сообщает платформу", async () => {
    install();

    expect(isNativeCalendarAvailable()).toBe(false);
    expect(await ensureNativeCalendar()).toBe(true);
    expect(isNativeCalendarAvailable()).toBe(true);
    expect(getNativePlatform()).toBe(platform);
  });

  it("addEvents и deleteEvents уходят в RPC как есть", async () => {
    install();
    backend.on("calendar.addEvents", () => ({
      results: [{ id: "a", success: false, message: CALENDAR_RESULT_MESSAGE.PERMISSION_DENIED }],
    }));
    backend.on("calendar.deleteEvents", () => ({
      results: [{ id: "a", success: true }],
    }));

    const added = await nativeCalendar.addEvents({
      events: [{ id: "a", title: "Рождество", date: "2026-01-07T09:00:00" }],
      target: "sync",
    });
    const deleted = await nativeCalendar.deleteEvents({ ids: ["a"] });

    expect(added.results).toEqual([
      { id: "a", success: false, message: CALENDAR_RESULT_MESSAGE.PERMISSION_DENIED },
    ]);
    expect(deleted.results).toEqual([{ id: "a", success: true }]);
    expect(backend.callsOf("calendar.addEvents")).toEqual([
      { events: [{ id: "a", title: "Рождество", date: "2026-01-07T09:00:00" }], target: "sync" },
    ]);
    expect(backend.callsOf("calendar.deleteEvents")).toEqual([{ ids: ["a"] }]);
  });

  it("запрос права возвращает ответ нативки", async () => {
    install();
    backend.on("calendar.requestPermissions", () => ({ granted: true }));

    expect(await nativeCalendar.requestPermissions()).toEqual({ granted: true });
  });
});
