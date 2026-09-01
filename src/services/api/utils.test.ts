import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJsonWithProgress } from "@/services/api/utils";
import { hangingFetch } from "@/test/helpers";

describe("fetchJsonWithProgress", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("читает стрим по чанкам, суммирует байты и парсит JSON", async () => {
    const parts = ['{"hello":', '"world"}'];
    const encoder = new TextEncoder();
    const chunks = parts.map((part) => encoder.encode(part));
    let index = 0;
    const onBytes = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        body: {
          getReader: () => ({
            read: async () => {
              if (index >= chunks.length) {
                return { done: true, value: undefined };
              }
              return { done: false, value: chunks[index++] };
            },
          }),
        },
      }),
    );

    const result = await fetchJsonWithProgress("/data", { onBytes });

    expect(result.data).toEqual({ hello: "world" });
    expect(onBytes.mock.calls.map((call) => call[0])).toEqual(chunks.map((chunk) => chunk.byteLength));
    const sum = onBytes.mock.calls.reduce((total, [bytes]) => total + bytes, 0);
    expect(sum).toBe(result.byteSize);
    expect(result.byteSize).toBe(chunks.reduce((total, chunk) => total + chunk.byteLength, 0));
  });

  it("без response.body вызывает onBytes один раз с полным размером", async () => {
    const json = '{"ok":true}';
    const byteSize = new TextEncoder().encode(json).length;
    const onBytes = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
        text: async () => json,
      }),
    );

    const result = await fetchJsonWithProgress("/data", { onBytes });

    expect(result.data).toEqual({ ok: true });
    expect(result.byteSize).toBe(byteSize);
    expect(onBytes).toHaveBeenCalledTimes(1);
    expect(onBytes).toHaveBeenCalledWith(byteSize);
  });

  it("при HTTP-ошибке выбрасывает исключение", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
        body: null,
      }),
    );

    await expect(fetchJsonWithProgress("/data")).rejects.toThrow("HTTP Error: 500 Server Error");
  });

  it("внешний AbortSignal прерывает запрос и listener снимается в finally", async () => {
    const controller = new AbortController();
    const addSpy = vi.spyOn(controller.signal, "addEventListener");
    const removeSpy = vi.spyOn(controller.signal, "removeEventListener");
    vi.stubGlobal("fetch", hangingFetch());

    const pending = fetchJsonWithProgress("/data", { signal: controller.signal, timeout: 60_000 });
    await vi.waitFor(() => expect(addSpy).toHaveBeenCalledWith("abort", expect.any(Function)));

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(removeSpy).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("срабатывает внутренний таймаут", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch());

    const pending = fetchJsonWithProgress("/data", { timeout: 50 });
    const expectation = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(50);
    await expectation;
  });
});
