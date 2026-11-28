import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  collectErrors,
  deleteRite,
  getConfirmedEmail,
  loadCartRites,
  updateRite,
  type ApiError,
  type Rite,
} from "@/services/rites/ritesApi";
import { findDateFixes, formatDateParam } from "@/services/rites/ritesDates";
import { getTypeRestrictions } from "@/services/rites/ritesDirectory";

/** Сколько записка висит в «корзине удалённых», пока её можно вернуть. Потом удаляется на сервере. */
export const UNDO_TIMEOUT_MS = 15000;
/** Сколько на записке показывается ошибка удаления или оплаты */
export const ERROR_VISIBLE_MS = 15000;
/** Сколько скрываем оплаченные записки, если сервер ещё отдаёт их в статусе new */
export const PAID_HIDE_TTL_MS = 60 * 1000;
/** Сколько блокируем повторную оплату записок после статуса pending */
export const PENDING_PAYMENT_TTL_MS = 5 * 60 * 1000;

export type RitesTab = "cart" | "history";

export interface CartItem extends Rite {
  checked: boolean;
  errors: ApiError[];
}

const toCartItem = (rite: Rite, checked = true, errors: ApiError[] = []): CartItem => ({
  ...rite,
  checked,
  errors,
});

export const useRitesCartStore = defineStore("ritesCart", () => {
  const activeTab = ref<RitesTab>("cart");
  const items = ref<CartItem[]>([]);
  const isLoaded = ref(false);
  const isLoading = ref(false);
  const loadError = ref<string | null>(null);

  function setActiveTab(tab: RitesTab): void {
    activeTab.value = tab;
  }

  /** Убраны из списка, но на сервере ещё есть: до таймаута можно вернуть */
  const pendingDeleted = ref<CartItem[]>([]);
  /** Текст последней ошибки удаления на сервере (записки при этом возвращаются в список) */
  const deleteError = ref<string | null>(null);
  /** Номера записок, даты которых обновил последний вызов validateAndFixDates */
  const lastFixedDateNumbers = ref<string[]>([]);
  /** ID записок, даты которых обновил последний вызов validateAndFixDates */
  const lastFixedDateIds = ref<number[]>([]);
  /** ID записок с устаревшей датой, которую не удалось сохранить в последнем validateAndFixDates */
  const lastFailedDateIds = ref<number[]>([]);
  /** Записки с платежом в обработке (pending): не даём оплатить их повторно */
  const pendingPaymentIds = ref<number[]>([]);

  // Оплаченные записки сервер может ещё отдавать в корзине: прячем их на время PAID_HIDE_TTL_MS
  const paidIds = new Map<number, number>();
  // Записки с платежом в обработке: id -> время постановки в pending
  const pendingPaymentAt = new Map<number, number>();
  // Записки, для которых прямо сейчас летит DELETE на сервер
  const deletingIds = new Set<number>();
  // Записки, успешно удалённые на сервере: id -> mutationVersion (защита от ответа старого load())
  const deletedAtVersion = new Map<number, number>();
  // Версия локальных правок (addItem / updateItem / fixDates), чтобы старый load() их не затёр
  let mutationVersion = 0;
  const dirtyItems = new Map<number, number>();

  let originalOrder: number[] = [];
  let undoTimer: ReturnType<typeof setTimeout> | null = null;
  let errorClearTimer: ReturnType<typeof setTimeout> | null = null;
  let loadPromise: Promise<void> | null = null;
  let reloadRequested = false;
  let loadedForEmail: string | null = null;

  function syncPendingPaymentIds(): void {
    pendingPaymentIds.value = [...pendingPaymentAt.keys()];
  }

  function prunePendingPayments(serverIds?: Set<number>, now = Date.now()): void {
    let changed = false;
    for (const [id, markedAt] of pendingPaymentAt) {
      if ((serverIds && !serverIds.has(id)) || now - markedAt > PENDING_PAYMENT_TTL_MS) {
        pendingPaymentAt.delete(id);
        changed = true;
      }
    }
    if (changed) syncPendingPaymentIds();
  }

  const pendingPaymentSet = computed(() => new Set(pendingPaymentIds.value));
  const isPendingPayment = (id: number): boolean => pendingPaymentSet.value.has(id);

  const selectableItems = computed(() =>
    items.value.filter((item) => !pendingPaymentSet.value.has(item.id)),
  );
  const selectedItems = computed(() =>
    items.value.filter((item) => item.checked && !pendingPaymentSet.value.has(item.id)),
  );
  const total = computed(() => selectedItems.value.reduce((sum, item) => sum + item.sum, 0));
  const anySelected = computed(() => selectedItems.value.length > 0);
  const allSelected = computed({
    get: () =>
      selectableItems.value.length > 0 && selectableItems.value.every((item) => item.checked),
    set: (value: boolean) => {
      selectableItems.value.forEach((item) => (item.checked = value));
    },
  });

  /** Загрузка идёт «тихо»: список, который уже есть, остаётся на экране, пока приходит свежий */
  async function load(): Promise<void> {
    if (loadPromise) {
      reloadRequested = true;
      return loadPromise;
    }

    loadPromise = (async () => {
      isLoading.value = true;
      try {
        do {
          reloadRequested = false;
          const emailBeforeLoad = getConfirmedEmail();
          if (loadedForEmail !== null && loadedForEmail !== emailBeforeLoad) {
            items.value = [];
            isLoaded.value = false;
            loadError.value = null;
            paidIds.clear();
            pendingPaymentAt.clear();
            syncPendingPaymentIds();
            dirtyItems.clear();
            deletedAtVersion.clear();
          }

          const versionBefore = mutationVersion;
          try {
            const rites = await loadCartRites();
            const now = Date.now();
            const serverIds = new Set(rites.map((rite) => rite.id));

            for (const [id, markedAt] of paidIds) {
              if (!serverIds.has(id) || now - markedAt > PAID_HIDE_TTL_MS) {
                paidIds.delete(id);
              }
            }
            prunePendingPayments(serverIds, now);

            const hiddenIds = new Set([
              ...paidIds.keys(),
              ...pendingDeleted.value.map((item) => item.id),
              ...deletingIds,
            ]);
            const currentById = new Map(items.value.map((item) => [item.id, item]));
            const mergedIds = new Set<number>();
            const nextItems: CartItem[] = [];

            for (const rite of rites) {
              if (hiddenIds.has(rite.id)) continue;
              // Записка была удалена на сервере уже после старта этого load()
              const deletedVersion = deletedAtVersion.get(rite.id);
              if (deletedVersion !== undefined && deletedVersion > versionBefore) continue;

              const current = currentById.get(rite.id);
              const dirtyVersion = dirtyItems.get(rite.id);
              if (dirtyVersion !== undefined && dirtyVersion > versionBefore && current) {
                nextItems.push(current);
              } else {
                const isPending = pendingPaymentAt.has(rite.id);
                const checked = isPending ? false : (current?.checked ?? true);
                nextItems.push(toCartItem(rite, checked, current?.errors ?? []));
              }
              mergedIds.add(rite.id);
            }

            // Новые записки, добавленные локально во время запроса, которых сервер ещё не вернул
            for (const item of items.value) {
              const dirtyVersion = dirtyItems.get(item.id);
              const deletedVersion = deletedAtVersion.get(item.id);
              if (
                dirtyVersion !== undefined &&
                dirtyVersion > versionBefore &&
                (deletedVersion === undefined || deletedVersion <= dirtyVersion) &&
                !mergedIds.has(item.id) &&
                !hiddenIds.has(item.id)
              ) {
                nextItems.push(item);
              }
            }

            // Чистим устаревшие метки (в том числе для записок, которых уже нет на сервере)
            for (const [id, ver] of dirtyItems) {
              if (ver <= versionBefore) dirtyItems.delete(id);
            }
            for (const [id, ver] of deletedAtVersion) {
              if (ver <= versionBefore) deletedAtVersion.delete(id);
            }

            items.value = nextItems;
            isLoaded.value = true;
            loadError.value = null;
            // Читаем после ответа: loadRitesPage мог сохранить confirmedEmail, вернувшийся с сервера
            loadedForEmail = getConfirmedEmail();
          } catch (ex) {
            console.error("Не удалось загрузить корзину записок:", ex);
            if (!isLoaded.value) {
              loadError.value = "Не удалось загрузить корзину записок";
            }
          }
        } while (reloadRequested);
      } finally {
        isLoading.value = false;
        loadPromise = null;
      }
    })();

    return loadPromise;
  }

  /** Новая записка встаёт в конец: кнопка добавления под списком */
  function addItem(rite: Rite): void {
    dirtyItems.set(rite.id, ++mutationVersion);
    const index = items.value.findIndex((item) => item.id === rite.id);
    if (index >= 0) {
      items.value[index] = toCartItem(rite, items.value[index].checked);
    } else {
      items.value.push(toCartItem(rite));
    }
  }

  /** Записка после редактирования: выбор пользователя сохраняется */
  function updateItem(rite: Rite): void {
    dirtyItems.set(rite.id, ++mutationVersion);
    const index = items.value.findIndex((item) => item.id === rite.id);
    if (index >= 0) {
      items.value[index] = toCartItem(rite, items.value[index].checked);
    }
  }

  let fixingDatesPromise: Promise<number> | null = null;

  /**
   * Пересчитывает даты записок, которые устарели (например, приложение свернули, а вернулись
   * на следующий день), и сохраняет их на сервере. Иначе оплата вернёт «Неверная дата».
   * Если проверка уже идёт, ждёт её завершения вместо раннего возврата 0.
   * Возвращает, сколько записок удалось обновить.
   */
  async function validateAndFixDates(): Promise<number> {
    if (fixingDatesPromise) return fixingDatesPromise;
    if (items.value.length === 0) {
      lastFixedDateNumbers.value = [];
      lastFixedDateIds.value = [];
      lastFailedDateIds.value = [];
      return 0;
    }

    fixingDatesPromise = (async () => {
      lastFixedDateNumbers.value = [];
      lastFixedDateIds.value = [];
      lastFailedDateIds.value = [];
      try {
        const fixes = findDateFixes(items.value, await getTypeRestrictions());
        if (fixes.length === 0) return 0;

        const updatedNumbers: string[] = [];
        const updatedIds: number[] = [];
        const failedIds: number[] = [];

        await Promise.all(
          fixes.map(async ({ rite, from, to }) => {
            if (pendingPaymentAt.has(rite.id)) return;
            const versionAtStart = dirtyItems.get(rite.id) ?? 0;

            try {
              const result = await updateRite(
                { ...rite, period: { from, to } },
                formatDateParam(from.ts),
              );
              if (!result.ok || !result.data?.period) {
                failedIds.push(rite.id);
                return;
              }

              const current = items.value.find((candidate) => candidate.id === rite.id);
              if (!current) return;
              if ((dirtyItems.get(rite.id) ?? 0) !== versionAtStart) return;

              current.period = result.data.period;
              dirtyItems.set(rite.id, ++mutationVersion);
              updatedNumbers.push(current.number);
              updatedIds.push(current.id);
            } catch (ex) {
              console.error("Не удалось сохранить новую дату записки:", ex);
              failedIds.push(rite.id);
            }
          }),
        );
        lastFixedDateNumbers.value = updatedNumbers;
        lastFixedDateIds.value = updatedIds;
        lastFailedDateIds.value = failedIds;
        return updatedIds.length;
      } catch (ex) {
        console.error("Не удалось проверить даты записок:", ex);
        return 0;
      } finally {
        fixingDatesPromise = null;
      }
    })();

    return fixingDatesPromise;
  }

  function clearErrors(): void {
    if (errorClearTimer) {
      clearTimeout(errorClearTimer);
      errorClearTimer = null;
    }
    items.value.forEach((item) => (item.errors = []));
  }

  function scheduleClearErrors(delayMs = ERROR_VISIBLE_MS): void {
    if (errorClearTimer) clearTimeout(errorClearTimer);
    errorClearTimer = setTimeout(() => {
      errorClearTimer = null;
      items.value.forEach((item) => (item.errors = []));
    }, delayMs);
  }

  /** Записки оплачены: убираем из корзины сразу, не дожидаясь, пока сервер сменит статус */
  function markPaid(ids: number[]): void {
    const now = Date.now();
    let pendingChanged = false;
    ids.forEach((id) => {
      paidIds.set(id, now);
      if (pendingPaymentAt.delete(id)) pendingChanged = true;
    });
    if (pendingChanged) syncPendingPaymentIds();
    mutationVersion++;
    items.value = items.value.filter((item) => !paidIds.has(item.id));
  }

  /** Платёж в обработке (pending): снимаем выбор и блокируем повторную оплату этих записок */
  function markPendingPayment(ids: number[]): void {
    const now = Date.now();
    ids.forEach((id) => pendingPaymentAt.set(id, now));
    syncPendingPaymentIds();
    items.value.forEach((item) => {
      if (pendingPaymentAt.has(item.id)) item.checked = false;
    });
  }

  function restoreOriginalOrder(): void {
    const orderIndex = (id: number): number => {
      const index = originalOrder.indexOf(id);
      return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
    };
    items.value.sort((a, b) => orderIndex(a.id) - orderIndex(b.id));
  }

  function removeItems(ids: number[]): void {
    const removable = ids.filter((id) => !pendingPaymentAt.has(id));
    if (removable.length === 0) return;

    if (pendingDeleted.value.length === 0) {
      originalOrder = items.value.map((item) => item.id);
    }

    const removed = items.value.filter((item) => removable.includes(item.id));
    if (removed.length === 0) return;

    pendingDeleted.value.push(
      ...removed.filter((item) => !pendingDeleted.value.some((pending) => pending.id === item.id)),
    );
    items.value = items.value.filter((item) => !removable.includes(item.id));
    deleteError.value = null;
    mutationVersion++;

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
    const existingIds = new Set(items.value.map((item) => item.id));
    items.value.push(...pendingDeleted.value.filter((item) => !existingIds.has(item.id)));
    pendingDeleted.value = [];
    restoreOriginalOrder();
    originalOrder = [];
    mutationVersion++;
  }

  /** Удаляет на сервере всё, что ждало отмены. Не удалившиеся записки возвращаются в список с ошибкой. */
  async function commitRemoval({ keepalive = false } = {}): Promise<void> {
    if (undoTimer) {
      clearTimeout(undoTimer);
      undoTimer = null;
    }
    const batch = pendingDeleted.value;
    if (batch.length === 0) return;
    batch.forEach((item) => deletingIds.add(item.id));
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

    batch.forEach((item) => deletingIds.delete(item.id));

    // 404 значит записка уже удалена на другом устройстве или на сайте: считаем успехом
    const isSucceeded = (result: Awaited<ReturnType<typeof deleteRite>> | null) =>
      Boolean(result && (result.ok || result.status === 404));

    const succeeded = results.filter(({ result }) => isSucceeded(result));
    if (succeeded.length > 0) {
      const deletedVer = ++mutationVersion;
      for (const { item } of succeeded) {
        deletedAtVersion.set(item.id, deletedVer);
      }
    }

    const failed = results.filter(({ result }) => !isSucceeded(result));
    if (failed.length > 0) {
      const existingIds = new Set(items.value.map((item) => item.id));
      for (const { item, result } of failed) {
        const errors = result && !result.ok ? collectErrors(result.errors) : [];
        item.errors = errors.length > 0 ? errors : [{ description: "Система временно недоступна" }];
        if (!existingIds.has(item.id)) {
          items.value.push(item);
          existingIds.add(item.id);
        }
      }
      restoreOriginalOrder();
      deleteError.value = failed
        .flatMap(({ item }) => item.errors.map((error) => error.description))
        .filter((text, index, all) => all.indexOf(text) === index)
        .join(", ");
      scheduleClearErrors(ERROR_VISIBLE_MS);
    }
    // Пока ждёт следующая партия или другое удаление в полёте, порядок ещё нужен для возврата
    if (pendingDeleted.value.length === 0 && deletingIds.size === 0) originalOrder = [];
  }

  return {
    activeTab,
    setActiveTab,
    items,
    isLoaded,
    isLoading,
    loadError,
    pendingDeleted,
    deleteError,
    lastFixedDateNumbers,
    lastFixedDateIds,
    lastFailedDateIds,
    pendingPaymentIds,
    isPendingPayment,
    selectedItems,
    total,
    anySelected,
    allSelected,
    load,
    addItem,
    updateItem,
    validateAndFixDates,
    clearErrors,
    scheduleClearErrors,
    markPaid,
    markPendingPayment,
    removeItems,
    removeSelected,
    undoRemoval,
    commitRemoval,
  };
});
