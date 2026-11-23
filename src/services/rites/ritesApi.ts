import { getNativePlatform } from "@/services/native/nativeRpc";

// Как и в rites-test.vue: пока всё работает с dev.valaam.ru. Для прода поменять здесь или задать VITE_PAYMENT_API_URL.
export const RITES_API_URL: string =
  import.meta.env.VITE_PAYMENT_API_URL || "https://dev.valaam.ru/api";

const CART_PAGE_SIZE = 50;
const HISTORY_PAGE_SIZE = 20;
const GID_TIMEOUT_MS = 5000;

const CLIENT_ID_KEY = "rites-client-id";
const CONFIRMED_EMAIL_KEY = "rites-confirmedEmail";
const EMAIL_KEY = "rites-email";

export interface RiteName {
  name: string;
  explanation: string;
}

/** Тип записки: ответ GET /rites/types и поле type у записки (lib/Rites/Types.php) */
export interface RiteType {
  id: number;
  active: boolean;
  code: string;
  typeName: string;
  name: string;
  shortName: string;
  type: "health" | "repose" | null;
  price: number;
  minPrice: number;
  /** Дней на обработку: ближайшая дата = сегодня + processing + 1 */
  processing: number;
  postPeriod: number;
  period: "40days" | "1year" | "1day" | null;
  periodDays: number;
  disabled: boolean;
  /** Дни недели 1 (пн) .. 7 (вс), в которые совершается поминовение. Пустой список: любой день */
  weekDays: number[];
  notificationDays: number;
  description: string;
}

/** Ограничение дат: GET /rites/typeRestrictions (lib/Rites/TypeRestrictions.php) */
export interface TypeRestriction {
  type: "allow" | "disallow";
  /** Unix-время начала первого дня */
  from: number;
  /** Unix-время конца последнего дня */
  to: number;
  /** Типы записок, к которым относится ограничение */
  rites: number[];
}

export interface RiteDatePoint {
  ts: number;
  value: string;
}

/** Статус записки (lib/Rites/Statuses.php) */
export interface RiteStatus {
  id: number;
  xmlId: string;
  name?: string;
  /** Цвет статуса для светлой темы; у «new» его нет */
  color?: string | null;
  /** Только в ответе GET /rites/filter: по выбранным фильтрам записок с таким статусом нет */
  disabled?: boolean;
}

/** Записка: Rites::prepareItem (lib/Rites/Rites.php) */
export interface Rite {
  id: number;
  hash?: string;
  lid?: string;
  number: string;
  email?: string | null;
  phone?: string | null;
  names: RiteName[];
  dateCreate?: RiteDatePoint | null;
  datePayment?: RiteDatePoint | null;
  status?: RiteStatus | null;
  type: RiteType | null;
  sum: number;
  sumFormatted?: string | null;
  paymentId?: number;
  period?: { from?: RiteDatePoint | null; to?: RiteDatePoint | null };
  canChange?: boolean;
  isFree?: boolean;
  comment?: string | null;
}

export interface ApiError {
  code?: string;
  field?: string;
  description: string;
}

/**
 * Ошибки сервера. fieldsErrors и fullErrors обычно массив ошибок, но часть методов
 * (add, addManual) отдаёт одну ошибку объектом: см. collectErrors.
 * Коды fullErrors: accessDenied (403), notFound (404), tooManyItems (400), cantEdit, internal (500).
 * Коды fieldsErrors: badDate (поле rite-N, где N это id записки), badEmail, paymentUnavailable,
 * paymentMissing, badDonate, donateLower.
 * Статусы: initiatePayment отдаёт 409 при fieldsErrors; PUT /rites/N отдаёт 409 при конфликте
 * редактирования и 400 при ошибках валидации.
 */
export interface ApiErrors {
  fieldsErrors?: ApiError[] | ApiError | Record<string, ApiError>;
  fullErrors?: ApiError[] | ApiError | Record<string, ApiError>;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; errors: ApiErrors | null };

/**
 * Ответ initiatePayment (200). Поля gid, payment_id, payment, valaam_action, ids, confirmationToken
 * как в lib/Api/Rites.php. confirmationUrl и status в lib не описаны: ими отвечает dev-сервер
 * на нативную оплату (payment: "sdk" с paymentToken), поэтому они необязательные.
 */
export interface InitiatePaymentResponse {
  gid?: string | null;
  payment_id: number;
  /** Код способа оплаты: "widget", "sdk" и т.д. Для sdk dev-сервер может вернуть объект с confirmationUrl и status */
  payment: string | { confirmationUrl?: string; status?: string };
  valaam_action: string;
  /** Идентификаторы записок через запятую */
  ids: string;
  /** Только для виджета ЮKassa */
  confirmationToken?: string;
  confirmationUrl?: string;
  status?: string;
}

export interface InitiatePaymentParams {
  ids: number[];
  email: string;
  payment: "widget" | "sdk";
  paymentToken?: string;
  gid?: string | null;
}

interface RitesListResponse {
  items?: Rite[];
  nav?: { totalPages?: number };
  confirmedEmail?: string | null;
}

const randomId = (): string =>
  window.crypto.getRandomValues(new Uint32Array(4)).reduce((acc, el) => acc + el.toString(16), "");

export function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = randomId();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function getConfirmedEmail(): string {
  return localStorage.getItem(CONFIRMED_EMAIL_KEY) || "";
}

/** Адрес без хэша: в ссылке из письма хранится `addr|hash`, в поле почты нужен только addr */
function emailAddress(value: string): string {
  const separator = value.indexOf("|");
  return (separator >= 0 ? value.slice(0, separator) : value).trim();
}

export function getSavedEmail(): string {
  return localStorage.getItem(EMAIL_KEY) || emailAddress(getConfirmedEmail());
}

/** Подтверждённая почта из письма: `addr|hash`. Дальше уходит в запросы вместе с clientId */
export function rememberConfirmedEmail(email: string | null | undefined): void {
  const value = email?.trim();
  if (value) localStorage.setItem(CONFIRMED_EMAIL_KEY, value);
}

/** Ищет EMAIL в query ссылки. %7C это разделитель хэша */
export function rememberConfirmedEmailFromUrl(url: string): void {
  const queryIndex = url.indexOf("?");
  if (queryIndex < 0) return;
  rememberConfirmedEmail(new URLSearchParams(url.slice(queryIndex + 1)).get("EMAIL"));
}

export function saveEmail(email: string): void {
  localStorage.setItem(EMAIL_KEY, email.trim());
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const response = await fetch(`${RITES_API_URL}${path}`, init);
  const body = await response.json().catch(() => null);
  return response.ok
    ? { ok: true, data: body as T }
    : { ok: false, status: response.status, errors: body };
}

const jsonPost = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json;charset=utf-8" },
  body: JSON.stringify(body),
});

/** Приводит fieldsErrors/fullErrors к списку: сервер отдаёт массив, объект-список или одну ошибку */
export function toErrorList(value: ApiErrors["fieldsErrors"]): ApiError[] {
  if (!value) return [];
  if (typeof (value as ApiError).description === "string") return [value as ApiError];
  return Object.values(value as Record<string, ApiError>).filter(
    (item): item is ApiError => typeof item?.description === "string",
  );
}

/** Тексты ошибок сервера: сначала по полям, затем общие */
export function collectErrors(errors: ApiErrors | null | undefined): ApiError[] {
  return [...toErrorList(errors?.fieldsErrors), ...toErrorList(errors?.fullErrors)];
}

let statuses: RiteStatus[] | null = null;

async function getStatuses(): Promise<RiteStatus[]> {
  if (statuses) return statuses;

  const result = await request<RiteStatus[]>("/rites/statuses");
  if (!result.ok || !result.data?.length) {
    throw new Error("Не удалось получить статусы записок");
  }
  statuses = result.data;
  return statuses;
}

/** Корзина это записки в статусе «new» (Сформирована); id статуса берём с сервера */
async function getNewStatusId(): Promise<number> {
  const status = (await getStatuses()).find((item) => item.xmlId === "new");
  if (!status) {
    throw new Error("Не удалось получить статусы записок");
  }
  return status.id;
}

interface RitesPage {
  items: Rite[];
  totalPages: number;
}

export type RitesOrder = "ASC" | "DESC";

interface RitesPageOptions {
  order?: RitesOrder;
  typeId?: number | null;
}

async function loadRitesPage(
  statusIds: number[],
  page: number,
  perPage: number,
  { order = "DESC", typeId = null }: RitesPageOptions = {},
): Promise<RitesPage> {
  const query = new URLSearchParams({
    clientId: getClientId(),
    email: getConfirmedEmail(),
    perPage: String(perPage),
    page: String(page),
    order,
    orderBy: "date",
  });
  statusIds.forEach((id, index) => query.append(`status[${index}]`, String(id)));
  if (typeId) query.append("type", String(typeId));

  const result = await request<RitesListResponse>(`/rites?${query}`);
  if (!result.ok) {
    throw new Error(collectErrors(result.errors)[0]?.description ?? `HTTP ${result.status}`);
  }

  const { items, nav, confirmedEmail } = result.data ?? {};
  if (confirmedEmail) {
    localStorage.setItem(CONFIRMED_EMAIL_KEY, confirmedEmail);
  }
  return { items: items ?? [], totalPages: nav?.totalPages ?? 1 };
}

/** Корзина от старых записок к новым: порядок добавления, кнопка добавления под списком */
export async function loadCartRites(): Promise<Rite[]> {
  const statusId = await getNewStatusId();
  const rites: Rite[] = [];

  for (let page = 1; ; page++) {
    const { items, totalPages } = await loadRitesPage([statusId], page, CART_PAGE_SIZE, { order: "ASC" });
    rites.push(...items);
    if (page >= totalPages) break;
  }

  return rites;
}

export interface HistoryQuery {
  page: number;
  order?: RitesOrder;
  typeId?: number | null;
  statusId?: number | null;
}

/** Статусы истории: всё, что уже не в корзине (оплаченные и дальше) */
async function getHistoryStatusIds(): Promise<number[]> {
  return (await getStatuses()).filter((item) => item.xmlId !== "new").map((item) => item.id);
}

/** История записок. Выбранный статус сужает список, без него берутся все статусы истории */
export async function loadHistoryRites({
  page,
  order,
  typeId,
  statusId,
}: HistoryQuery): Promise<{ items: Rite[]; hasMore: boolean }> {
  const statusIds = statusId ? [statusId] : await getHistoryStatusIds();
  const { items, totalPages } = await loadRitesPage(statusIds, page, HISTORY_PAGE_SIZE, {
    order,
    typeId,
  });
  return { items, hasMore: page < totalPages };
}

export interface HistoryFilter {
  types: RiteType[];
  statuses: RiteStatus[];
}

/**
 * Варианты фильтра истории (GET /rites/filter). У вариантов, по которым при остальных выбранных
 * фильтрах записок нет, disabled=true. Статус «new» это корзина, в истории его нет.
 */
export async function loadHistoryFilter({
  typeId,
  statusId,
}: Pick<HistoryQuery, "typeId" | "statusId">): Promise<HistoryFilter> {
  const statusIds = statusId ? [statusId] : await getHistoryStatusIds();
  const query = new URLSearchParams({ clientId: getClientId(), email: getConfirmedEmail() });
  statusIds.forEach((id, index) => query.append(`status[${index}]`, String(id)));
  if (typeId) query.append("type", String(typeId));

  const result = await request<Partial<HistoryFilter>>(`/rites/filter?${query}`);
  if (!result.ok) {
    throw new Error(collectErrors(result.errors)[0]?.description ?? `HTTP ${result.status}`);
  }
  return {
    types: result.data?.types ?? [],
    statuses: (result.data?.statuses ?? []).filter((item) => item.xmlId !== "new"),
  };
}

/** keepalive нужен, когда страница уходит в фон: запрос не должен оборваться */
export function deleteRite(id: number, { keepalive = false } = {}): Promise<ApiResult<unknown>> {
  const query = new URLSearchParams({
    clientId: getClientId(),
    email: getConfirmedEmail(),
  });
  return request(`/rites/${id}?${query}`, { method: "DELETE", keepalive });
}

export async function loadTypeRestrictions(): Promise<TypeRestriction[]> {
  const result = await request<TypeRestriction[]>("/rites/typeRestrictions");
  if (!result.ok) {
    throw new Error(collectErrors(result.errors)[0]?.description ?? `HTTP ${result.status}`);
  }
  return result.data ?? [];
}

/** Код способа оплаты для PUT: сервер требует его у записок в корзине, при оплате он заменяется */
const UPDATE_PAYMENT_CODE = "widget";

/** Сохраняет записку в корзине. date это день начала в формате dd.mm.yyyy */
export function updateRite(rite: Rite, date: string): Promise<ApiResult<Rite>> {
  return request<Rite>(`/rites/${rite.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json;charset=utf-8" },
    body: JSON.stringify({
      rite: rite.type?.id,
      clientId: getClientId(),
      confirmedEmail: getConfirmedEmail(),
      names: rite.names,
      payment: UPDATE_PAYMENT_CODE,
      date,
      donate: rite.sum,
    }),
  });
}

export interface SubmitRiteParams {
  /** Есть id: PUT /rites/N (редактирование). Нет: POST /rites (новая записка, в том числе копия) */
  id?: number;
  typeId: number;
  names: RiteName[];
  /** День начала в формате dd.mm.yyyy */
  date: string;
  donate: number;
}

/**
 * Форма подачи записки (rites.modal): создаёт или сохраняет записку в корзине.
 * 200: готовая записка. 400: ошибки валидации, 409: конфликт редактирования.
 */
export function submitRite({
  id,
  typeId,
  names,
  date,
  donate,
}: SubmitRiteParams): Promise<ApiResult<Rite>> {
  return request<Rite>(id ? `/rites/${id}` : "/rites", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json;charset=utf-8" },
    body: JSON.stringify({
      rite: typeId,
      clientId: getClientId(),
      confirmedEmail: getConfirmedEmail(),
      names,
      payment: UPDATE_PAYMENT_CODE,
      date,
      donate,
    }),
  });
}

async function loadList<T>(path: string): Promise<T[]> {
  const result = await request<T[]>(path);
  if (!result.ok) {
    throw new Error(collectErrors(result.errors)[0]?.description ?? `HTTP ${result.status}`);
  }
  return result.data ?? [];
}

/** Типы записок для формы подачи */
export const loadRiteTypes = (): Promise<RiteType[]> => loadList<RiteType>("/rites/types");

/** Подсказки для поля «пометка»: младенца, воина, иерея и т.д. Список зависит от вида записки */
export const loadExplanations = (type: "health" | "repose"): Promise<string[]> =>
  loadList<string>(`/rites/explanations?type=${type}`);

/** Имена для подсказки в поле «имя»: около тысячи, поэтому грузим целиком и фильтруем на клиенте */
export const loadSaintsNames = (): Promise<string[]> => loadList<string>("/rites/names");

export function initiatePayment(params: InitiatePaymentParams): Promise<ApiResult<InitiatePaymentResponse>> {
  return request<InitiatePaymentResponse>(
    "/rites/initiatePayment",
    jsonPost({
      clientId: getClientId(),
      email: params.email,
      payment: params.payment,
      paymentToken: params.paymentToken,
      valaam_gid: params.gid ?? "",
      ids: params.ids,
    }),
  );
}

type GidPlatform = "android" | "ios";

/**
 * Платформа события valaam.prayers.*.
 * В нативке её сообщает мост. В браузере и у иконки на главном экране моста нет,
 * поэтому смотрим user agent: иначе пожертвование считается с сайта valaam.ru.
 */
function gidPlatform(): GidPlatform | null {
  const native = getNativePlatform();
  if (native === "android" || native === "ios") return native;
  if (typeof navigator === "undefined") return null;

  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  // iPadOS 13+ в Safari выглядит как Macintosh, но это планшет
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iPad|iPhone|iPod/i.test(ua) || iPadOs) return "ios";
  return null;
}

/** gid нужен для статистики. Не получили за таймаут или это компьютер — платим без него */
export async function requestGid(): Promise<string | null> {
  const platform = gidPlatform();
  if (!platform) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GID_TIMEOUT_MS);
  try {
    const result = await request<{ gid?: string }>(
      `/rites/valaamGid?referer1=valaam.prayers.${platform}`,
      { signal: controller.signal },
    );
    return result.ok ? (result.data?.gid ?? null) : null;
  } catch (ex) {
    console.error("Не удалось получить gid:", ex);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
