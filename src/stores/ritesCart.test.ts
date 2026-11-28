import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { Rite, RiteType } from "@/services/rites/ritesApi";
import {
  loadCartRites,
  deleteRite,
  loadTypeRestrictions,
  rememberConfirmedEmail,
  updateRite,
} from "@/services/rites/ritesApi";
import { resetRiteDirectoryCacheForTests } from "@/services/rites/ritesDirectory";
import {
  UNDO_TIMEOUT_MS,
  ERROR_VISIBLE_MS,
  PAID_HIDE_TTL_MS,
  PENDING_PAYMENT_TTL_MS,
  useRitesCartStore,
} from "@/stores/ritesCart";

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
    localStorage.clear();
    resetRiteDirectoryCacheForTests();
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

  it("добавленная записка встаёт в конец, изменённая сохраняет выбор", async () => {
    const store = useRitesCartStore();
    await store.load();
    store.items[0].checked = false;

    store.addItem(rite(4, 400));
    expect(store.items.map((item) => item.id)).toEqual([3, 2, 1, 4]);

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

    it("обновляет актуальный объект после параллельного load() и запоминает номера записок", async () => {
      vi.mocked(loadCartRites).mockResolvedValue([dated(1, 4)]);
      let resolveUpdate!: (val: { ok: true; data: Rite }) => void;
      vi.mocked(updateRite).mockImplementation(
        () => new Promise((resolve) => (resolveUpdate = resolve)),
      );
      const store = useRitesCartStore();
      await store.load();

      const fixPromise = store.validateAndFixDates();
      await vi.waitFor(() => expect(updateRite).toHaveBeenCalledTimes(1));
      // Пока PUT в полёте, параллельный load() заменяет объекты в store.items
      await store.load();
      resolveUpdate({ ok: true, data: dated(1, 7) });

      expect(await fixPromise).toBe(1);
      expect(store.items[0].period?.from?.ts).toBe(mskDay(7));
      expect(store.lastFixedDateNumbers).toEqual(["АБ-1"]);
    });

    it("не перетирает правку пользователя, сделанную пока шёл PUT обновления даты", async () => {
      vi.mocked(loadCartRites).mockResolvedValue([dated(1, 4)]);
      let resolveUpdate!: (val: { ok: true; data: Rite }) => void;
      vi.mocked(updateRite).mockImplementation(
        () => new Promise((resolve) => (resolveUpdate = resolve)),
      );
      const store = useRitesCartStore();
      await store.load();

      const fixPromise = store.validateAndFixDates();
      // Ждём, пока пройдёт await getTypeRestrictions() и запустится updateRite
      await vi.waitFor(() => expect(updateRite).toHaveBeenCalledTimes(1));
      // Пользователь сам отредактировал записку и поставил дату на 15 ноября
      store.updateItem(dated(1, 15));
      resolveUpdate({ ok: true, data: dated(1, 7) });

      expect(await fixPromise).toBe(0);
      expect(store.items[0].period?.from?.ts).toBe(mskDay(15));
    });

    it("повторный вызов validateAndFixDates ждёт текущий прогон, а сбой PUT попадает в lastFailedDateIds", async () => {
      vi.mocked(loadCartRites).mockResolvedValue([dated(1, 4), dated(2, 4)]);
      let resolveFirst!: (val: { ok: true; data: Rite }) => void;
      vi.mocked(updateRite)
        .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
        .mockResolvedValueOnce({ ok: false, status: 500, errors: null });

      const store = useRitesCartStore();
      await store.load();

      const first = store.validateAndFixDates();
      const second = store.validateAndFixDates();
      await vi.waitFor(() => expect(updateRite).toHaveBeenCalledTimes(2));
      resolveFirst({ ok: true, data: dated(1, 7) });

      expect(await first).toBe(1);
      expect(await second).toBe(1);
      expect(store.lastFixedDateIds).toEqual([1]);
      expect(store.lastFailedDateIds).toEqual([2]);
    });
  });

  describe("гонки состояния и защита от ошибок", () => {
    it("isLoaded остаётся false при повторном сбое первой загрузки", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(loadCartRites).mockRejectedValue(new Error("offline"));
      const store = useRitesCartStore();

      await store.load();
      expect(store.isLoaded).toBe(false);
      expect(store.loadError).toBe("Не удалось загрузить корзину записок");

      await store.load();
      expect(store.isLoaded).toBe(false);
      expect(store.loadError).toBe("Не удалось загрузить корзину записок");
    });

    it("load() не затирает addItem и updateItem, сделанные во время запроса (H1)", async () => {
      const store = useRitesCartStore();
      await store.load();

      let resolveLoad!: (rites: Rite[]) => void;
      vi.mocked(loadCartRites).mockImplementationOnce(
        () => new Promise((resolve) => (resolveLoad = resolve)),
      );

      const loadPromise = store.load();
      store.addItem(rite(4, 400));
      store.updateItem(rite(2, 999));

      resolveLoad([rite(3, 300), rite(2, 200), rite(1, 100)]);
      await loadPromise;

      expect(store.items.map((item) => item.id)).toEqual([3, 2, 1, 4]);
      expect(store.items.find((item) => item.id === 2)?.sum).toBe(999);
    });

    it("load() во время commitRemoval не воскрешает записку и не создаёт дубль при ошибке удаления (H2)", async () => {
      const store = useRitesCartStore();
      await store.load();

      let resolveDelete!: (val: { ok: false; status: 500; errors: null }) => void;
      vi.mocked(deleteRite).mockImplementationOnce(
        () => new Promise((resolve) => (resolveDelete = resolve)),
      );

      store.removeItems([2]);
      const commitPromise = store.commitRemoval();

      // Параллельная загрузка, пока DELETE в полёте
      await store.load();
      expect(store.items.map((item) => item.id)).toEqual([3, 1]);

      // Удаление упало — записка возвращается ровно один раз
      resolveDelete({ ok: false, status: 500, errors: null });
      await commitPromise;

      expect(store.items.map((item) => item.id)).toEqual([3, 2, 1]);
    });

    it("повторный load() во время идущего перезапускает загрузку (H3)", async () => {
      const store = useRitesCartStore();
      let resolveFirst!: (rites: Rite[]) => void;
      vi.mocked(loadCartRites)
        .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
        .mockResolvedValueOnce([rite(1, 100)]);

      const first = store.load();
      const second = store.load();
      resolveFirst([rite(3, 300), rite(2, 200), rite(1, 100)]);

      await Promise.all([first, second]);

      expect(loadCartRites).toHaveBeenCalledTimes(2);
      expect(store.items.map((item) => item.id)).toEqual([1]);
    });

    it("load() сохраняет ошибки на карточках записок (H4)", async () => {
      const store = useRitesCartStore();
      await store.load();
      store.items[0].errors = [{ description: "Неверная дата" }];

      await store.load();

      expect(store.items[0].errors).toEqual([{ description: "Неверная дата" }]);
    });

    it("DELETE 404 считается успехом и не возвращает записку с ошибкой (H5)", async () => {
      vi.mocked(deleteRite).mockResolvedValueOnce({
        ok: false,
        status: 404,
        errors: { fullErrors: [{ code: "notFound", description: "Записка не найдена" }] },
      });
      const store = useRitesCartStore();
      await store.load();

      store.removeItems([2]);
      await store.commitRemoval();

      expect(store.items.map((item) => item.id)).toEqual([3, 1]);
      expect(store.deleteError).toBeNull();
    });

    it("paidIds перестаёт скрывать записку после истечения TTL, если сервер всё ещё её отдаёт (H7)", async () => {
      const store = useRitesCartStore();
      await store.load();

      store.markPaid([3]);
      await store.load();
      expect(store.items.map((item) => item.id)).toEqual([2, 1]);

      await vi.advanceTimersByTimeAsync(PAID_HIDE_TTL_MS + 1);
      await store.load();
      expect(store.items.map((item) => item.id)).toEqual([3, 2, 1]);
    });

    it("markPendingPayment блокирует повторный выбор, оплату и удаление записок (C2)", async () => {
      const store = useRitesCartStore();
      await store.load();

      store.markPendingPayment([3, 2]);
      expect(store.isPendingPayment(3)).toBe(true);
      expect(store.selectedItems.map((item) => item.id)).toEqual([1]);
      expect(store.total).toBe(100);

      // Попытка удалить записку в pending игнорируется
      store.removeItems([3]);
      expect(store.pendingDeleted).toHaveLength(0);

      // allSelected не затрагивает pending-записки
      store.allSelected = true;
      expect(store.selectedItems.map((item) => item.id)).toEqual([1]);

      // После истечения TTL блокировка снимается
      await vi.advanceTimersByTimeAsync(PENDING_PAYMENT_TTL_MS + 1);
      await store.load();
      expect(store.isPendingPayment(3)).toBe(false);
    });

    it("restoreOriginalOrder оставляет новую записку в конце, а не уносит в начало (M1)", async () => {
      const store = useRitesCartStore();
      await store.load();

      store.removeItems([2]);
      store.addItem(rite(4, 400));
      store.undoRemoval();

      expect(store.items.map((item) => item.id)).toEqual([3, 2, 1, 4]);
    });

    it("scheduleClearErrors отменяет предыдущий таймер и не стирает новую ошибку раньше срока (M5)", async () => {
      const store = useRitesCartStore();
      await store.load();

      store.items[0].errors = [{ description: "Ошибка 1" }];
      store.scheduleClearErrors(ERROR_VISIBLE_MS);

      await vi.advanceTimersByTimeAsync(10000);
      store.items[0].errors = [{ description: "Ошибка 2" }];
      store.scheduleClearErrors(ERROR_VISIBLE_MS);

      await vi.advanceTimersByTimeAsync(6000);
      expect(store.items[0].errors).toEqual([{ description: "Ошибка 2" }]);

      await vi.advanceTimersByTimeAsync(9000);
      expect(store.items[0].errors).toEqual([]);
    });

    it("confirmedEmail, вернувшийся в первом ответе сервера, не вызывает ложный сброс корзины на следующем load()", async () => {
      vi.mocked(loadCartRites).mockImplementationOnce(async () => {
        rememberConfirmedEmail("user@valaam.ru|hash1");
        return [rite(3, 300), rite(2, 200)];
      });
      const store = useRitesCartStore();
      await store.load();

      store.items[0].checked = false;
      store.markPendingPayment([2]);

      vi.mocked(loadCartRites).mockResolvedValueOnce([rite(3, 300), rite(2, 200)]);
      await store.load();

      expect(store.items[0].checked).toBe(false);
      expect(store.isPendingPayment(2)).toBe(true);

      // Реальная смена почты сбрасывает состояние прежней почты
      rememberConfirmedEmail("other@valaam.ru|hash2");
      vi.mocked(loadCartRites).mockResolvedValueOnce([rite(3, 300)]);
      await store.load();

      expect(store.items[0].checked).toBe(true);
      expect(store.isPendingPayment(2)).toBe(false);
    });

    it("старый load(), стартовавший до завершения DELETE и вернувшийся после, не воскрешает удалённую записку", async () => {
      const store = useRitesCartStore();
      await store.load();

      let resolveLoad!: (rites: Rite[]) => void;
      vi.mocked(loadCartRites).mockImplementationOnce(
        () => new Promise((resolve) => (resolveLoad = resolve)),
      );

      const staleLoad = store.load();
      store.removeItems([2]);
      await store.commitRemoval();
      expect(store.items.map((item) => item.id)).toEqual([3, 1]);

      // Устаревший ответ приходит уже после того, как deletingIds очистился
      resolveLoad([rite(3, 300), rite(2, 200), rite(1, 100)]);
      await staleLoad;

      expect(store.items.map((item) => item.id)).toEqual([3, 1]);
    });
  });
});
