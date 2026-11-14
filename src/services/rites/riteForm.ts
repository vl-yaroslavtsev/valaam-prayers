import type { ApiError, RiteName, RiteType } from "@/services/rites/ritesApi";

/** Логика формы подачи записки (rites.modal на сайте), без интерфейса */

/** Строк с именами в записке: как maxNames на сервере */
export const MAX_NAMES = 10;

/** Как на сервере (Rites::validate): только буквы, без пробелов и знаков препинания */
const NAME_PATTERN = /^[a-zа-яё]+$/i;

/** Ошибка поля: короткий текст на бланке и полный текст в шторке */
export interface FieldError {
  short: string;
  full: string;
}

export const NAME_ERROR: FieldError = {
  short: "Только буквы, без пробелов",
  full:
    "Укажите имя в родительном падеже: Елены, Василия, без пробелов и знаков препинания.",
};

/** Серая подсказка под полем имени, пока ошибки нет */
export const NAME_HINT =
  "В родительном падеже: Елены, Василия, без пробелов и знаков препинания. " +
  "Поминаются только крещёные православные. Самоубийц писать нельзя.";

/** Пометка заполнена, а имени нет */
export const NAME_MISSING_ERROR: FieldError = {
  short: "Укажите имя",
  full: NAME_ERROR.full,
};

export const EXPLANATION_ERROR: FieldError = {
  short: "Выберите пометку из списка",
  full: "Неверная пометка. Выберите значение из списка или оставьте пустым.",
};

/** Серая подсказка под полем пометки, пока ошибки нет */
export const EXPLANATION_HINT = "Например: воина, младенца, иерея";

export const DONATE_ERROR: FieldError = {
  short: "Сумма должна быть больше 0",
  full: "Сумма должна быть больше 0.",
};

export const DONATE_BELOW_MIN: FieldError = {
  short: "Сумма меньше минимальной",
  full: "Сумма меньше минимальной",
};

export const MESSAGE_NO_NAMES = "Пустая записка не может быть подана";
export const MESSAGE_BAD_DATE = "Не корректный период поминовения";
export const MESSAGE_UNAVAILABLE = "Система временно недоступна";

/** Пустое имя не ошибка: строки без имени просто не попадают в записку */
export function validateName(name: string): FieldError | null {
  const value = name.trim();
  return value && !NAME_PATTERN.test(value) ? NAME_ERROR : null;
}

export const isNameValid = (name: string): boolean => {
  const value = name.trim();
  return Boolean(value) && NAME_PATTERN.test(value);
};

/** Пометка из списка (без учёта регистра) в написании списка; null, если такой нет */
export function findExplanation(value: string, list: string[]): string | null {
  const upper = value.trim().toUpperCase();
  return list.find((item) => item.toUpperCase() === upper) ?? null;
}

export function validateExplanation(value: string, list: string[]): FieldError | null {
  return value.trim() && findExplanation(value, list) === null ? EXPLANATION_ERROR : null;
}

/** Сумма из текста поля: как на сайте, берутся только цифры */
export const parseDonate = (text: string): number => parseInt(text.replace(/\D/g, ""), 10) || 0;

export const validateDonate = (donate: number): FieldError | null =>
  donate > 0 ? null : DONATE_ERROR;

/**
 * Сумма в шторке: пустая и нулевая не принимаются,
 * положительная меньше минимальной — отдельная ошибка.
 */
export function validateDonateAmount(amount: number, minAmount: number): FieldError | null {
  if (amount <= 0) return DONATE_ERROR;
  if (amount < minAmount) return DONATE_BELOW_MIN;
  return null;
}

/** Рекомендуемая сумма: цена типа за каждое верное имя */
export function calculateDonate(names: string[], type: RiteType | null): number {
  return type ? names.filter(isNameValid).length * type.price : 0;
}

/** Минимальная сумма: minPrice типа за каждую учитываемую строку */
export function calculateMinDonate(count: number, type: RiteType | null): number {
  return type ? count * type.minPrice : 0;
}

export interface NoteRowItem {
  name: string;
  explanation: string;
}

export interface NoteRowError {
  name: FieldError | null;
  explanation: FieldError | null;
}

/** Полевая ошибка сервера: имя, пометка или сумма */
export interface ServerValidationError extends FieldError {
  field: string;
}

/** Пустая строка без ошибки. Пометка без имени — ошибка имени */
export function validateRow(row: NoteRowItem, explanations: string[]): NoteRowError {
  const name = row.name.trim();
  const explanation = row.explanation.trim();
  return {
    name: name ? validateName(name) : explanation ? NAME_MISSING_ERROR : null,
    explanation: validateExplanation(explanation, explanations),
  };
}

/** Строка входит в сумму: верное имя и пустая или выбранная из списка пометка */
export function isRowCountable(row: NoteRowItem, explanations: string[]): boolean {
  return isNameValid(row.name) && validateExplanation(row.explanation, explanations) === null;
}

export function recommendedDonate(
  rows: NoteRowItem[],
  explanations: string[],
  type: RiteType | null,
): number {
  return calculateDonate(
    rows.filter((row) => isRowCountable(row, explanations)).map((row) => row.name),
    type,
  );
}

export function minimumDonate(rows: NoteRowItem[], explanations: string[], type: RiteType | null): number {
  return calculateMinDonate(rows.filter((row) => isRowCountable(row, explanations)).length, type);
}

/** Как в корзине: пометка, затем имя */
export function formatNoteRow(row: NoteRowItem): string {
  return `${row.explanation.trim()} ${row.name.trim()}`.trim();
}

/** Имена для запроса. Строки идут как в форме, чтобы индекс в ошибках сервера (name-N) совпадал со строкой */
export function buildNames(rows: NoteRowItem[], explanations: string[]): RiteName[] {
  return rows.map(({ name, explanation }) => ({
    name: name.trim(),
    explanation: findExplanation(explanation, explanations) ?? explanation.trim(),
  }));
}

/** Подсказки по началу имени, без учёта регистра */
export function filterByPrefix(list: string[], query: string, limit: number): string[] {
  const prefix = query.trim().toUpperCase();
  if (!prefix) return [];
  const result: string[] = [];
  for (const item of list) {
    if (item.toUpperCase().startsWith(prefix)) {
      result.push(item);
      if (result.length >= limit) break;
    }
  }
  return result;
}

/** Совпавшее начало слова и хвост: для жирного префикса в подсказке */
export function splitPrefix(value: string, query: string): { match: string; rest: string } {
  const prefix = query.trim();
  if (!prefix || !value.toUpperCase().startsWith(prefix.toUpperCase())) {
    return { match: "", rest: value };
  }
  return { match: value.slice(0, prefix.length), rest: value.slice(prefix.length) };
}

const SERVER_SHORT_MESSAGES: Record<string, string> = {
  badName: "Неверное имя",
  badExplanation: "Неверная пометка",
  badDonate: "Неверная сумма",
  donateLower: "Сумма меньше минимальной",
};

export interface ServerErrors {
  /** Ошибки полей name-N, explanation-N и donate */
  fields: Record<string, FieldError>;
  /** Остальные: дата, тип записки, общие ошибки */
  general: string[];
}

const FORM_FIELD = /^(name-\d+|explanation-\d+|donate)$/;

export function mapServerErrors(errors: ApiError[]): ServerErrors {
  const result: ServerErrors = { fields: {}, general: [] };
  for (const error of errors) {
    const short = error.code ? SERVER_SHORT_MESSAGES[error.code] : undefined;
    if (error.field && FORM_FIELD.test(error.field) && short && !result.fields[error.field]) {
      result.fields[error.field] = { short, full: error.description };
    } else if (error.description && !result.general.includes(error.description)) {
      result.general.push(error.description);
    }
  }
  return result;
}

/** Типы одного вида записки: «О здравии» или «О упокоении» */
export const typesOfKind = (types: RiteType[], kind: RiteType["type"]): RiteType[] =>
  types.filter((type) => type.type === kind && !type.disabled);

/**
 * Тип нового вида записки: тот же подтип (Проскомидия, Псалтирь...), если он есть,
 * иначе первый. Как на сайте при смене вида записки.
 */
export function pickTypeForKind(
  types: RiteType[],
  kind: RiteType["type"],
  current: RiteType | null,
): RiteType | null {
  const list = typesOfKind(types, kind);
  return list.find((type) => type.shortName === current?.shortName) ?? list[0] ?? null;
}

export interface PriceListItem {
  name: string;
  price: number;
}

/** Рекомендуемые суммы подтипов вида записки: «Проскомидия (40 дней) - 500 руб.» */
export function buildPriceList(types: RiteType[], kind: RiteType["type"]): PriceListItem[] {
  return typesOfKind(types, kind).map((type) => ({ name: type.shortName, price: type.price }));
}

/**
 * Ссылке mailto нужен класс external: иначе Framework7 откроет её как страницу приложения,
 * а не отдаст почтовому клиенту.
 */
export function externalMailLinks(html: string): string {
  return html.replace(/<a\b([^>]*\bhref\s*=\s*(['"])mailto:[^'"]*\2[^>]*)>/gi, (_tag, attrs: string) => {
    if (/\bexternal\b/.test(attrs)) return `<a${attrs}>`;
    if (/\bclass\s*=\s*(['"])/.test(attrs)) {
      return `<a${attrs.replace(/\bclass\s*=\s*(['"])/, "class=$1external ")}>`;
    }
    return `<a class="external"${attrs}>`;
  });
}

/**
 * Описание типа приходит HTML-ом сайта: ссылки относительные, в них иконки Font Awesome,
 * которых в приложении нет. Ссылки делаем абсолютными, иконки убираем.
 */
export function prepareDescription(html: string, siteOrigin: string): string {
  return externalMailLinks(
    html.replace(/<i\b[^>]*>\s*<\/i>/gi, "").replace(/(\shref=")\/(?!\/)/gi, `$1${siteOrigin}/`),
  );
}
