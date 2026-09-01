import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { saintsApi } from "@/services/api/SaintsApi";
import { metadataStorage, saintDetailsStorage, saintsIndexStorage } from "@/services/storage";
import { useSaintsStore } from "@/stores/saints";
import { saintDetail } from "@/test/helpers";

vi.mock("@/services/storage", () => ({
  saintsIndexStorage: {
    getAll: vi.fn(),
    clear: vi.fn(),
    putAll: vi.fn(),
    put: vi.fn(),
  },
  saintDetailsStorage: {
    get: vi.fn(),
    put: vi.fn(),
  },
  metadataStorage: {
    getLastSyncTime: vi.fn(),
    setLastSyncTime: vi.fn(),
  },
}));

vi.mock("@/services/api/SaintsApi", () => ({
  saintsApi: {
    getSaintsIndex: vi.fn(),
    getSaintDetail: vi.fn(),
  },
}));

describe("useSaintsStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(saintsIndexStorage!.getAll).mockResolvedValue([]);
    vi.mocked(saintsIndexStorage!.clear).mockResolvedValue(undefined);
    vi.mocked(saintsIndexStorage!.putAll).mockResolvedValue([]);
    vi.mocked(saintsIndexStorage!.put).mockResolvedValue(0);
    vi.mocked(saintDetailsStorage!.get).mockResolvedValue(undefined);
    vi.mocked(metadataStorage!.getLastSyncTime).mockResolvedValue(null);
    vi.mocked(metadataStorage!.setLastSyncTime).mockResolvedValue(undefined);
    vi.mocked(saintsApi.getSaintsIndex).mockResolvedValue([]);
  });

  it("getSaintDetails при наличии кэша не вызывает сеть", async () => {
    vi.mocked(saintDetailsStorage!.get).mockResolvedValue(
      saintDetail(5, "Cached"),
    );

    const result = await useSaintsStore().getSaintDetails(5);

    expect(result?.name).toBe("Cached");
    expect(saintsApi.getSaintDetail).not.toHaveBeenCalled();
  });

  it("getSaintDetails при отсутствии кэша идёт в сеть и не пишет в IndexedDB", async () => {
    vi.mocked(saintsApi.getSaintDetail).mockResolvedValue(saintDetail(5, "Network"));

    const result = await useSaintsStore().getSaintDetails(5);

    expect(result?.name).toBe("Network");
    expect(saintsApi.getSaintDetail).toHaveBeenCalledWith(5);
    expect(saintDetailsStorage!.put).not.toHaveBeenCalled();
  });

  it("saveSaintIndexToCache при отсутствии lastSyncTime делает full sync (clear+putAll)", async () => {
    vi.mocked(metadataStorage!.getLastSyncTime).mockResolvedValue(null);
    vi.mocked(saintsApi.getSaintsIndex).mockResolvedValue([{ id: 1, name: "A" }]);

    await useSaintsStore().initStore();
    await vi.waitFor(() => expect(metadataStorage!.setLastSyncTime).toHaveBeenCalledWith("saints"));

    expect(saintsIndexStorage!.clear).toHaveBeenCalled();
    expect(saintsIndexStorage!.putAll).toHaveBeenCalledWith([{ id: 1, name: "A" }]);
    expect(saintsIndexStorage!.put).not.toHaveBeenCalled();
  });

  it("saveSaintIndexToCache при наличии lastSyncTime делает incremental put", async () => {
    vi.mocked(metadataStorage!.getLastSyncTime).mockResolvedValue(new Date("2026-01-01"));
    vi.mocked(saintsApi.getSaintsIndex).mockResolvedValue([{ id: 2, name: "B" }]);

    await useSaintsStore().initStore();
    await vi.waitFor(() => expect(saintsIndexStorage!.put).toHaveBeenCalledWith({ id: 2, name: "B" }));

    expect(saintsIndexStorage!.clear).not.toHaveBeenCalled();
    expect(saintsIndexStorage!.putAll).not.toHaveBeenCalled();
  });
});
