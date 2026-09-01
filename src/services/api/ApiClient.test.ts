import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/services/api/ApiClient";
import { fetchJsonWithProgress } from "@/services/api/utils";
import { makeNav } from "@/test/helpers";

vi.mock("@/services/api/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/utils")>();
  return {
    ...actual,
    fetchJsonWithProgress: vi.fn(),
  };
});

class TestApiClient extends ApiClient {
  getPagePublic<T>(
    path: string,
    params: Record<string, string | number>,
    page: number,
    pageSize: number,
    options?: { since?: Date; signal?: AbortSignal; onBytes?: (bytes: number) => void },
  ) {
    return this.getPage<T>(path, params, page, pageSize, options);
  }
}

const fetchJsonWithProgressMock = vi.mocked(fetchJsonWithProgress);

describe("ApiClient.getPage", () => {
  const client = new TestApiClient();

  beforeEach(() => {
    fetchJsonWithProgressMock.mockReset();
    fetchJsonWithProgressMock.mockResolvedValue({
      data: {
        status: "success",
        data: {
          items: [{ id: 1 }],
          nav: makeNav(2, 3),
        },
        errors: null,
      },
      byteSize: 42,
    });
  });

  it("строит URLSearchParams: page, page_size и modified_since из since", async () => {
    const since = new Date("2026-03-01T12:00:00.500Z");
    await client.getPagePublic("/items", { foo: "bar", n: 7 }, 3, 50, { since });

    const url = new URL(String(fetchJsonWithProgressMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://app.valaam.ru/api/items");
    expect(url.searchParams.get("foo")).toBe("bar");
    expect(url.searchParams.get("n")).toBe("7");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("page_size")).toBe("50");
    expect(url.searchParams.get("modified_since")).toBe(String(Math.floor(since.getTime() / 1000)));
  });

  it("разворачивает ApiResponse через unwrap и возвращает items/nav/byteSize", async () => {
    const result = await client.getPagePublic("/items", {}, 1, 10);

    expect(result.items).toEqual([{ id: 1 }]);
    expect(result.nav).toEqual(makeNav(2, 3));
    expect(result.byteSize).toBe(42);
  });

  it("пробрасывает signal и onBytes в fetchJsonWithProgress", async () => {
    const signal = new AbortController().signal;
    const onBytes = vi.fn();
    await client.getPagePublic("/items", {}, 1, 10, { signal, onBytes });

    expect(fetchJsonWithProgressMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal, onBytes, timeout: 15000 }),
    );
  });

  it("unwrap выбрасывает сообщение из errors при неуспешном ответе", async () => {
    fetchJsonWithProgressMock.mockResolvedValue({
      data: {
        status: "error",
        data: null,
        errors: [{ message: "Nope", code: "x" }],
      },
      byteSize: 0,
    });

    await expect(client.getPagePublic("/items", {}, 1, 10)).rejects.toThrow("Nope");
  });
});
