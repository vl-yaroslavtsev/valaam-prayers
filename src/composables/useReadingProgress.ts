import { computed, watch, onUnmounted, toValue, type MaybeRefOrGetter, type Ref } from "vue";
import { useReadingHistoryStore } from "@/stores/readingHistory";
import { useUndoToast } from "@/composables/useUndoToast";
import type { ReaderHistoryConfig } from "@/components/textReader";

export interface UseReadingProgressOptions {
  itemId: MaybeRefOrGetter<string>;
  itemUrl: MaybeRefOrGetter<string>;
  title: MaybeRefOrGetter<string>;
  history: MaybeRefOrGetter<ReaderHistoryConfig | null>;
  progress: Readonly<Ref<number>>;
  totalPages: Readonly<Ref<number>>;
  onResetToStart: () => void;
  onRestoreProgress: (progress: number) => void;
  debounceMs?: number;
}

/**
 * Композабл сохранения, сброса и восстановления прогресса чтения (с дебаунсом и undo-тостом).
 */
export function useReadingProgress({
  itemId,
  itemUrl,
  title,
  history,
  progress,
  totalPages,
  onResetToStart,
  onRestoreProgress,
  debounceMs = 300,
}: UseReadingProgressOptions) {
  const historyStore = useReadingHistoryStore();

  const initialProgress = computed(() => {
    const historyConfig = toValue(history);
    return historyConfig ? historyStore.getItem(toValue(itemId))?.progress || 0 : 0;
  });

  const saveProgress = (value: number = progress.value, requirePages: boolean = true) => {
    const historyConfig = toValue(history);
    if (!historyConfig) return;
    if (requirePages && !totalPages.value) return;

    const meta = historyConfig.withMeta
      ? { title: toValue(title), url: toValue(itemUrl) }
      : undefined;

    void historyStore.updateProgress(
      toValue(itemId),
      value,
      totalPages.value,
      historyConfig.type,
      meta
    );
  };

  let saveProgressTimer: ReturnType<typeof setTimeout> | null = null;

  const clearPendingSave = () => {
    if (saveProgressTimer) {
      clearTimeout(saveProgressTimer);
      saveProgressTimer = null;
    }
  };

  const flushProgress = () => {
    if (!saveProgressTimer) return;
    clearPendingSave();
    saveProgress();
  };

  // После undo прогресс уже записан напрямую — не дублируем запись в IndexedDB
  let restoredProgressToSkip: number | null = null;

  watch(progress, (nextProgress) => {
    if (restoredProgressToSkip !== null) {
      const shouldSkip = nextProgress === restoredProgressToSkip;
      restoredProgressToSkip = null;
      if (shouldSkip) return;
    }
    if (!toValue(history) || !totalPages.value) return;
    clearPendingSave();
    // IndexedDB на каждый шаг слайдера/свайпа даёт заметный лаг при большом числе страниц
    saveProgressTimer = setTimeout(() => {
      saveProgressTimer = null;
      saveProgress();
    }, debounceMs);
  });

  let progressBeforeReset = 0;

  const { showUndoToast: showUndoResetToast } = useUndoToast({
    text: "Чтение начнется сначала",
    onUndo: () => {
      clearPendingSave();
      restoredProgressToSkip = progressBeforeReset;
      onRestoreProgress(progressBeforeReset);
      saveProgress(progressBeforeReset, false);
    },
  });

  const resetProgress = () => {
    if (!toValue(itemId) || !toValue(history)) {
      return;
    }

    progressBeforeReset = progress.value;
    onResetToStart();
    showUndoResetToast();
  };

  onUnmounted(flushProgress);

  return {
    initialProgress,
    flushProgress,
    resetProgress,
  };
}
