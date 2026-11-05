import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { Rite, RiteType } from "@/services/rites/ritesApi";
import { loadCartRites, deleteRite, loadTypeRestrictions, updateRite } from "@/services/rites/ritesApi";
import { UNDO_TIMEOUT_MS, ERROR_VISIBLE_MS, useRitesCartStore } from "@/stores/ritesCart";

vi.mock("@/services/rites/ritesApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/rites/ritesApi")>()),
  loadCartRites: vi.fn(),
  deleteRite: vi.fn(),
  loadTypeRestrictions: vi.fn(),
  updateRite: vi.fn(),
}));

const rite = (id: number, sum: number): Rite => ({
  id,
  number: `АБ-${id}`,
  names: [{ name: "Андрей", explanation: "" }],
  type: null,
  sum,
});

const ok = { ok: true as const, data: {} };

describe("useRitesCartStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    vi.mocked(loadCartRites).mockResolvedValue([rite(3, 300), rite(2, 200), rite(1, 100)]);
    vi.mocked(deleteRite).mockResolvedValue(ok);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("загружает записки выбранными, сумма считается по выбранным", async () => {
    const store = useRitesCartStore();
    await store.load();

    expect(store.isLoaded).toBe(true);
    expect(store.items.map((item) => item.id)).toEqual([3, 2, 1]);
    expect(store.allSelected).toBe(true);
    expect(store.total).toBe(600);

    store.items[0].checked = false;
    expect(store.allSelected).toBe(false);
    expect(store.total).toBe(300);

    store.allSelected = false;
    expect(store.anySelected).toBe(false);
    expect(store.total).toBe(0);
  });

  it("повторная загрузка сохраняет выбор пользователя", async () => {
    const store = useRitesCartStore();
    await store.load();
    store.items[1].checked = false;

    await store.load();

    expect(store.items.find((item) => item.id === 2)?.checked).toBe(false);
  });

  it("ошибка первой загрузки показывается, а после повтора пропадает", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(loadCartRites).mockRejectedValueOnce(new Error("offline"));
    const store = useRitesCartStore();

    await store.load();
    expect(store.loadError).toBe("Не удалось загрузить корзину записок");

    await store.load();
    expect(store.loadError).toBeNull();
    expect(store.items).toHaveLength(3);
  });

  it("добавленная записка встаёт наверх, изменённая сохраняет выбор", async () => {
    const store = useRitesCartStore();
    await store.load();
    store.items[0].checked = false;

    store.addItem(rite(4, 400));
    expect(store.items[0].id).toBe(4);

    store.updateItem({ ...rite(3, 999) });
    const updated = store.items.find((item) => item.id === 3);
    expect(updated?.sum).toBe(999);
    expect(updated?.checked).toBe(false);
  });

  it("удаление ждёт таймаут отмены и только потом уходит на сервер", async () => {
    const store = useRitesCartStore();
    await store.load();

    store.removeItems([2]);
    expect(store.items.map((item) => item.id)).toEqual([3, 1]);
    expect(store.pendingDeleted).toHaveLength(1);
    expect(deleteRite).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(UNDO_TIMEOUT_MS);

    expect(deleteRite).toHaveBeenCalledWith(2, { keepalive: false });
    expect(store.pendingDeleted).toHaveLength(0);
  });

  it("отмена возвращает записки на исходные места и ничего не удаляет", async () => {
    const store = useRitesCartStore();
    await store.load();

    store.removeItems([3]);
    store.removeItems([1]);
    store.undoRemoval();

    expect(store.items.map((item) => item.id)).toEqual([3, 2, 1]);
    await vi.advanceTimersByTimeAsync(UNDO_TIMEOUT_MS);
    expect(deleteRite).not.toHaveBeenCalled();
  });

  it("не удалившаяся на сервере записка возвращается с ошибкой, которая потом гаснет", async () => {
    vi.mocked(deleteRite).mockResolvedValueOnce({
      ok: false,
      status: 400,
      errors: { fullErrors: [{ description: "Записку нельзя удалить" }] },
    });
    const store = useRitesCartStore();
    await store.load();

    store.removeItems([2]);
    await vi.advanceTimersByTimeAsync(UNDO_TIMEOUT_MS);

    const failed = store.items.find((item) => item.id === 2);
    expect(failed?.errors.map((error) => error.description)).toEqual(["Записку нельзя удалить"]);
    expect(store.deleteError).toBe("Записку нельзя удалить");
    expect(store.items.map((item) => item.id)).toEqual([3, 2, 1]);

    await vi.advanceTimersByTimeAsync(ERROR_VISIBLE_MS);
    expect(failed?.errors).toEqual([]);
  });

  it("commitRemoval удаляет сразу, не дожидаясь таймаута", async () => {
    const store = useRitesCartStore();
    await store.load();
    store.removeItems([1]);

    await store.commitRemoval({ keepalive: true });

    expect(deleteRite).toHaveBeenCalledWith(1, { keepalive: true });
  });

  it("оплаченные записки пропадают из корзины, пока сервер ещё их отдаёт", async () => {
    const store = useRitesCartStore();
    await store.load();

    store.markPaid([3, 2]);
    expect(store.items.map((item) => item.id)).toEqual([1]);

    await store.load();
    expect(store.items.map((item) => item.id)).toEqual([1]);

    // Сервер перестал отдавать оплаченные: запись о них забывается
    vi.mocked(loadCartRites).mockResolvedValue([rite(1, 100)]);
    await store.load();
    vi.mocked(loadCartRites).mockResolvedValue([rite(3, 300), rite(1, 100)]);
    await store.load();
    expect(store.items.map((item) => item.id)).toEqual([3, 1]);
  });

  describe("validateAndFixDates", () => {
    const type = {
      id: 1,
      processing: 1,
      periodDays: 1,
      weekDays: [],
    } as unknown as RiteType;
    const mskDay = (day: number) => Date.UTC(2026, 10, day) / 1000 - 3 * 3600;
    const point = (day: number) => ({ ts: mskDay(day), value: "" });
    const dated = (id: number, day: number): Rite => ({
      ...rite(id, 100),
      type,
      period: { from: point(day), to: point(day) },
    });

    beforeEach(() => {
      // 5 ноября 2026, полдень по Москве: ближайшая дата для типа это 7 ноября
      vi.setSystemTime(Date.UTC(2026, 10, 5, 9, 0));
      vi.mocked(loadTypeRestrictions).mockResolvedValue([]);
      vi.mocked(updateRite).mockImplementation(async (item) => ({
        ok: true,
        data: { ...item, period: { from: item.period?.from, to: item.period?.to } },
      }));
    });

    it("сохраняет новую дату для просроченных записок и не трогает актуальные", async () => {
      vi.mocked(loadCartRites).mockResolvedValue([dated(1, 4), dated(2, 20)]);
      const store = useRitesCartStore();
      await store.load();

      expect(await store.validateAndFixDates()).toBe(1);

      expect(updateRite).toHaveBeenCalledTimes(1);
      expect(vi.mocked(updateRite).mock.calls[0][0].id).toBe(1);
      expect(vi.mocked(updateRite).mock.calls[0][1]).toBe("07.11.2026");
      expect(store.items.find((item) => item.id === 1)?.period?.from?.ts).toBe(mskDay(7));
      expect(store.items.find((item) => item.id === 2)?.period?.from?.ts).toBe(mskDay(20));
    });

    it("при ошибке сохранения возвращает прежнюю дату и не считает записку обновлённой", async () => {
      vi.mocked(loadCartRites).mockResolvedValue([dated(1, 4)]);
      vi.mocked(updateRite).mockResolvedValue({ ok: false, status: 409, errors: null });
      const store = useRitesCartStore();
      await store.load();

      expect(await store.validateAndFixDates()).toBe(0);
      expect(store.items[0].period?.from?.ts).toBe(mskDay(4));
    });

    it("не падает, если ограничения не загрузились", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(loadCartRites).mockResolvedValue([dated(1, 4)]);
      vi.mocked(loadTypeRestrictions).mockRejectedValue(new Error("offline"));
      const store = useRitesCartStore();
      await store.load();

      expect(await store.validateAndFixDates()).toBe(0);
      expect(updateRite).not.toHaveBeenCalled();
    });
  });
});
