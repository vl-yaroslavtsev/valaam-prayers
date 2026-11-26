import { ref, computed, onUnmounted, type Ref } from "vue";
import { f7 } from "framework7-vue";
import type { Dialog, Toast } from "framework7/types";
import { useBookmarksStore, type Bookmark } from "@/stores/bookmarks";

export interface BookmarkWithPage extends Bookmark {
  page: number;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Прогресс пагинатора — позиция от начала первой страницы до начала последней
 * (swiper.progress и scrollTop / (scrollHeight - clientHeight)): знаменатель N-1.
 * floor(progress * N)+1 во второй половине страницы (вертикальный скролл) даёт уже
 * следующий номер — закладка «отваливается», не доскроллив текущую страницу.
 */
export const progressToPage = (progress: number, totalPages: number): number => {
  if (totalPages <= 1) return 1;
  return Math.min(Math.floor(progress * (totalPages - 1)) + 1, totalPages);
};

/**
 * Закладка хранит прогресс начала страницы. floor() на значении чуть ниже
 * целой границы (погрешность float) относит её на предыдущую страницу:
 * для 27 страниц прогресс 16-й — это 15/26, а 15/26 * 26 = 14.999999999999998.
 * Ближайшая граница возвращает ту страницу, с которой закладку сохранили.
 */
export const bookmarkProgressToPage = (progress: number, totalPages: number): number => {
  if (totalPages <= 1) return 1;
  const page = Math.round(progress * (totalPages - 1)) + 1;
  return Math.min(Math.max(page, 1), totalPages);
};

/** Прогресс начала страницы — чтобы закладка открывала верх страницы, а не позицию внутри неё. */
export const pageToProgress = (page: number, totalPages: number): number => {
  if (totalPages <= 1) return 0;
  const clamped = Math.min(Math.max(page, 1), totalPages);
  return (clamped - 1) / (totalPages - 1);
};

/**
 * Композабл закладок для страницы чтения молитвы/книги (itemId).
 *
 * Закладка хранит прогресс (0..1), а не номер страницы, чтобы оставаться корректной
 * при пересчёте пагинации (смена шрифта/языка). Сохраняем прогресс начала текущей
 * страницы, а не точную позицию скролла.
 *
 * currentPage — номер страницы пагинатора (активный слайд или позиция вертикального
 * скролла). С progressToPage(swiper.progress) её сравнивать нельзя: на границе float
 * даёт предыдущий номер, и иконка закладки видна на двух соседних страницах.
 */
export function useBookmarks(itemId: string, currentPage: Ref<number>, totalPages: Ref<number>) {
  const store = useBookmarksStore();

  const bookmarksForItem = computed<BookmarkWithPage[]>(() =>
    store.getBookmarksByItem(itemId).map((bookmark) => ({
      ...bookmark,
      page: bookmarkProgressToPage(bookmark.progress, totalPages.value),
    }))
  );

  const currentPageBookmark = computed<BookmarkWithPage | null>(
    () => bookmarksForItem.value.find((b) => b.page === currentPage.value) ?? null
  );

  // --- Режим навигации по закладкам (аналог isSearchModeActive) ---
  const isBookmarkNavActive = ref(false);
  const activeBookmarkId = ref<string | null>(null);

  const activeBookmarkIndex = computed(() =>
    bookmarksForItem.value.findIndex((b) => b.id === activeBookmarkId.value)
  );
  const activeBookmark = computed<BookmarkWithPage | null>(() => {
    const idx = activeBookmarkIndex.value;
    return idx >= 0 ? bookmarksForItem.value[idx] : null;
  });

  const goToBookmark = (id: string) => {
    activeBookmarkId.value = id;
    isBookmarkNavActive.value = true;
  };

  const goToNextBookmark = () => {
    const list = bookmarksForItem.value;
    if (list.length === 0) return;
    const idx = (activeBookmarkIndex.value + 1 + list.length) % list.length;
    activeBookmarkId.value = list[idx].id;
  };

  const goToPrevBookmark = () => {
    const list = bookmarksForItem.value;
    if (list.length === 0) return;
    const idx = (activeBookmarkIndex.value - 1 + list.length) % list.length;
    activeBookmarkId.value = list[idx].id;
  };

  const closeBookmarkNav = () => {
    isBookmarkNavActive.value = false;
    activeBookmarkId.value = null;
  };

  // --- Тосты «закладка добавлена / удалена» ---
  // destroy() без close() снимает экземпляр, но оставляет .toast.modal-in в DOM:
  // таймаут у такого тоста уже не сработает.
  let addedToast: Toast.Toast | null = null;
  let deletedToast: Toast.Toast | null = null;

  const closeToast = (toast: Toast.Toast | null) => {
    if (!toast?.el?.classList.contains("modal-in")) return;
    toast.close(false);
  };

  const closeToasts = () => {
    closeToast(addedToast);
    closeToast(deletedToast);
  };

  const showAddedToast = (onEdit: () => void) => {
    closeToasts();
    addedToast = f7.toast.create({
      text: "Закладка добавлена.",
      closeButton: true,
      closeButtonText: "Изменить",
      closeTimeout: 4000,
      destroyOnClose: true,
      on: {
        closeButtonClick: onEdit,
      },
    });
    addedToast.open();
  };

  const showDeletedToast = (onUndo: () => void) => {
    closeToasts();
    deletedToast = f7.toast.create({
      text: "Закладка удалена.",
      closeButton: true,
      closeButtonText: "Отменить",
      closeTimeout: 5000,
      destroyOnClose: true,
      on: {
        closeButtonClick: onUndo,
      },
    });
    deletedToast.open();
  };

  // --- Удаление ---
  const deleteBookmarkWithUndo = async (id: string) => {
    if (activeBookmarkId.value === id) {
      closeBookmarkNav();
    }
    await store.deleteBookmark(id);
    showDeletedToast(() => {
      store.undoDeleteBookmark();
    });
  };

  // --- Диалог редактирования названия ---
  let currentDialog: Dialog.Dialog | null = null;

  const closeEditDialog = () => {
    if (!currentDialog?.el?.classList.contains("modal-in")) return;
    currentDialog.close(false);
  };

  const openEditDialog = (bookmark: { id: string; name: string }) => {
    // destroy() у открытого диалога оставляет его на экране без обработчика закрытия.
    closeEditDialog();

    const dialog = f7.dialog.create({
      title: "Изменить закладку",
      destroyOnClose: true,
      closeByBackdropClick: true,
      content: `
        <div class="dialog-input-field input">
          <div class="item-input-wrap">
            <input type="text" class="dialog-input bookmark-name-input" value="${escapeHtml(bookmark.name)}" />
          </div>
        </div>
      `,
      buttons: [
        {
          text: "Удалить",
          onClick: (dlg) => {
            deleteBookmarkWithUndo(bookmark.id);
            dlg.close(false);
          },
        },
        {
          text: "Сохранить",
          cssClass:"button-fill",
          onClick: (dlg) => {
            const input = dlg.$el.find("input.bookmark-name-input")[0] as HTMLInputElement | undefined;
            const value = input?.value.trim();
            if (value) {
              store.renameBookmark(bookmark.id, value);
            }
            dlg.close(false);
          },
        },
      ],
      on: {
        opened: (dlg) => {
          console.log("opened", dlg);
          const input = dlg.$el.find("input.bookmark-name-input")[0] as HTMLInputElement | undefined;
          if (!input) {
            return;
          }
          input.focus();
          requestAnimationFrame(() => {
            const end = input.value.length;
            input.setSelectionRange(end, end);
          });
          
          if (f7.device.android) {
            f7.$(window).on("resize", resizeHandler);
          } else {
            resizeHandler();
          }
        },
        close: () => {
          f7.$(window).off("resize", resizeHandler);
        },
      },
    });

    const resizeHandler = () => {
      console.log("centerDialog", dialog);
      dialog.$el[0].scrollIntoView({block: "nearest", behavior: "smooth"});
    };

    currentDialog = dialog;
    dialog.open();
  };

  // --- Тап по правому верхнему углу ---
  const onCornerTap = async (page?: number) => {
    const existing = page != null
      ? bookmarksForItem.value.find((bookmark) => bookmark.page === page) ?? null
      : currentPageBookmark.value;
    if (existing) {
      openEditDialog(existing);
      return;
    }

    const created = await store.addBookmark(
      itemId,
      pageToProgress(page ?? currentPage.value, totalPages.value)
    );
    showAddedToast(() => {
      openEditDialog(created);
    });
  };

  onUnmounted(() => {
    closeToasts();
    closeEditDialog();
  });

  return {
    bookmarksForItem,
    currentPageBookmark,
    isBookmarkNavActive,
    activeBookmarkId,
    activeBookmarkIndex,
    activeBookmark,
    goToBookmark,
    goToNextBookmark,
    goToPrevBookmark,
    closeBookmarkNav,
    closeToasts,
    closeEditDialog,
    onCornerTap,
    openEditDialog,
    deleteBookmarkWithUndo,
  };
}
