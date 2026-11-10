import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchServerError, searchApi } from "@/services/api/SearchApi";
import type { SearchItem } from "@/services/api/SearchApi";
import { isOnline } from "@/services/download/network";
import { buildLocalSearchIndex } from "@/services/search/localSearch";
import { SEARCH_PAGE_SIZE, useSearch } from "@/composables/useSearch";

vi.mock("@/services/api/SearchApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/SearchApi")>();
  return { ...actual, searchApi: { search: vi.fn() } };
});
vi.mock("@/services/download/network", () => ({ isOnline: vi.fn() }));

const serverItem = (id: number): SearchItem => ({
  id,
  iblock_id: 28,
  type: "prayers",
  type_name: "Молитвослов",
  name: `Серверный <mark>${id}</mark>`,
  text: "…",
  path: [],
  href: `/prayers/text/${id}`,
});

const localIndex = buildLocalSearchIndex({
  elements: [],
  sections: [],
  saints: [{ id: 7, name: "Иоанн Прудентов" }],
});

const setup = () => useSearch(() => localIndex);

describe("useSearch", () => {
  beforeEach(() => {
    vi.mocked(isOnline).mockReturnValue(true);
  });

  it("пустой запрос не уходит на сервер", async () => {
    const search = setup();
    search.query.value = "   ";

    await search.submit();

    expect(searchApi.search).not.toHaveBeenCalled();
    expect(search.state.value).toBe("idle");
  });

  it("онлайн берёт результаты с сервера", async () => {
    vi.mocked(searchApi.search).mockResolvedValue({ total: 1, items: [serverItem(1)] });
    const search = setup();
    search.query.value = " Иоанн ";

    await search.submit();

    expect(searchApi.search).toHaveBeenCalledWith("Иоанн", 1, SEARCH_PAGE_SIZE);
    expect(search.state.value).toBe("done");
    expect(search.source.value).toBe("server");
    expect(search.items.value).toHaveLength(1);
    expect(search.isDirty.value).toBe(false);
  });

  it("офлайн сразу ищет локально и не трогает сеть", async () => {
    vi.mocked(isOnline).mockReturnValue(false);
    const search = setup();
    search.query.value = "иоанн";

    await search.submit();

    expect(searchApi.search).not.toHaveBeenCalled();
    expect(search.source.value).toBe("local");
    expect(search.items.value.map((i) => i.id)).toEqual([7]);
  });

  it("сетевая ошибка переключает на локальный поиск", async () => {
    vi.mocked(searchApi.search).mockRejectedValue(new TypeError("Failed to fetch"));
    const search = setup();
    search.query.value = "иоанн";

    await search.submit();

    expect(search.state.value).toBe("done");
    expect(search.source.value).toBe("local");
    expect(search.items.value.map((i) => i.id)).toEqual([7]);
  });

  it("status: 'error' от сервера — ошибка, а не локальный поиск", async () => {
    vi.mocked(searchApi.search).mockRejectedValue(new SearchServerError("boom"));
    const search = setup();
    search.query.value = "иоанн";

    await search.submit();

    expect(search.state.value).toBe("error");
    expect(search.items.value).toEqual([]);
  });

  it("retry повторяет последний запрос", async () => {
    vi.mocked(searchApi.search)
      .mockRejectedValueOnce(new SearchServerError("boom"))
      .mockResolvedValueOnce({ total: 1, items: [serverItem(1)] });
    const search = setup();
    search.query.value = "иоанн";
    await search.submit();

    await search.retry();

    expect(search.state.value).toBe("done");
    expect(search.items.value).toHaveLength(1);
  });

  it("подгружает следующие страницы, пока page * page_size < total", async () => {
    vi.mocked(searchApi.search)
      .mockResolvedValueOnce({ total: 12, items: [serverItem(1)] })
      .mockResolvedValueOnce({ total: 12, items: [serverItem(2)] });
    const search = setup();
    search.query.value = "иоанн";
    await search.submit();
    expect(search.hasMore.value).toBe(true);

    await search.loadMore();

    expect(searchApi.search).toHaveBeenLastCalledWith("иоанн", 2, SEARCH_PAGE_SIZE);
    expect(search.items.value.map((i) => i.id)).toEqual([1, 2]);
    expect(search.hasMore.value).toBe(false);
  });

  it("после ошибки подгрузки не повторяет сам, только по явному запросу", async () => {
    vi.mocked(searchApi.search)
      .mockResolvedValueOnce({ total: 30, items: [serverItem(1)] })
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ total: 30, items: [serverItem(2)] });
    const search = setup();
    search.query.value = "иоанн";
    await search.submit();

    await search.loadMore();
    expect(search.loadMoreFailed.value).toBe(true);
    expect(search.items.value).toHaveLength(1);

    await search.loadMore();
    expect(searchApi.search).toHaveBeenCalledTimes(2);

    await search.loadMore(true);
    expect(search.items.value.map((i) => i.id)).toEqual([1, 2]);
    expect(search.loadMoreFailed.value).toBe(false);
  });

  it("устаревший ответ не затирает результат нового запроса", async () => {
    let resolveFirst!: (value: { total: number; items: SearchItem[] }) => void;
    vi.mocked(searchApi.search)
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ total: 1, items: [serverItem(2)] });
    const search = setup();

    search.query.value = "первый";
    const first = search.submit();
    search.query.value = "второй";
    await search.submit();
    resolveFirst({ total: 1, items: [serverItem(1)] });
    await first;

    expect(search.items.value.map((i) => i.id)).toEqual([2]);
  });

  it("clear сбрасывает запрос и результаты", async () => {
    vi.mocked(searchApi.search).mockResolvedValue({ total: 1, items: [serverItem(1)] });
    const search = setup();
    search.query.value = "иоанн";
    await search.submit();

    search.clear();

    expect(search.query.value).toBe("");
    expect(search.state.value).toBe("idle");
    expect(search.items.value).toEqual([]);
  });
});
