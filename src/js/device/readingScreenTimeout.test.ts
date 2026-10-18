import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { device } from "@/js/device";
import {
  SCREEN_TIMEOUT_MS,
  noteReadingInteraction,
  startReadingScreenTimeout,
  stopReadingScreenTimeout,
} from "./readingScreenTimeout";

const THROTTLE_MS = 5000;

describe("readingScreenTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(device, "keepScreenOn");
  });

  afterEach(() => {
    for (let i = 0; i < 5; i += 1) stopReadingScreenTimeout();
    vi.mocked(device.keepScreenOn).mockRestore();
  });

  it("держит экран 10 минут и затем отпускает", () => {
    startReadingScreenTimeout();

    expect(device.keepScreenOn).toHaveBeenCalledWith(true);

    vi.advanceTimersByTime(SCREEN_TIMEOUT_MS - 1);
    expect(device.keepScreenOn).not.toHaveBeenCalledWith(false);

    vi.advanceTimersByTime(1);
    expect(device.keepScreenOn).toHaveBeenCalledWith(false);
  });

  it("продлевает таймаут на 10 минут от касания", () => {
    startReadingScreenTimeout();
    vi.advanceTimersByTime(THROTTLE_MS + 1);

    document.dispatchEvent(new Event("touchstart"));

    vi.advanceTimersByTime(SCREEN_TIMEOUT_MS - 1);
    expect(device.keepScreenOn).not.toHaveBeenCalledWith(false);

    vi.advanceTimersByTime(1);
    expect(device.keepScreenOn).toHaveBeenLastCalledWith(false);
  });

  it("не сбрасывает таймер чаще чем раз в 5 секунд", () => {
    startReadingScreenTimeout();
    vi.advanceTimersByTime(THROTTLE_MS + 1);
    document.dispatchEvent(new Event("touchstart"));
    vi.mocked(device.keepScreenOn).mockClear();

    vi.advanceTimersByTime(THROTTLE_MS);
    document.dispatchEvent(new Event("touchstart"));
    expect(device.keepScreenOn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    document.dispatchEvent(new Event("touchstart"));
    expect(device.keepScreenOn).toHaveBeenCalledWith(true);
  });

  it("ловит прокрутку вложенного контейнера", () => {
    startReadingScreenTimeout();
    vi.advanceTimersByTime(THROTTLE_MS + 1);
    vi.mocked(device.keepScreenOn).mockClear();

    const scroller = document.createElement("div");
    document.body.appendChild(scroller);
    scroller.dispatchEvent(new Event("scroll"));

    expect(device.keepScreenOn).toHaveBeenCalledWith(true);
    scroller.remove();
  });

  it("после таймаута снова включает экран от действия", () => {
    startReadingScreenTimeout();
    vi.advanceTimersByTime(SCREEN_TIMEOUT_MS);
    expect(device.keepScreenOn).toHaveBeenLastCalledWith(false);

    vi.advanceTimersByTime(THROTTLE_MS + 1);
    noteReadingInteraction();

    expect(device.keepScreenOn).toHaveBeenLastCalledWith(true);
  });

  it("не включает экран после выхода из читалки", () => {
    startReadingScreenTimeout();
    stopReadingScreenTimeout();
    vi.mocked(device.keepScreenOn).mockClear();

    vi.advanceTimersByTime(THROTTLE_MS + 1);
    document.dispatchEvent(new Event("touchstart"));
    vi.advanceTimersByTime(SCREEN_TIMEOUT_MS);

    expect(device.keepScreenOn).not.toHaveBeenCalled();
  });

  it("не отпускает экран, пока открыта другая читалка", () => {
    startReadingScreenTimeout();
    startReadingScreenTimeout();
    vi.mocked(device.keepScreenOn).mockClear();

    stopReadingScreenTimeout();

    expect(device.keepScreenOn).not.toHaveBeenCalled();

    stopReadingScreenTimeout();
    expect(device.keepScreenOn).toHaveBeenCalledWith(false);
  });
});
