import { f7 } from "framework7-vue";
import { device } from "@/js/device";
import {
  diffReminderEvents,
  planReminderEvents,
  REMINDER_EVENT_PREFIX,
  type PlannedReminder,
  type StoredReminderEvent,
} from "@/js/reminderCalendarPlan";
import { nativeCalendar, ensureNativeCalendar } from "@/services/native/calendar";
import { getNativePlatform } from "@/services/native/nativeRpc";
import {
  CALENDAR_RESULT_MESSAGE,
  type CalendarRpcItemResult,
  type CalendarStoredEvent,
} from "@/services/native/protocol";
import type { RemindersState } from "@/stores/reminders";
import type { DeepReadonly } from "vue";

/**
 * Откуда запущена синхронизация.
 * startup — старт приложения, без диалога прав.
 * page — открытие страницы напоминаний, права спрашиваются один раз за сессию.
 * interactive — галочка или время, ошибка показывается диалогом.
 */
export type ReminderSyncMode = "startup" | "page" | "interactive";

interface ReminderSnapshot {
  stored: StoredReminderEvent[];
  ids: string[];
}

type ReadState = () => DeepReadonly<RemindersState>;

const MODE_RANK: Record<ReminderSyncMode, number> = { startup: 0, page: 1, interactive: 2 };

/**
 * Тексты для пользователя по известным message нативки. Остальное (трассировки, тексты системы)
 * в диалог не попадает: оно уходит только в консоль.
 */
const USER_MESSAGES: Record<string, string> = {
  [CALENDAR_RESULT_MESSAGE.PERMISSION_DENIED]: "Нет доступа к календарю",
  [CALENDAR_RESULT_MESSAGE.CALENDAR_NOT_FOUND]: "Календарь не найден",
  [CALENDAR_RESULT_MESSAGE.CALENDAR_INACTIVE]: "Календарь выключен в настройках",
};

let readState: ReadState | null = null;
let running = false;
let queued: ReminderSyncMode | null = null;
let permissionAsked = false;

/**
 * Оставляет только напоминания страницы. Если среди них есть local, дальше пишем в него.
 * @param events — ответ calendar.listEventIds
 */
const snapshotOf = (events: CalendarStoredEvent[]): ReminderSnapshot => {
  const reminders = events.filter(
    (item) => item.id.startsWith(REMINDER_EVENT_PREFIX) && typeof item.revision === "string"
  );
  return {
    stored: reminders.map((item) => ({ id: item.id, revision: item.revision })),
    ids: reminders.map((item) => item.id),
  };
};

/** @returns привязки нативки. При ошибке моста — пустой список. */
const loadNativeEvents = async (): Promise<CalendarStoredEvent[]> => {
  try {
    const listed = await nativeCalendar.listEventIds();
    return Array.isArray(listed.events) ? listed.events : [];
  } catch (err) {
    console.error("Не удалось прочитать id событий календаря", err);
    return [];
  }
};

/**
 * Показывает ошибку пользователю. Если диалог недоступен, пишет её в консоль.
 * @param message — текст диалога
 */
const notify = (message: string) => {
  try {
    f7.dialog.alert(message);
  } catch (err) {
    console.error(message, err);
  }
};

/**
 * Предлагает открыть настройки приложения при отказе в доступе к календарю.
 */
function notifyPermissionDenied(): void {
  try {
    f7.dialog
      .create({
        title: "Нет доступа к календарю",
        text: "Для сохранения напоминаний разрешите приложению доступ к календарю в настройках устройства.",
        destroyOnClose: true,
        closeByBackdropClick: true,
        buttons: [
          { text: "Отмена" },
          {
            text: "Настройки",
            strong: true,
            onClick: () => {
              permissionAsked = false;
              if (window.androidJsHandler?.openSettings) {
                window.androidJsHandler.openSettings("settings");
              } else {
                device.openSettings("settings");
              }
            },
          },
        ],
      })
      .open();
  } catch (err) {
    console.error("Нет доступа к календарю", err);
  }
}

/**
 * Оставляет более «громкий» режим: interactive важнее page, page важнее startup.
 * @param current — уже стоящий в очереди режим или null
 * @param next — новый запрос
 * @returns режим, с которым пойдёт следующий проход
 */
const stronger = (current: ReminderSyncMode | null, next: ReminderSyncMode): ReminderSyncMode => {
  if (!current || MODE_RANK[next] > MODE_RANK[current]) return next;
  return current;
};

/**
 * Ставит синхронизацию в очередь. Пока идёт запись, страница не блокируется.
 * Если за это время галочки изменились, следом выполняется ещё один проход с итоговым состоянием.
 * @param mode — старт, страница или действие пользователя
 * @param read — текущие галочки; читается в момент прохода, не в момент вызова
 */
export function scheduleReminderSync(mode: ReminderSyncMode, read: ReadState): void {
  readState = read;
  queued = stronger(queued, mode);
  if (running) return;
  running = true;
  void pump();
}

/** Выполняет очередь, пока в неё приходят новые запросы. Ничего не возвращает. */
async function pump(): Promise<void> {
  try {
    while (queued && readState) {
      const mode = queued;
      queued = null;
      try {
        await syncOnce(mode, readState);
      } catch (err) {
        console.error("Не удалось синхронизировать напоминания", err);
      }
    }
  } finally {
    running = false;
    if (queued && readState) {
      running = true;
      void pump();
    }
  }
}

/**
 * Один проход: сверяет галочки с привязкой нативки и пишет разницу.
 * Без моста и без изменений выходит сразу. Права запрашивает только page и interactive.
 * @param mode — показывать ли диалог
 * @param read — галочки на момент прохода
 */
async function syncOnce(mode: ReminderSyncMode, read: ReadState): Promise<void> {
  if (!(await ensureNativeCalendar())) return;

  const current = snapshotOf(await loadNativeEvents());
  const desired = planReminderEvents(read(), new Date());
  const diff = diffReminderEvents(current.stored, desired, current.ids);
  if (!diff.deleteIds.length && !diff.add.length && !diff.update.length) return;

  if (!(await ensurePermission(mode))) return;

  const fresh = snapshotOf(await loadNativeEvents());
  const freshDesired = planReminderEvents(read(), new Date());
  await apply(diffReminderEvents(fresh.stored, freshDesired, fresh.ids), mode);
}

/**
 * Проверяет доступ к календарю. При отказе предлагает перейти в настройки приложения.
 * Startup диалог не показывает. Для page диалог показывается не чаще одного раза за сессию,
 * но если пользователь нажал «Настройки», флаг сбрасывается для повторной проверки при возврате.
 * @param mode — режим синхронизации
 * @returns true, если писать в календарь можно
 */
async function ensurePermission(mode: ReminderSyncMode): Promise<boolean> {
  if ((await nativeCalendar.hasPermissions()).granted) return true;
  if (mode === "startup") return false;
  if (mode === "page" && permissionAsked) return false;
  permissionAsked = true;
  const granted = (await nativeCalendar.requestPermissions()).granted;
  if (!granted) notifyPermissionDenied();
  return granted;
}

/**
 * Удаляет лишние события, обновляет изменившиеся и добавляет новые.
 * Обновление меняет ссылку и напоминания. Если записи в календаре уже нет, она создаётся заново.
 * @param diff — кого удалить, обновить и создать
 * @param target — sync или local по уже записанным напоминаниям
 * @param mode — кому показывать ошибку
 */
async function apply(
  diff: ReturnType<typeof diffReminderEvents>,
  mode: ReminderSyncMode
): Promise<void> {
  const removed = new Set<string>();
  if (diff.deleteIds.length) {
    const deleted = await nativeCalendar.deleteEvents({ ids: diff.deleteIds });
    report(deleted.results, mode, new Set([CALENDAR_RESULT_MESSAGE.EVENT_NOT_FOUND]));
    for (const item of deleted.results) {
      if (item.success || item.message === CALENDAR_RESULT_MESSAGE.EVENT_NOT_FOUND) removed.add(item.id);
    }
  }

  const toAdd = [...diff.add];
  if (diff.update.length) {
    const updated = await nativeCalendar.updateEvents({
      events: diff.update.map((item) => ({ ...item.event, revision: item.revision })),
    });
    report(updated.results, mode, new Set([CALENDAR_RESULT_MESSAGE.EVENT_NOT_FOUND]));
    updated.results.forEach((item, index) => {
      if (!item.success && item.message === CALENDAR_RESULT_MESSAGE.EVENT_NOT_FOUND) {
        toAdd.push(diff.update[index]);
      }
    });
  }

  const deleteIds = new Set(diff.deleteIds);
  const creating = toAdd.filter((item) => !deleteIds.has(item.id) || removed.has(item.id));
  if (!creating.length) return;

  const results = await add(creating);
  report(results, mode);
}

/**
 * Пишет события в календарь. Нативная сторона сама решает, в какой.
 * @param items — готовые события
 * @returns итог по каждому событию
 */
async function add(items: PlannedReminder[]): Promise<CalendarRpcItemResult[]> {
  const response = await nativeCalendar.addEvents({
    events: items.map((item) => ({ ...item.event, revision: item.revision })),
  });
  return response.results;
}

/**
 * Показывает первую ошибку. При старте пишет в консоль, иначе открывает диалог.
 * @param results — итоги добавления или удаления
 * @param mode — кому показывать
 * @param ignore — тексты message, которые ошибкой не считаются (например Event не найдено)
 */
function report(results: CalendarRpcItemResult[], mode: ReminderSyncMode, ignore = new Set<string>()): void {
  const failed = results.find((item) => !item.success && !ignore.has(item.message ?? ""));
  if (!failed) return;
  if (mode === "startup") {
    console.error("Не удалось обновить календарь", failed.message);
    return;
  }
  if (failed.message === CALENDAR_RESULT_MESSAGE.PERMISSION_DENIED) {
    notifyPermissionDenied();
    return;
  }
  console.error("Не удалось обновить календарь", failed.message);
  notify(USER_MESSAGES[failed.message ?? ""] ?? "Не удалось обновить календарь");
}

/** Сбрасывает очередь и флаг диалога прав. Только для тестов. */
export function resetReminderCalendarForTests(): void {
  readState = null;
  running = false;
  queued = null;
  permissionAsked = false;
}
