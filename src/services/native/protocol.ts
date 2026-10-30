import type { DownloadModuleId, DownloadProgress } from "@/services/download/types";
import type { ImageSize } from "@/services/api/DaysApi";

/**
 * Типы протокола нативного моста v1. Источник истины: docs/native-bridge-protocol.md
 */

export type NativeErrorCode =
  | "UNKNOWN_TABLE"
  | "INVALID_PARAMS"
  | "DB_ERROR"
  | "NETWORK"
  | "HTTP_ERROR"
  | "SECTIONS_NOT_READY"
  | "NOT_SUPPORTED"
  | "INTERNAL";

export type BridgeCapability = "db" | "download" | "autoUpdate" | "images" | "seed" | "pay" | "calendar";

/** SU — воскресенье, MO — понедельник, … SA — суббота. */
export type CalendarWeekday = "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA";

/**
 * Повторение события календаря.
 * weekly — молитвенное правило, дни в byDay.
 * yearly — неподвижный праздник: месяц, число и время берутся из date.
 */
export interface CalendarRecurrence {
  frequency: "weekly" | "yearly";
  byDay?: CalendarWeekday[];
}

/** Событие для calendar.addEvents. Дата — локальная, yyyy-MM-ddTHH:mm:ss. */
export interface CalendarRpcEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  url?: string;
  /**
   * Моменты напоминания в том же формате, что date.
   * Поле опущено — одно напоминание в момент начала.
   * Пустой массив — без напоминаний.
   */
  alarmDates?: string[];
  recurrence?: CalendarRecurrence;
}

/**
 * Тексты `CalendarRpcItemResult.message` при `success: false`.
 * Сбой записи или удаления в системном календаре сюда не входит: это трассировка или `Unknown Error` на Android и `localizedDescription` на iOS.
 */
export const CALENDAR_RESULT_MESSAGE = {
  /** Нет доступа. У каждого элемента addEvents и deleteEvents, обе платформы. */
  PERMISSION_DENIED: "Permission not granted",
  /** Пустой id. Обе платформы. */
  NO_ID: "Нет id",
  /** Пустой title при добавлении. Обе платформы. */
  NO_TITLE: "Нет названия",
  /** recurrence.frequency не weekly и не yearly. Обе платформы. */
  UNKNOWN_RECURRENCE: "Неизвестное повторение",
  /** Удаление id, которого приложение не записывало или которое уже стёрто. Обе платформы. */
  EVENT_NOT_FOUND: "Event not found",
  /** Android, все элементы addEvents: календарь не найден. */
  CALENDAR_NOT_FOUND: "Calendar not found",
  /** Android, все элементы addEvents: календарь выключен. */
  CALENDAR_INACTIVE: "Calendar is inactive",
  /** Android, date не разобралась. */
  INVALID_DATE: "Некорректная дата",
  /** Android, recurrence не объект. */
  INVALID_RECURRENCE: "Некорректное повторение",
  /** Android, элемент events не объект (вызов при этом успешен). iOS этим текстом рвёт весь вызов, код INVALID_PARAMS. */
  NOT_AN_OBJECT: "Событие должно быть объектом",
  /** iOS, date не разобралась. Ожидается yyyy-MM-ddTHH:mm:ss. */
  INVALID_DATE_IOS: "Invalid date format. Should be: yyyy-MM-ddTHH:mm",
  /** Android, запись в календарь не вернула id. */
  UNKNOWN_ERROR: "Unknown Error",
} as const;

/** Тексты ошибки RPC `INVALID_PARAMS` для calendar.addEvents и calendar.deleteEvents. */
export const CALENDAR_RPC_ERROR = {
  EVENTS_NOT_ARRAY: "events должен быть массивом",
  IDS_NOT_ARRAY: "ids должен быть массивом",
  BAD_TARGET: "target должен быть sync или local",
  /** iOS, весь вызов. */
  EVENT_NOT_OBJECT: "Событие должно быть объектом",
  /** iOS, весь вызов. */
  ID_NOT_STRING: "id должен быть строкой",
} as const;

/** Итог одного события. Отказ не является ошибкой RPC: см. CALENDAR_RESULT_MESSAGE. */
export interface CalendarRpcItemResult {
  id: string;
  success: boolean;
  /** Есть при success: false */
  message?: string;
}

/**
 * applying: идёт блокирующий этап (индексы, разделы, раскраска), JS должен ждать.
 * importing: индексы готовы, модули (calendar, molitvoslov) догружаются в фоне через download.progress.
 */
export type SeedStatus = "applying" | "importing" | "completed" | "skipped" | "error";

export interface SeedState {
  status: SeedStatus;
  seedVersion: number | null;
  createdAt: string | null;
  error?: string;
}

export interface BridgeInfo {
  protocolVersion: number;
  platform: "android" | "ios";
  appVersion: string;
  capabilities: BridgeCapability[];
}

export const SUPPORTED_PROTOCOL_VERSION = 1;

export interface ModuleInfo {
  downloaded: boolean;
  downloadedBytes: number | null;
  estimatedBytes: number | null;
  lastSyncAt: string | null;
}

export interface AutoUpdateState {
  enabled: boolean;
  lastCheckAt: string | null;
  nextCheckAt: string | null;
  running: boolean;
}

export interface StorageInfo {
  offlineUsedBytes: number;
  freeBytes: number;
  totalBytes: number;
}

/**
 * Итог платёжного шага. Отмена, отказ SDK, занятость и неверные параметры приходят в самом результате
 * (status "error" с message), поэтому вызов не зависает. RPC-ошибка бывает только у сбоя моста
 * (например NOT_SUPPORTED, если нативка без оплаты).
 */
export type PayStatus = "success" | "cancelled" | "error" | "unknown";

export interface PayResult {
  status: PayStatus;
  message?: string;
  /** Только у pay.tokenize со статусом success */
  paymentToken?: string;
  /** Имя способа оплаты в API ЮKassa, только у pay.tokenize со статусом success */
  paymentMethodType?: string;
}

type ModuleParams = { moduleId: DownloadModuleId };

/** Карта методов: параметры и результат каждого вызова */
export interface RpcMethods {
  "bridge.getInfo": { params: Record<string, never>; result: BridgeInfo };

  "db.get": { params: { table: string; key: string | number }; result: object | null };
  "db.getMany": { params: { table: string; keys: (string | number)[] }; result: (object | null)[] };
  "db.getAll": { params: { table: string }; result: object[] };
  "db.put": { params: { table: string; item: object }; result: null };
  "db.putAll": { params: { table: string; items: object[] }; result: null };
  "db.delete": { params: { table: string; key: string | number }; result: null };
  "db.clear": { params: { table: string }; result: null };
  "db.count": { params: { table: string }; result: number };

  "download.getProgress": { params: ModuleParams; result: DownloadProgress | null };
  "download.getAllProgress": { params: Record<string, never>; result: DownloadProgress[] };
  "download.getModuleInfo": { params: ModuleParams; result: ModuleInfo };
  "download.saveEstimate": { params: ModuleParams & { bytes: number }; result: null };
  "download.getSize": {
    params: ModuleParams & { since?: string; options?: { imageSize?: ImageSize } };
    result: number;
  };
  "download.getUpdateSize": { params: ModuleParams; result: number | null };
  "download.start": {
    params: ModuleParams & { options?: { imageSize?: ImageSize } };
    result: { accepted: true };
  };
  "download.checkForUpdate": {
    params: ModuleParams & { since?: string };
    result: { accepted: boolean; started: boolean };
  };
  "download.cancel": { params: ModuleParams; result: null };
  "download.delete": { params: ModuleParams; result: null };
  "download.dismissError": { params: ModuleParams; result: null };
  "download.resumeInterrupted": { params: Record<string, never>; result: null };

  "autoUpdate.set": {
    params: { enabled: boolean };
    result: { enabled: boolean; lastCheckAt: string | null };
  };
  "autoUpdate.getState": { params: Record<string, never>; result: AutoUpdateState };

  "storage.getInfo": { params: Record<string, never>; result: StorageInfo };

  "seed.getState": { params: Record<string, never>; result: SeedState };

  "pay.tokenize": {
    params: { amount: string; title: string; subtitle: string };
    result: PayResult;
  };
  "pay.confirm": {
    params: { confirmationUrl: string; paymentMethodType: string };
    result: PayResult;
  };
  "pay.close": { params: Record<string, never>; result: PayResult };

  "calendar.hasPermissions": { params: Record<string, never>; result: { granted: boolean } };
  "calendar.requestPermissions": { params: Record<string, never>; result: { granted: boolean } };
  "calendar.addEvents": {
    params: {
      events: CalendarRpcEvent[];
      /** sync — основной календарь, local — локальный календарь приложения (Android). iOS пишет в календарь по умолчанию. */
      target: "local" | "sync";
      /** Название локального календаря. Нужно при target "local". */
      title?: string;
    };
    result: { results: CalendarRpcItemResult[] };
  };
  "calendar.deleteEvents": {
    params: { ids: string[] };
    result: { results: CalendarRpcItemResult[] };
  };
}

export type RpcMethod = keyof RpcMethods;

/** Карта событий нативка -> JS */
export interface RpcEvents {
  "download.progress": DownloadProgress;
  "seed.state": SeedState;
}

export type RpcEvent = keyof RpcEvents;

export interface RpcRequest {
  id: string;
  method: string;
  params: unknown;
}

export interface RpcErrorBody {
  code: NativeErrorCode | string;
  message: string;
}

export type RpcResponse =
  | { id: string; ok: true; result: unknown }
  | { id: string; ok: false; error: RpcErrorBody };

export interface RpcEventMessage {
  event: string;
  data: unknown;
}
