import { textActionFromEvent, type TextAction } from "@/text-processing-v3/readingAnnotations";

interface TextTapOptions {
  isBlocked: () => boolean;
  clearSelection: () => void;
  onAction: (action: TextAction) => void;
  onTap: (clientX: number, clientY: number) => void;
}

const hasSelection = (): boolean => (window.getSelection()?.toString().length ?? 0) > 0;

/**
 * Единственный источник тапа по тексту — `click`: браузер сам не присылает его
 * после свайпа или скролла.
 * - Бейдж сноски и якорь открываются как действие.
 * - Тап при активном выделении только снимает выделение.
 * - Иначе тап уходит в зоны экрана (меню, листание).
 */
export function useTextTap(options: TextTapOptions) {
  let selectionAtDown = false;

  const handlePointerDown = (event: PointerEvent): void => {
    if (event.isPrimary) selectionAtDown = hasSelection();
  };

  const handleClick = (event: MouseEvent): void => {
    const action = textActionFromEvent(event);
    if (action) event.preventDefault();

    const hadSelection = selectionAtDown;
    selectionAtDown = false;

    if (hasSelection()) {
      // Выделение, начатое этим же жестом, не трогаем; прежнее — снимаем.
      if (hadSelection) options.clearSelection();
      return;
    }

    if (action) {
      event.stopPropagation();
      options.onAction(action);
      return;
    }

    if (options.isBlocked()) return;
    options.onTap(event.clientX, event.clientY);
  };

  return { handlePointerDown, handleClick };
}
