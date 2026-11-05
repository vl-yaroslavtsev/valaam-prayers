import type { Toast } from "framework7/types";

const SINGLE_TEXT = "Записка удалена";
const MULTIPLE_TEXT = "Записки удалены";

export function undoToastText(count: number): string {
  return count === 1 ? SINGLE_TEXT : MULTIPLE_TEXT;
}

function isOpen(toast: Toast.Toast | null): toast is Toast.Toast {
  return !!toast?.el?.classList.contains("modal-in");
}

/** Закрывает тост анимацией. destroy() у открытого тоста снимает экземпляр и оставляет .toast.modal-in в DOM навсегда. */
export function closeOpenToast(toast: Toast.Toast | null): void {
  if (isOpen(toast)) toast.close();
}

/**
 * Один тост на всю серию удалений: пока он на экране, меняется только текст.
 * Новый тост создаётся, когда предыдущий уже закрыт.
 */
export function syncUndoToast(
  current: Toast.Toast | null,
  count: number,
  open: (text: string) => Toast.Toast,
): Toast.Toast | null {
  if (count === 0) {
    closeOpenToast(current);
    return null;
  }

  const text = undoToastText(count);
  if (isOpen(current)) {
    const textEl = current.el.querySelector(".toast-text");
    if (textEl) textEl.textContent = text;
    return current;
  }
  return open(text);
}
