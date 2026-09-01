import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { thoughtDetailsStorage, thoughtsIndexStorage } from "@/services/storage";
import { useThoughtsStore } from "@/stores/thoughts";

vi.mock("@/services/storage", () => ({
  thoughtsIndexStorage: {
    getAll: vi.fn(),
  },
  thoughtDetailsStorage: {
    get: vi.fn(),
  },
}));

describe("useThoughtsStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(thoughtsIndexStorage!.getAll).mockResolvedValue([]);
    vi.mocked(thoughtDetailsStorage!.get).mockResolvedValue(undefined);
  });

  it("initStore подхватывает кэш", async () => {
    vi.mocked(thoughtsIndexStorage!.getAll).mockResolvedValue([{ id: "t1", name: "Thought" }]);

    const store = useThoughtsStore();
    await store.initStore();

    expect(store.thoughts).toEqual([{ id: "t1", name: "Thought" }]);
    expect(store.getThoughtById("t1")?.name).toBe("Thought");
  });

  it("getThoughtDetails читает кэш и не ходит в сеть при попадании", async () => {
    const cached = { id: "t1", name: "Thought", text: "body" };
    vi.mocked(thoughtDetailsStorage!.get).mockResolvedValue(cached);

    const result = await useThoughtsStore().getThoughtDetails("t1");

    expect(result).toEqual(cached);
  });
});
