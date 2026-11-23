import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadCartRites,
  loadHistoryFilter,
  loadHistoryRites,
  rememberConfirmedEmailFromUrl,
} from "@/services/rites/ritesApi";

const STATUSES = [
  { id: 17, xmlId: "new", name: "Сформирована", color: null },
  { id: 18, xmlId: "payed", name: "Пожертвование принято", color: "#0085e5" },
  { id: 19, xmlId: "served", name: "Подана в лавку", color: "#c557eb" },
];

const jsonResponse = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

let fetchMock: ReturnType<typeof vi.fn>;

/** Параметры последнего запроса, кроме /rites/statuses */
function lastQuery(): URLSearchParams {
  const call = [...fetchMock.mock.calls].reverse().find(([url]) => !String(url).includes("/statuses"));
  return new URL(String(call?.[0])).searchParams;
}

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn((url: string) => {
    if (url.includes("/rites/statuses")) return jsonResponse(STATUSES);
    if (url.includes("/rites/filter")) {
      return jsonResponse({
        statuses: STATUSES.map((status) => ({ ...status, disabled: status.id === 19 })),
        types: [{ id: 7160, name: "О здравии", disabled: false }],
      });
    }
    return jsonResponse({ items: [{ id: 1 }], nav: { totalPages: 3 } });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadCartRites", () => {
  it("запрашивает корзину от старых записок к новым", async () => {
    await loadCartRites();

    const query = lastQuery();
    expect(query.get("status[0]")).toBe("17");
    expect(query.get("order")).toBe("ASC");
    expect(query.get("orderBy")).toBe("date");
    expect(query.get("perPage")).toBe("50");
  });
});

describe("loadHistoryRites", () => {
  it("без фильтра берёт все статусы истории, кроме корзины, новые сверху", async () => {
    await loadHistoryRites({ page: 1 });

    const query = lastQuery();
    expect(query.getAll("status[0]")).toEqual(["18"]);
    expect(query.get("status[1]")).toBe("19");
    expect(query.get("status[2]")).toBeNull();
    expect(query.get("type")).toBeNull();
    expect(query.get("order")).toBe("DESC");
    expect(query.get("page")).toBe("1");
    expect(query.get("perPage")).toBe("20");
  });

  it("выбранные статус, требы и порядок попадают в запрос", async () => {
    await loadHistoryRites({ page: 2, order: "ASC", typeId: 7160, statusId: 19 });

    const query = lastQuery();
    expect(query.get("status[0]")).toBe("19");
    expect(query.get("status[1]")).toBeNull();
    expect(query.get("type")).toBe("7160");
    expect(query.get("order")).toBe("ASC");
    expect(query.get("page")).toBe("2");
  });

  it("hasMore считается по числу страниц", async () => {
    expect((await loadHistoryRites({ page: 2 })).hasMore).toBe(true);
    expect((await loadHistoryRites({ page: 3 })).hasMore).toBe(false);
  });

  it("ошибка сервера прокидывается", async () => {
    // Статусы кешируются модулем после первого теста, поэтому следующий запрос это сам список
    await loadHistoryRites({ page: 1 });
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ fullErrors: [{ description: "Система недоступна" }] }),
      }),
    );
    await expect(loadHistoryRites({ page: 1 })).rejects.toThrow("Система недоступна");
  });
});

describe("подтверждённая почта", () => {
  it("уходит в историю и корзину вместе с clientId", async () => {
    rememberConfirmedEmailFromUrl(
      "/my?EMAIL=vl.yaroslavtsev@gmail.com%7C7d78cb3ba261cf6efa541e75f271aa17",
    );

    await loadHistoryRites({ page: 1 });
    expect(lastQuery().get("email")).toBe(
      "vl.yaroslavtsev@gmail.com|7d78cb3ba261cf6efa541e75f271aa17",
    );
    expect(lastQuery().get("clientId")).toBeTruthy();

    await loadCartRites();
    expect(lastQuery().get("email")).toBe(
      "vl.yaroslavtsev@gmail.com|7d78cb3ba261cf6efa541e75f271aa17",
    );
  });
});

describe("loadHistoryFilter", () => {
  it("отдаёт типы и статусы без корзины, с признаком disabled", async () => {
    const filter = await loadHistoryFilter({});

    expect(filter.types).toHaveLength(1);
    expect(filter.statuses.map((status) => status.xmlId)).toEqual(["payed", "served"]);
    expect(filter.statuses.find((status) => status.xmlId === "served")?.disabled).toBe(true);
  });

  it("передаёт выбранные требы и статус", async () => {
    await loadHistoryFilter({ typeId: 7160, statusId: 18 });

    const query = lastQuery();
    expect(query.get("type")).toBe("7160");
    expect(query.get("status[0]")).toBe("18");
    expect(query.get("status[1]")).toBeNull();
  });
});
