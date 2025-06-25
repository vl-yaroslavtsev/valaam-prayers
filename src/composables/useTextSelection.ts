// src/composables/useTextSelection.ts
import { ref, onMounted, onUnmounted } from "vue";

export function useTextSelection() {
  const selectedText = ref("");
  const isSelected = ref(false);
  let selectionTimer: ReturnType<typeof setTimeout> | undefined;


  const updateSelection = () => {
    if (selectionTimer) {
      clearTimeout(selectionTimer);
    }

    selectionTimer = setTimeout(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString() : "";
      selectedText.value = text;
      isSelected.value = text.length > 0;
    }, 100);
  };

  const clearSelection = () => {
    const selection = window.getSelection();
    if (selection) {
      if (selection.removeAllRanges) {
        selection.removeAllRanges();
      } else if (selection.empty) {
        selection.empty();
      }
    }
    // Обновляем состояние
    selectedText.value = "";
    isSelected.value = false;
  };

  onMounted(() => {
    document.addEventListener("selectionchange", updateSelection);
  });

  onUnmounted(() => {
    document.removeEventListener("selectionchange", updateSelection);
  });

  return {
    selectedText,
    isSelected,
    clearSelection,
  };
}
