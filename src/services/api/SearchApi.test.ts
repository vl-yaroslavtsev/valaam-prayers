import { describe, expect, it, vi } from "vitest";
import { searchApi, SearchServerError } from "@/services/api/SearchApi";
import { fetchUrl, stubJsonFetch } from "@/test/helpers";

describe("SearchApi", () => {
  it("строит URL /search с q, page и page_size", async () => {
    const fetchMock = stubJsonFetch({ total: 0, items: [] });

    const result = await searchApi.search("Иоанн Прудентов", 2, 10);

    const url = fetchUrl(fetchMock);
    expect(url.pathname).toBe("/api/search");
    expect(url.searchParams.get("q")).toBe("Иоанн Прудентов");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("page_size")).toBe("10");
    expect(result).toEqual({ total: 0, items: [] });
  });

  it("status: 'error' даёт SearchServerError, а не сетевую ошибку", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "error", data: null, errors: [{ message: "boom", code: 1 }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(searchApi.search("q", 1, 10)).rejects.toBeInstanceOf(SearchServerError);
  });

  it("сетевая ошибка не превращается в SearchServerError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await searchApi.search("q", 1, 10).catch((e) => e);

    expect(error).toBeInstanceOf(TypeError);
  });
});
