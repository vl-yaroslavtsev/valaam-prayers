import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeNativeBackend } from "@/test/fakeNativeBackend";
import { getBridgeInfo, resetNativeRpcForTests } from "@/services/native/nativeRpc";
import {
  collectErrors,
  getConfirmedEmail,
  getSavedEmail,
  rememberConfirmedEmail,
  rememberConfirmedEmailFromUrl,
  requestGid,
  saveEmail,
  toErrorList,
} from "@/services/rites/ritesApi";

describe("разбор ошибок сервера", () => {
  const error = { code: "internal", description: "Система недоступна" };

  it("массив ошибок", () => {
    expect(toErrorList([error])).toEqual([error]);
  });

  it("одна ошибка объектом (так отвечают add и addManual)", () => {
    expect(toErrorList(error)).toEqual([error]);
  });

  it("объект со списком ошибок", () => {
    expect(toErrorList({ 0: error })).toEqual([error]);
  });

  it("пустые значения", () => {
    expect(toErrorList(undefined)).toEqual([]);
    expect(toErrorList([])).toEqual([]);
  });

  it("сначала ошибки полей, затем общие", () => {
    const field = { code: "badEmail", field: "email", description: "Неверный email" };
    expect(collectErrors({ fullErrors: [error], fieldsErrors: [field] })).toEqual([field, error]);
    expect(collectErrors(null)).toEqual([]);
  });
});

const MAIL_LINK =
  "/my?EMAIL=vl.yaroslavtsev@gmail.com%7C7d78cb3ba261cf6efa541e75f271aa17";
const CONFIRMED = "vl.yaroslavtsev@gmail.com|7d78cb3ba261cf6efa541e75f271aa17";

describe("почта из письма", () => {
  beforeEach(() => localStorage.clear());

  it("запоминает EMAIL с хэшем, а в поле показывает адрес без хэша", () => {
    rememberConfirmedEmailFromUrl(MAIL_LINK);

    expect(getConfirmedEmail()).toBe(CONFIRMED);
    expect(getSavedEmail()).toBe("vl.yaroslavtsev@gmail.com");
  });

  it("введённый адрес важнее подтверждённого", () => {
    rememberConfirmedEmail(CONFIRMED);
    saveEmail("typed@valaam.ru");

    expect(getSavedEmail()).toBe("typed@valaam.ru");
    expect(getConfirmedEmail()).toBe(CONFIRMED);
  });

  it("ссылка без EMAIL не затирает сохранённую почту", () => {
    rememberConfirmedEmail(CONFIRMED);
    rememberConfirmedEmailFromUrl("/rites/history/");
    rememberConfirmedEmailFromUrl("/my?EMAIL=");

    expect(getConfirmedEmail()).toBe(CONFIRMED);
  });
});

describe("requestGid", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ gid: "gid-42" }) }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    resetNativeRpcForTests();
    vi.unstubAllGlobals();
  });

  function setUserAgent(ua: string, extra: Record<string, unknown> = {}): void {
    vi.stubGlobal("navigator", {
      ...navigator,
      userAgent: ua,
      platform: "Win32",
      maxTouchPoints: 0,
      ...extra,
    });
  }

  it("в браузере Android запрашивает valaam.prayers.android", async () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile");

    await expect(requestGid()).resolves.toBe("gid-42");
    expect(String(fetchMock.mock.calls[0][0])).toContain("referer1=valaam.prayers.android");
  });

  it("в браузере iPhone запрашивает valaam.prayers.ios", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15");

    await requestGid();
    expect(String(fetchMock.mock.calls[0][0])).toContain("referer1=valaam.prayers.ios");
  });

  it("iPadOS, который притворяется Mac, считается iOS", async () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", {
      platform: "MacIntel",
      maxTouchPoints: 5,
    });

    await requestGid();
    expect(String(fetchMock.mock.calls[0][0])).toContain("referer1=valaam.prayers.ios");
  });

  it("на компьютере gid не запрашивает", async () => {
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0");

    await expect(requestGid()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("нативка задаёт платформу, даже если user agent другой", async () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36");
    const uninstall = new FakeNativeBackend().install({ platform: "ios" });
    try {
      await getBridgeInfo();
      await requestGid();
      expect(String(fetchMock.mock.calls[0][0])).toContain("referer1=valaam.prayers.ios");
    } finally {
      uninstall();
    }
  });
});
