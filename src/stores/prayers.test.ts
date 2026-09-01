import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { prayersApi } from "@/services/api";
import {
  metadataStorage,
  prayerDetailsStorage,
  prayersIndexStorage,
  sectionsStorage,
} from "@/services/storage";
import { usePrayersStore } from "@/stores/prayers";
import { prayerElement, prayerSection, prayerText } from "@/test/helpers";

vi.mock("@/services/storage", () => ({
  prayersIndexStorage: {
    getAll: vi.fn(),
    clear: vi.fn(),
    putAll: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  sectionsStorage: {
    getAll: vi.fn(),
    clear: vi.fn(),
    putAll: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  prayerDetailsStorage: {
    get: vi.fn(),
    put: vi.fn(),
  },
  metadataStorage: {
    getLastSyncTime: vi.fn(),
    setLastSyncTime: vi.fn(),
  },
}));

vi.mock("@/services/api", () => ({
  prayersApi: {
    getPrayers: vi.fn(),
    getPrayerText: vi.fn(),
  },
}));

describe("usePrayersStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(prayersIndexStorage!.getAll).mockResolvedValue([]);
    vi.mocked(sectionsStorage!.getAll).mockResolvedValue([]);
    vi.mocked(prayersIndexStorage!.clear).mockResolvedValue(undefined);
    vi.mocked(sectionsStorage!.clear).mockResolvedValue(undefined);
    vi.mocked(prayersIndexStorage!.putAll).mockResolvedValue([]);
    vi.mocked(sectionsStorage!.putAll).mockResolvedValue([]);
    vi.mocked(prayersIndexStorage!.put).mockResolvedValue(0);
    vi.mocked(sectionsStorage!.put).mockResolvedValue(0);
    vi.mocked(prayersIndexStorage!.delete).mockResolvedValue(undefined);
    vi.mocked(sectionsStorage!.delete).mockResolvedValue(undefined);
    vi.mocked(prayerDetailsStorage!.get).mockResolvedValue(undefined);
    vi.mocked(metadataStorage!.getLastSyncTime).mockResolvedValue(null);
    vi.mocked(metadataStorage!.setLastSyncTime).mockResolvedValue(undefined);
    vi.mocked(prayersApi.getPrayers).mockResolvedValue({
      elements: [],
      sections: [],
      all_element_ids: [],
      all_section_ids: [],
    });
  });

  it("getPrayerText при наличии кэша не вызывает сеть", async () => {
    vi.mocked(prayerDetailsStorage!.get).mockResolvedValue({
      id: 10,
      name: "Cached",
      parent: null,
      text: "",
      text_cs: "",
      text_cs_cf: "",
      text_ru: "cached",
      modified_ts: 1,
    });

    const result = await usePrayersStore().getPrayerText(10);

    expect(result.text_ru).toBe("cached");
    expect(prayersApi.getPrayerText).not.toHaveBeenCalled();
  });

  it("getPrayerText при отсутствии кэша идёт в сеть и не пишет в IndexedDB", async () => {
    vi.mocked(prayersApi.getPrayerText).mockResolvedValue(prayerText(10));

    const result = await usePrayersStore().getPrayerText(10);

    expect(result.id).toBe(10);
    expect(prayersApi.getPrayerText).toHaveBeenCalledWith(10);
    expect(prayerDetailsStorage!.put).not.toHaveBeenCalled();
  });

  it("savePrayersToCache при отсутствии lastSyncTime делает full sync (clear+putAll)", async () => {
    const elements = [prayerElement(1)];
    const sections = [prayerSection(842)];
    vi.mocked(metadataStorage!.getLastSyncTime).mockResolvedValue(null);
    vi.mocked(prayersApi.getPrayers).mockResolvedValue({
      elements,
      sections,
      all_element_ids: [1],
      all_section_ids: [842],
    });

    await usePrayersStore().initStore();
    await vi.waitFor(() => expect(metadataStorage!.setLastSyncTime).toHaveBeenCalledWith("prayers"));

    expect(prayersIndexStorage!.clear).toHaveBeenCalled();
    expect(sectionsStorage!.clear).toHaveBeenCalled();
    expect(prayersIndexStorage!.putAll).toHaveBeenCalledWith(elements);
    expect(sectionsStorage!.putAll).toHaveBeenCalledWith(sections);
  });

  it("savePrayersToCache при наличии lastSyncTime делает incremental put и точечный delete", async () => {
    const cached = [prayerElement(1), prayerElement(2)];
    vi.mocked(prayersIndexStorage!.getAll).mockResolvedValue(cached);
    vi.mocked(sectionsStorage!.getAll).mockResolvedValue([]);
    vi.mocked(metadataStorage!.getLastSyncTime).mockResolvedValue(new Date("2026-01-01"));
    vi.mocked(prayersApi.getPrayers).mockResolvedValue({
      elements: [prayerElement(1)],
      sections: [],
      all_element_ids: [1],
      all_section_ids: [],
    });

    await usePrayersStore().initStore();
    await vi.waitFor(() => expect(prayersIndexStorage!.delete).toHaveBeenCalledWith(2));

    expect(prayersIndexStorage!.clear).not.toHaveBeenCalled();
    expect(prayersIndexStorage!.put).toHaveBeenCalled();
    expect(prayersIndexStorage!.putAll).not.toHaveBeenCalled();
  });
});
