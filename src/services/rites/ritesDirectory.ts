import {
  loadExplanations,
  loadRiteTypes,
  loadSaintsNames,
  loadTypeRestrictions,
  type RiteType,
  type TypeRestriction,
} from "@/services/rites/ritesApi";

/** Ограничения дат на сервере меняются редко: не запрашиваем чаще */
const RESTRICTIONS_TTL_MS = 10 * 60 * 1000;

export interface RiteFormDirectoryData {
  types: RiteType[];
  restrictions: TypeRestriction[];
  health: string[];
  repose: string[];
  names: string[];
}

/**
 * Справочники формы подачи записки: типы, имена, пометки, ограничения дат.
 * Загружаются один раз за сессию (ограничения — с TTL). Неудачный запрос в кэше не остаётся.
 */
const cache = new Map<string, Promise<unknown>>();
const resolved = new Map<string, unknown>();
let restrictionsLoadedAt = 0;

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let promise = cache.get(key) as Promise<T> | undefined;
  if (!promise) {
    promise = load()
      .then((value) => {
        resolved.set(key, value);
        return value;
      })
      .catch((error) => {
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

export function getTypeRestrictions(): Promise<TypeRestriction[]> {
  const stale =
    restrictionsLoadedAt > 0 && Date.now() - restrictionsLoadedAt > RESTRICTIONS_TTL_MS;
  if (stale) {
    cache.delete("restrictions");
  }
  return cached("restrictions", async () => {
    const list = await loadTypeRestrictions();
    restrictionsLoadedAt = Date.now();
    return list;
  });
}

/** Прогревает справочники в фоне, чтобы форма записки открывалась без спиннера и мигания */
export function preloadRiteFormDirectory(): void {
  void getRiteTypes().catch(() => {});
  void getTypeRestrictions().catch(() => {});
  void getExplanations("health").catch(() => {});
  void getExplanations("repose").catch(() => {});
  void getSaintsNames().catch(() => {});
}

/**
 * Синхронный снимок уже загруженных справочников (или null, если ещё не готовы).
 * Если TTL ограничений истёк, возвращает последние данные сразу и обновляет их в фоне.
 */
export function getCachedRiteFormData(): RiteFormDirectoryData | null {
  const types = resolved.get("types") as RiteType[] | undefined;
  const restrictions = resolved.get("restrictions") as TypeRestriction[] | undefined;
  const health = resolved.get("explanations:health") as string[] | undefined;
  const repose = resolved.get("explanations:repose") as string[] | undefined;
  if (!types || !restrictions || !health || !repose) return null;

  if (restrictionsLoadedAt > 0 && Date.now() - restrictionsLoadedAt > RESTRICTIONS_TTL_MS) {
    void getTypeRestrictions().catch(() => {});
  }

  return {
    types,
    restrictions,
    health,
    repose,
    names: (resolved.get("names") as string[] | undefined) ?? [],
  };
}

/** Сброс кэша справочников для тестов */
export function resetRiteDirectoryCacheForTests(): void {
  cache.clear();
  resolved.clear();
  restrictionsLoadedAt = 0;
}
