import type { DeepReadonly } from "vue";
import { addDays, format, getDay, getYear, isBefore, set, startOfDay } from "date-fns";
import { calculateEaster, parseMemoTemplate, resolveMemoDate } from "@/components/saint/memoDays";
import type { CalendarRpcEvent, CalendarWeekday } from "@/services/native/protocol";
import { REMINDER_OFFSET_ORDER } from "@/js/reminderDescription";
import type {
  EventReminder,
  EventReminderSectionId,
  PrayerRuleGroupId,
  ReminderOffset,
  RemindersState,
} from "@/stores/reminders";

/** Id событий страницы напоминаний. Чужие id календаря синхронизация не трогает. */
export const REMINDER_EVENT_PREFIX = "reminder:";

const DAY_URL = "https://app.valaam.ru/webview/#calendar:/days/";
const MORNING_URL = "https://app.valaam.ru/webview/#prayers:/prayers/text/47166";
const EVENING_URL = "https://app.valaam.ru/webview/#prayers:/prayers/text/47167";
const MORNING_TITLE = "Утреннее правило";
const EVENING_TITLE = "Вечернее правило";
/** Раньше 15:00 — утреннее правило, с 15:00 — вечернее. */
const EVENING_FROM = "15:00";

const OFFSET_DAYS: Record<ReminderOffset, number> = {
  day0: 0,
  day1: 1,
  day2: 2,
  day3: 3,
  day5: 5,
  week: 7,
};

const WEEKDAY_CODE: CalendarWeekday[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const GROUP_DAYS: Record<PrayerRuleGroupId, CalendarWeekday[]> = {
  weekdays: ["MO", "TU", "WE", "TH", "FR"],
  weekends: ["SA", "SU"],
};

interface CatalogEntry {
  section: EventReminderSectionId;
  template: string;
  title: string;
}

const CATALOG: CatalogEntry[] = [
  { section: "holidays", template: "E", title: "Пасха. Светлое Христово Воскресение" },
  { section: "holidays", template: "E-7", title: "Вход Господень в Иерусалим" },
  { section: "holidays", template: "E+39", title: "Вознесение Господне" },
  { section: "holidays", template: "E+49", title: "День Святой Троицы. Пятидесятница" },
  { section: "holidays", template: "Y0119", title: "Крещение Господне. Богоявление" },
  { section: "holidays", template: "Y0215", title: "Сретение Господне" },
  { section: "holidays", template: "Y0407", title: "Благовещение Пресвятой Богородицы" },
  { section: "holidays", template: "Y0819", title: "Преображение Господне" },
  { section: "holidays", template: "Y0828", title: "Успение Пресвятой Богородицы" },
  { section: "holidays", template: "Y0921", title: "Рождество Пресвятой Богородицы" },
  { section: "holidays", template: "Y0927", title: "Воздвижение Креста Господня. День постный" },
  { section: "holidays", template: "Y1204", title: "Введение во храм Пресвятой Богородицы" },
  { section: "holidays", template: "Y0107", title: "Рождество Христово" },
  { section: "holidays", template: "Y0114", title: "Обрезание Господне и память святителя Василия Великого" },
  { section: "holidays", template: "Y0707", title: "Рождество Иоанна Предтечи" },
  { section: "holidays", template: "Y0712", title: "Святых первоверховных апостолов Петра и Павла" },
  { section: "holidays", template: "Y0911", title: "Усекновение главы Иоанна Предтечи. День постный" },
  { section: "holidays", template: "Y1014", title: "Покров Пресвятой Богородицы" },
  { section: "fasting", template: "E-48", title: "Начало Великого поста" },
  { section: "fasting", template: "E+57", title: "Начало Петрова поста" },
  { section: "fasting", template: "Y0814", title: "Начало Успенского поста" },
  { section: "fasting", template: "Y1128", title: "Начало Рождественского поста" },
  { section: "fasting", template: "Y0118", title: "Крещенский сочельник (Навечерие Богоявления)" },
  { section: "memorial", template: "SU~0207", title: "Поминовение пострадавших в годину гонений за веру Христову" },
  { section: "memorial", template: "E-57", title: "Мясопустная вселенская родительская суббота" },
  { section: "memorial", template: "E-36", title: "Родительская суббота 2-й седмицы Великого Поста" },
  { section: "memorial", template: "E-29", title: "Родительская суббота 3-й седмицы Великого Поста" },
  { section: "memorial", template: "E-22", title: "Родительская суббота 4-й седмицы Великого Поста" },
  { section: "memorial", template: "E+9", title: "Радоница (во вторник второй седмицы после Пасхи)" },
  { section: "memorial", template: "E+48", title: "Троицкая вселенская родительская суббота" },
  {
    section: "memorial",
    template: "Y0509",
    title: "День поминовения всех погибших в период Великой Отечественной войны",
  },
  {
    section: "memorial",
    template: "Y1030",
    title:
      "Поминовение всех православных христиан, безвинно богоборцами убиенных или безвинно пребывавших в заключении",
  },
  { section: "memorial", template: "SA<1108", title: "Димитриевская родительская суббота" },
];

export interface PlannedReminder {
  id: string;
  revision: string;
  event: CalendarRpcEvent;
}

export interface StoredReminderEvent {
  id: string;
  revision: string;
}

export interface ReminderDiff {
  deleteIds: string[];
  /** Id ещё нет в привязке. */
  add: PlannedReminder[];
  /** Тот же id, другой revision: поменять ссылку и напоминания, серию не снимать. */
  update: PlannedReminder[];
}

/** @param date — день праздника. @returns код ссылки YYYYMMDD. */
const dayCode = (date: Date) => format(date, "yyyyMMdd");

/** @param date — календарный день. @returns полночь этого дня, yyyy-MM-ddT00:00:00. */
const midnightStamp = (date: Date) => format(startOfDay(date), "yyyy-MM-dd'T'HH:mm:ss");

/** @param date — момент звонка. @returns yyyy-MM-ddTHH:mm:ss. */
const dateTimeStamp = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");

/**
 * День feast ещё не прошёл. Сегодня считается актуальным.
 * @param feast — день праздника
 * @param today — текущий момент
 */
const isCurrentOrFutureDay = (feast: Date, today: Date) => !isBefore(startOfDay(feast), startOfDay(today));

/**
 * Ставит на день часы и минуты напоминания.
 * @param date — день
 * @param time — "HH:mm"
 * @returns местный момент с секундами 0
 */
const atTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return set(startOfDay(date), { hours, minutes, seconds: 0, milliseconds: 0 });
};

/**
 * Дата шаблона в указанном году. `E` — Пасха без сдвига, остальное разбирает парсер дней памяти.
 * @param template — `Y0107`, `E-7`, `SU~0207`, `SA<1108` или `E`
 * @param year — гражданский год
 * @returns день по новому стилю или null, если шаблон неизвестен
 */
function resolveTemplate(template: string, year: number): Date | null {
  if (template === "E") return calculateEaster(year);
  const rule = parseMemoTemplate(template);
  if (!rule) return null;
  return resolveMemoDate(rule, year);
}

/**
 * @param reminder — раздел праздников, постов или поминовений
 * @returns включённые смещения в порядке страницы: день события, за 1 день, …
 */
function enabledOffsets(reminder: DeepReadonly<EventReminder>): ReminderOffset[] {
  return REMINDER_OFFSET_ORDER.filter((offset) => reminder.offsets[offset]);
}

/**
 * Событие на весь день. Смещения становятся alarmDates в выбранное время.
 * Без year — ежегодная серия, id без года. С year — одно переходящее вхождение.
 * @param entry — шаблон и название из каталога
 * @param feast — день праздника
 * @param reminder — время и смещения раздела
 * @param offsets — уже отфильтрованные включённые смещения
 * @param year — год в id переходящей даты; для постоянной не передаётся
 * @returns id, revision и тело для calendar.addEvents
 */
function feastEvent(
  entry: CatalogEntry,
  feast: Date,
  reminder: DeepReadonly<EventReminder>,
  offsets: ReminderOffset[],
  year?: number
): PlannedReminder {
  const code = dayCode(feast);
  const id = year === undefined
    ? `${REMINDER_EVENT_PREFIX}${entry.section}:${entry.template}`
    : `${REMINDER_EVENT_PREFIX}${entry.section}:${entry.template}:${year}`;
  const revision = `${reminder.time}|${entry.title}|${offsets.join(",")}|${code}`;
  const event: CalendarRpcEvent = {
    id,
    title: entry.title,
    date: midnightStamp(feast),
    url: `${DAY_URL}${code}`,
    allDay: true,
    alarmDates: offsets.map((offset) => dateTimeStamp(atTime(addDays(feast, -OFFSET_DAYS[offset]), reminder.time))),
  };
  if (year === undefined) event.recurrence = { frequency: "yearly" };
  return { id, revision, event };
}

/**
 * Повторяющееся событие молитвенного правила на один час. Раньше 15:00 — утреннее, с 15:00 — вечернее.
 * @param group — будни или выходные
 * @param index — номер времени в списке группы
 * @param time — "HH:mm"
 * @param now — от него считается ближайший подходящий день
 * @returns id, revision и еженедельное событие
 */
function prayerEvent(
  group: PrayerRuleGroupId,
  index: number,
  time: string,
  now: Date
): PlannedReminder {
  const evening = time >= EVENING_FROM;
  const title = evening ? EVENING_TITLE : MORNING_TITLE;
  const url = evening ? EVENING_URL : MORNING_URL;
  const byDay = GROUP_DAYS[group];
  const id = `${REMINDER_EVENT_PREFIX}prayer:${group}:${index}`;
  return {
    id,
    revision: `${time}|${title}|${url}`,
    event: {
      id,
      title,
      date: dateTimeStamp(nextWeeklyStart(byDay, time, now)),
      url,
      recurrence: { frequency: "weekly", byDay: [...byDay] },
    },
  };
}

/**
 * Ближайший день из byDay, у которого это время ещё не прошло. Сегодня подходит, если время впереди.
 * @param byDay — дни недели серии
 * @param time — "HH:mm"
 * @param now — текущий момент
 * @returns местные дата и время начала серии
 */
function nextWeeklyStart(byDay: readonly CalendarWeekday[], time: string, now: Date): Date {
  const [hours, minutes] = time.split(":").map(Number);
  for (let shift = 0; shift < 8; shift++) {
    const candidate = set(addDays(startOfDay(now), shift), { hours, minutes, seconds: 0, milliseconds: 0 });
    if (!byDay.includes(WEEKDAY_CODE[getDay(candidate)])) continue;
    if (!isBefore(candidate, now)) return candidate;
  }
  return set(addDays(startOfDay(now), 7), { hours, minutes, seconds: 0, milliseconds: 0 });
}

/**
 * События, которые должны быть в календаре при текущих галочках.
 * Постоянная дата — одна ежегодная серия на ближайший ещё не прошедший день.
 * Переходящая — этот год, если день не прошёл, и следующий год.
 * Выключенный раздел и раздел без смещений не дают событий.
 * @param state — галочки страницы напоминаний
 * @param now — «сегодня», от него отсекаются прошедшие дни
 * @returns полный список событий, которые должны лежать в календаре
 */
export function planReminderEvents(state: DeepReadonly<RemindersState>, now: Date): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  const year = getYear(now);

  for (const entry of CATALOG) {
    const reminder = state[entry.section];
    if (!reminder.enabled) continue;
    const offsets = enabledOffsets(reminder);
    if (!offsets.length) continue;

    if (entry.template.startsWith("Y")) {
      const thisYear = resolveTemplate(entry.template, year);
      const feast =
        thisYear && isCurrentOrFutureDay(thisYear, now) ? thisYear : resolveTemplate(entry.template, year + 1);
      if (feast) planned.push(feastEvent(entry, feast, reminder, offsets));
      continue;
    }

    for (const candidate of [year, year + 1]) {
      const feast = resolveTemplate(entry.template, candidate);
      if (feast && isCurrentOrFutureDay(feast, now)) {
        planned.push(feastEvent(entry, feast, reminder, offsets, candidate));
      }
    }
  }

  if (state.prayerRule.enabled) {
    (["weekdays", "weekends"] as const).forEach((group) => {
      const rule = state.prayerRule[group];
      if (!rule.enabled) return;
      rule.times.forEach((time, index) => {
        planned.push(prayerEvent(group, index, time, now));
      });
    });
  }

  return planned;
}

/**
 * Сравнивает желаемый список и привязку нативки.
 * Совпавший revision не пишется заново.
 * Другой revision того же id обновляет событие. Нет в привязке — создать. Нет в галочках — удалить.
 * Чужие id пропускаются.
 * @param stored — записи calendar.listEventIds с префиксом напоминаний
 * @param desired — что следует из текущих галочек
 * @param nativeReminderIds — те же id, плюс чужие, если они попали в список
 * @returns deleteIds — снять, add — создать, update — изменить ссылку и напоминания
 */
export function diffReminderEvents(
  stored: StoredReminderEvent[],
  desired: PlannedReminder[],
  nativeReminderIds: string[]
): ReminderDiff {
  const storedById = new Map(stored.map((item) => [item.id, item]));
  const desiredById = new Map(desired.map((item) => [item.id, item]));
  const deleteIds = new Set<string>();

  for (const id of nativeReminderIds) {
    if (!id.startsWith(REMINDER_EVENT_PREFIX)) continue;
    if (!storedById.has(id)) deleteIds.add(id);
  }

  for (const item of stored) {
    if (!desiredById.has(item.id)) deleteIds.add(item.id);
  }

  const add: PlannedReminder[] = [];
  const update: PlannedReminder[] = [];
  for (const item of desired) {
    const previous = storedById.get(item.id);
    if (!previous) add.push(item);
    else if (previous.revision !== item.revision) update.push(item);
  }
  return { deleteIds: [...deleteIds], add, update };
}
