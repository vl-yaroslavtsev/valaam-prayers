import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  collectErrors,
  deleteRite,
  loadCartRites,
  loadTypeRestrictions,
  updateRite,
  type ApiError,
  type Rite,
  type TypeRestriction,
} from "@/services/rites/ritesApi";
import { findDateFixes, formatDateParam } from "@/services/rites/ritesDates";

/** Сколько записка висит в «корзине удалённых», пока её можно вернуть. Потом удаляется на сервере. */
export const UNDO_TIMEOUT_MS = 15000;
/** Сколько на записке показывается ошибка удаления или оплаты */
export const ERROR_VISIBLE_MS = 15000;
/** Ограничения дат на сервере меняются редко: не запрашиваем чаще */
const RESTRICTIONS_TTL_MS = 10 * 60 * 1000;

export interface CartItem extends Rite {
  checked: boolean;
  errors: ApiError[];
}

const toCartItem = (rite: Rite, checked = true): CartItem => ({ ...rite, checked, errors: [] });

export const useRitesCartStore = defineStore("ritesCart", () => {
  const items = ref<CartItem[]>([]);
  const isLoaded = ref(false);
  const isLoading = ref(false);
  const loadError = ref<string | null>(null);

  /** Убраны из списка, но на сервере ещё есть: до таймаута можно вернуть */
  const pendingDeleted = ref<CartItem[]>([]);
  /** Текст последней ошибки удаления на сервере (записки при этом возвращаются в список) */
  const deleteError = ref<string | null>(null);

  // Оплаченные записки сервер может ещё отдавать в корзине: прячем их, пока не исчезнут
  const paidIds = new Set<number>();
  let originalOrder: number[] = [];
  let undoTimer: ReturnType<typeof setTimeout> | null = null;

  const selectedItems = computed(() => items.value.filter((item) => item.checked));
  const total = computed(() => selectedItems.value.reduce((sum, item) => sum + item.sum, 0));
  const anySelected = computed(() => selectedItems.value.length > 0);
  const allSelected = computed({
    get: () => items.value.length > 0 && items.value.every((item) => item.checked),
    set: (value: boolean) => {
      items.value.forEach((item) => (item.checked = value));
    },
  });

  /** Загрузка идёт «тихо»: список, который уже есть, остаётся на экране, пока приходит свежий */
  async function load(): Promise<void> {
    if (isLoading.value) return;
    isLoading.value = true;
    try {
      const rites = await loadCartRites();
      const serverIds = new Set(rites.map((rite) => rite.id));
      paidIds.forEach((id) => {
        if (!serverIds.has(id)) paidIds.delete(id);
      });
      const hiddenIds = new Set([...paidIds, ...pendingDeleted.value.map((item) => item.id)]);
      const checkedById = new Map(items.value.map((item) => [item.id, item.checked]));

      items.value = rites
        .filter((rite) => !hiddenIds.has(rite.id))
        .map((rite) => toCartItem(rite, checkedById.get(rite.id) ?? true));
      loadError.value = null;
    } catch (ex) {
      console.error("Не удалось загрузить корзину записок:", ex);
      if (!isLoaded.value) {
        loadError.value = "Не удалось загрузить корзину записок";
      }
    } finally {
      isLoaded.value = true;
      isLoading.value = false;
    }
  }

  /** Новая записка встаёт в конец: кнопка добавления под списком */
  function addItem(rite: Rite): void {
    items.value.push(toCartItem(rite));
  }

  /** Записка после редактирования: выбор пользователя сохраняется */
  function updateItem(rite: Rite): void {
    const index = items.value.findIndex((item) => item.id === rite.id);
    if (index >= 0) {
      items.value[index] = toCartItem(rite, items.value[index].checked);
    }
  }

  let restrictionsCache: { loadedAt: number; list: TypeRestriction[] } | null = null;
  let isFixingDates = false;

  async function getRestrictions(): Promise<TypeRestriction[]> {
    if (!restrictionsCache || Date.now() - restrictionsCache.loadedAt > RESTRICTIONS_TTL_MS) {
      restrictionsCache = { loadedAt: Date.now(), list: await loadTypeRestrictions() };
    }
    return restrictionsCache.list;
  }

  /**
   * Пересчитывает даты записок, которые устарели (например, приложение свернули, а вернулись
   * на следующий день), и сохраняет их на сервере. Иначе оплата вернёт «Неверная дата».
   * Возвращает, сколько записок удалось обновить.
   */
  async function validateAndFixDates(): Promise<number> {
    if (isFixingDates || items.value.length === 0) return 0;
    isFixingDates = true;
    try {
      const fixes = findDateFixes(items.value, await getRestrictions());

      const results = await Promise.all(
        fixes.map(async ({ rite, from, to }) => {
          const item = items.value.find((candidate) => candidate.id === rite.id);
          if (!item) return false;

          // Новые даты видны сразу; при ошибке сохранения возвращаем прежние
          const oldPeriod = item.period;
          item.period = { from, to };
          try {
            const result = await updateRite(item, formatDateParam(from.ts));
            if (result.ok && result.data?.period) {
              item.period = result.data.period;
              return true;
            }
          } catch (ex) {
            console.error("Не удалось сохранить новую дату записки:", ex);
          }
          item.period = oldPeriod;
          return false;
        }),
      );
      return results.filter(Boolean).length;
    } catch (ex) {
      console.error("Не удалось проверить даты записок:", ex);
      return 0;
    } finally {
      isFixingDates = false;
    }
  }

  function clearErrors(): void {
    items.value.forEach((item) => (item.errors = []));
  }

  /** Записки оплачены: убираем из корзины сразу, не дожидаясь, пока сервер сменит статус */
  function markPaid(ids: number[]): void {
    ids.forEach((id) => paidIds.add(id));
    items.value = items.value.filter((item) => !paidIds.has(item.id));
  }

  function restoreOriginalOrder(): void {
    items.value.sort((a, b) => originalOrder.indexOf(a.id) - originalOrder.indexOf(b.id));
  }

  function removeItems(ids: number[]): void {
    if (pendingDeleted.value.length === 0) {
      originalOrder = items.value.map((item) => item.id);
    }

    const removed = items.value.filter((item) => ids.includes(item.id));
    if (removed.length === 0) return;

    pendingDeleted.value.push(
      ...removed.filter((item) => !pendingDeleted.value.some((pending) => pending.id === item.id)),
    );
    items.value = items.value.filter((item) => !ids.includes(item.id));
    deleteError.value = null;

    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = setTimeout(() => void commitRemoval(), UNDO_TIMEOUT_MS);
  }

  function removeSelected(): void {
    removeItems(selectedItems.value.map((item) => item.id));
  }

  function undoRemoval(): void {
    if (undoTimer) {
      clearTimeout(undoTimer);
      undoTimer = null;
    }
    items.value.push(...pendingDeleted.value);
    pendingDeleted.value = [];
    restoreOriginalOrder();
    originalOrder = [];
  }

  /** Удаляет на сервере всё, что ждало отмены. Не удалившиеся записки возвращаются в список с ошибкой. */
  async function commitRemoval({ keepalive = false } = {}): Promise<void> {
    if (undoTimer) {
      clearTimeout(undoTimer);
      undoTimer = null;
    }
    const batch = pendingDeleted.value;
    if (batch.length === 0) return;
    pendingDeleted.value = [];

    const results = await Promise.all(
      batch.map(async (item) => {
        try {
          return { item, result: await deleteRite(item.id, { keepalive }) };
        } catch (ex) {
          console.error("Не удалось удалить записку:", ex);
          return { item, result: null };
        }
      }),
    );

    const failed = results.filter(({ result }) => !result?.ok);
    if (failed.length > 0) {
      for (const { item, result } of failed) {
        const errors = result && !result.ok ? collectErrors(result.errors) : [];
        item.errors = errors.length > 0 ? errors : [{ description: "Система временно недоступна" }];
        items.value.push(item);
      }
      restoreOriginalOrder();
      deleteError.value = failed
        .flatMap(({ item }) => item.errors.map((error) => error.description))
        .filter((text, index, all) => all.indexOf(text) === index)
        .join(", ");
      setTimeout(() => failed.forEach(({ item }) => (item.errors = [])), ERROR_VISIBLE_MS);
    }
    // Пока ждёт следующая партия, порядок ещё нужен для её возврата
    if (pendingDeleted.value.length === 0) originalOrder = [];
  }

  return {
    items,
    isLoaded,
    isLoading,
    loadError,
    pendingDeleted,
    deleteError,
    selectedItems,
    total,
    anySelected,
    allSelected,
    load,
    addItem,
    updateItem,
    validateAndFixDates,
    clearErrors,
    markPaid,
    removeItems,
    removeSelected,
    undoRemoval,
    commitRemoval,
  };
});
