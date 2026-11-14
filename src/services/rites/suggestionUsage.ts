/** Сколько раз в форме записки вводили имя или пометку. Ключ — текст без учёта регистра */

const STORAGE_KEY = "rite-suggestion-usage";

export interface SuggestionUsage {
  names: Record<string, number>;
  explanations: Record<string, number>;
}

export type SuggestionKind = keyof SuggestionUsage;

const emptyUsage = (): SuggestionUsage => ({ names: {}, explanations: {} });

export function usageKey(value: string): string {
  return value.trim().toUpperCase();
}

function isCountMap(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).every(
    (count) => typeof count === "number" && Number.isFinite(count) && count >= 0,
  );
}

export function readSuggestionUsage(): SuggestionUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyUsage();
    const data = JSON.parse(raw) as Partial<SuggestionUsage>;
    return {
      names: isCountMap(data.names) ? data.names : {},
      explanations: isCountMap(data.explanations) ? data.explanations : {},
    };
  } catch {
    return emptyUsage();
  }
}

/** Плюс один к введённому значению. Пустую строку не запоминаем */
export function rememberSuggestion(kind: SuggestionKind, value: string): SuggestionUsage {
  const key = usageKey(value);
  const usage = readSuggestionUsage();
  if (!key) return usage;
  const next: SuggestionUsage = {
    ...usage,
    [kind]: { ...usage[kind], [key]: (usage[kind][key] ?? 0) + 1 },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
