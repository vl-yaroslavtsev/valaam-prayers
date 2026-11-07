import {
  loadExplanations,
  loadRiteTypes,
  loadSaintsNames,
  type RiteType,
} from "@/services/rites/ritesApi";

/**
 * Справочники формы подачи записки: типы, имена, пометки. Меняются редко,
 * поэтому загружаются один раз за сессию. Неудачный запрос в кэше не остаётся.
 */
const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let promise = cache.get(key) as Promise<T> | undefined;
  if (!promise) {
    promise = load().catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, promise);
  }
  return promise;
}

export const getRiteTypes = (): Promise<RiteType[]> => cached("types", loadRiteTypes);

export const getSaintsNames = (): Promise<string[]> => cached("names", loadSaintsNames);

export const getExplanations = (type: "health" | "repose"): Promise<string[]> =>
  cached(`explanations:${type}`, () => loadExplanations(type));
