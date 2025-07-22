import { onUnmounted, watch } from "vue";
import { f7 } from "framework7-vue";
import type { Toast } from "framework7/types";

export function useUndoToast({
  text,
  onUndo,
  closeTimeout = 5000,
}: {
  text: string;
  onUndo: () => void;
  closeTimeout?: number;
}) {
  
  let undoToast: Toast.Toast;

  const showUndoToast = () => {
    if (!undoToast) {
      undoToast = f7.toast.create({
        text,
        closeTimeout,
        closeButton: true,
        closeButtonText: "Отменить",
        on: {
          closeButtonClick() {
            onUndo();
          },
        },
      });

      f7.once('pageBeforeOut', () => {
        undoToast.close();
      })
    }
    undoToast.open();
  };

  onUnmounted(() => {
    if (undoToast) {
      undoToast.close();
      undoToast.destroy();
    }
  });

  return {
    showUndoToast,
  };
}
