import { createApp, defineComponent, nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { readingHistoryStorage } from "@/services/storage";
import { useReadingHistoryStore } from "@/stores/readingHistory";
import { useReadingProgress } from "@/composables/useReadingProgress";
import type { ReaderHistoryConfig } from "@/components/textReader";

let capturedUndo: (() => void) | null = null;
const showUndoToastMock = vi.fn();

vi.mock("@/services/storage", () => ({
  readingHistoryStorage: {
    getAll: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("@/composables/useUndoToast", () => ({
  useUndoToast: (opts: { onUndo: () => void }) => {
    capturedUndo = opts.onUndo;
    return { showUndoToast: showUndoToastMock };
  },
}));

describe("useReadingProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    capturedUndo = null;
    showUndoToastMock.mockReset();
    setActivePinia(createPinia());
    vi.mocked(readingHistoryStorage!.getAll).mockResolvedValue([]);
    vi.mocked(readingHistoryStorage!.put).mockResolvedValue("id");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("читает initialProgress из истории, реагирует на геттеры и возвращает 0 при history=null", async () => {
    const store = useReadingHistoryStore();
    await store.updateProgress("prayer:1", 0.42, 10, "prayers");
    await store.updateProgress("prayer:2", 0.88, 10, "prayers");

    const itemId = ref("prayer:1");
    const history = ref<ReaderHistoryConfig | null>({ type: "prayers" });
    const title = ref("Молитвы");
    const progress = ref(0);
    const totalPages = ref(10);

    const state = useReadingProgress({
      itemId: () => itemId.value,
      itemUrl: "/prayers/1",
      title,
      history: () => history.value,
      progress,
      totalPages,
      onResetToStart: vi.fn(),
      onRestoreProgress: vi.fn(),
    });

    expect(state.initialProgress.value).toBe(0.42);
    itemId.value = "prayer:2";
    expect(state.initialProgress.value).toBe(0.88);
    history.value = null;
    expect(state.initialProgress.value).toBe(0);
  });

  it("сохраняет прогресс с дебаунсом и метаданными, а flushProgress сбрасывает таймер", async () => {
    const store = useReadingHistoryStore();
    const updateSpy = vi.spyOn(store, "updateProgress");

    const title = ref("Житие");
    const progress = ref(0);
    const totalPages = ref(20);

    const { flushProgress } = useReadingProgress({
      itemId: "saint:5",
      itemUrl: "/saint/5/",
      title,
      history: { type: "saints", withMeta: true },
      progress,
      totalPages,
      onResetToStart: vi.fn(),
      onRestoreProgress: vi.fn(),
    });

    progress.value = 0.2;
    await nextTick();
    vi.advanceTimersByTime(150);
    progress.value = 0.5;
    await nextTick();
    expect(updateSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith("saint:5", 0.5, 20, "saints", {
      title: "Житие",
      url: "/saint/5/",
    });

    progress.value = 0.75;
    await nextTick();
    flushProgress();
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy).toHaveBeenLastCalledWith("saint:5", 0.75, 20, "saints", {
      title: "Житие",
      url: "/saint/5/",
    });

    // Повторный вызов и истечение таймера не дублируют запись
    flushProgress();
    vi.advanceTimersByTime(500);
    expect(updateSpy).toHaveBeenCalledTimes(2);
  });

  it("не сохраняет прогресс, если history=null или totalPages=0", async () => {
    const store = useReadingHistoryStore();
    const updateSpy = vi.spyOn(store, "updateProgress");

    const progress = ref(0);
    const totalPages = ref(0);

    useReadingProgress({
      itemId: "prayer:2",
      itemUrl: "",
      title: ref("Текст"),
      history: { type: "prayers" },
      progress,
      totalPages,
      onResetToStart: vi.fn(),
      onRestoreProgress: vi.fn(),
    });

    progress.value = 0.3;
    await nextTick();
    vi.advanceTimersByTime(500);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("resetProgress сбрасывает на начало, а undo восстанавливает прогресс ровно одной записью", async () => {
    const store = useReadingHistoryStore();
    const updateSpy = vi.spyOn(store, "updateProgress");

    const progress = ref(0.65);
    const totalPages = ref(12);
    const onResetToStart = vi.fn(() => {
      progress.value = 0;
    });
    const onRestoreProgress = vi.fn((restored: number) => {
      progress.value = restored;
    });

    const { resetProgress } = useReadingProgress({
      itemId: "prayer:3",
      itemUrl: "/prayers/3",
      title: ref("Канон"),
      history: { type: "prayers" },
      progress,
      totalPages,
      onResetToStart,
      onRestoreProgress,
    });

    resetProgress();
    await nextTick();
    expect(onResetToStart).toHaveBeenCalledTimes(1);
    expect(showUndoToastMock).toHaveBeenCalledTimes(1);

    // Отмена до срабатывания дебаунса отменяет запись 0 и не дублирует запись 0.65 через watch(progress)
    capturedUndo?.();
    await nextTick();
    vi.advanceTimersByTime(500);

    expect(onRestoreProgress).toHaveBeenCalledWith(0.65);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith("prayer:3", 0.65, 12, "prayers", undefined);
  });

  it("сохраняет отложенный прогресс при размонтировании (onUnmounted)", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useReadingHistoryStore();
    const updateSpy = vi.spyOn(store, "updateProgress");

    const progress = ref(0);
    const totalPages = ref(15);

    const host = document.createElement("div");
    const app = createApp(
      defineComponent({
        setup() {
          useReadingProgress({
            itemId: "prayer:unmount",
            itemUrl: "",
            title: ref("Молитва"),
            history: { type: "prayers" },
            progress,
            totalPages,
            onResetToStart: vi.fn(),
            onRestoreProgress: vi.fn(),
          });
          return () => null;
        },
      })
    );
    app.use(pinia);
    app.mount(host);

    progress.value = 0.9;
    await nextTick();
    expect(updateSpy).not.toHaveBeenCalled();

    app.unmount();
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith("prayer:unmount", 0.9, 15, "prayers", undefined);
  });

  it("не вызывает resetProgress при пустом itemId или history=null", () => {
    const onResetToStart = vi.fn();
    const { resetProgress } = useReadingProgress({
      itemId: "prayer:4",
      itemUrl: "",
      title: ref(""),
      history: null,
      progress: ref(0.4),
      totalPages: ref(5),
      onResetToStart,
      onRestoreProgress: vi.fn(),
    });

    resetProgress();
    expect(onResetToStart).not.toHaveBeenCalled();
    expect(showUndoToastMock).not.toHaveBeenCalled();
  });
});
