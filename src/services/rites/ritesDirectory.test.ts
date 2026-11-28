import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadExplanations,
  loadRiteTypes,
  loadSaintsNames,
  loadTypeRestrictions,
  type RiteType,
  type TypeRestriction,
} from "@/services/rites/ritesApi";
import {
  getCachedRiteFormData,
  getExplanations,
  getRiteTypes,
  getTypeRestrictions,
  resetRiteDirectoryCacheForTests,
} from "@/services/rites/ritesDirectory";

vi.mock("@/services/rites/ritesApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/rites/ritesApi")>()),
  loadRiteTypes: vi.fn(),
  loadTypeRestrictions: vi.fn(),
  loadExplanations: vi.fn(),
  loadSaintsNames: vi.fn(),
}));

const TYPE = { id: 1, name: "Молебен" } as unknown as RiteType;
const RESTRICTION: TypeRestriction = { type: "disallow", from: 100, to: 200, rites: [1] };

describe("ritesDirectory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRiteDirectoryCacheForTests();
    vi.mocked(loadRiteTypes).mockResolvedValue([TYPE]);
    vi.mocked(loadTypeRestrictions).mockResolvedValue([RESTRICTION]);
    vi.mocked(loadExplanations).mockResolvedValue(["младенца"]);
    vi.mocked(loadSaintsNames).mockResolvedValue(["Иоанна"]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("не кэширует неудачный запрос: повторный вызов идёт на сервер", async () => {
    vi.mocked(loadRiteTypes).mockRejectedValueOnce(new Error("offline"));

    await expect(getRiteTypes()).rejects.toThrow("offline");
    await expect(getRiteTypes()).resolves.toEqual([TYPE]);
    expect(loadRiteTypes).toHaveBeenCalledTimes(2);
  });

  it("кэширует ограничения в пределах TTL и обновляет после истечения", async () => {
    await getTypeRestrictions();
    await getTypeRestrictions();
    expect(loadTypeRestrictions).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 1);
    await getTypeRestrictions();
    expect(loadTypeRestrictions).toHaveBeenCalledTimes(2);
  });

  it("getCachedRiteFormData возвращает снимок и запускает фоновое обновление ограничений по TTL", async () => {
    expect(getCachedRiteFormData()).toBeNull();

    await Promise.all([
      getRiteTypes(),
      getTypeRestrictions(),
      getExplanations("health"),
      getExplanations("repose"),
    ]);

    const fresh = getCachedRiteFormData();
    expect(fresh?.types).toEqual([TYPE]);
    expect(fresh?.restrictions).toEqual([RESTRICTION]);
    expect(loadTypeRestrictions).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 1);
    expect(getCachedRiteFormData()?.restrictions).toEqual([RESTRICTION]);
    expect(loadTypeRestrictions).toHaveBeenCalledTimes(2);
  });
});
