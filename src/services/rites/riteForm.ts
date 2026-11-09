import type { ApiError, RiteName, RiteType } from "@/services/rites/ritesApi";

/** Логика формы подачи записки (rites.modal на сайте), без интерфейса */

/** Строк с именами в записке: как maxNames на сервере */
export const MAX_NAMES = 10;

/** Как на сервере (Rites::validate): только буквы, без пробелов и знаков препинания */
const NAME_PATTERN = /^[a-zа-яё]+$/i;

/** Ошибка поля: короткий текст под полем и полный текст для окна по нажатию на «!» */
export interface FieldError {
  short: string;
  full: string;
}

export const NAME_ERROR: FieldError = {
  short: "Только буквы, без пробелов",
  full:
    "Укажите имя в родительном падеже: Елены, Василия, без пробелов и знаков препинания. " +
    "Для уточнения введите пометку в поле справа: младенца, воина, иерея и т.д. " +
    "Поминаются только крещёные православные. Самоубийц писать нельзя.",
};

export const EXPLANATION_ERROR: FieldError = {
  short: "Выберите из списка",
  full: "Неверная пометка. Выберите значение из списка.",
};

export const DONATE_ERROR: FieldError = {
  short: "Сумма должна быть больше 0",
  full: "Сумма должна быть больше 0.",
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

/** Рекомендуемая сумма: цена типа за каждое верное имя */
export function calculateDonate(names: string[], type: RiteType | null): number {
  return type ? names.filter(isNameValid).length * type.price : 0;
}

export interface NameRow {
  name: string;
  explanation: string;
}

/** Имена для запроса. Строки идут как в форме, чтобы индекс в ошибках сервера (name-N) совпадал со строкой */
export function buildNames(rows: NameRow[], explanations: string[]): RiteName[] {
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
      // Длинный текст суммы не помещается под узким полем и идёт в общую плашку
      if (error.field === "donate" && error.description && error.description !== short) {
        result.general.push(error.description);
      }
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
