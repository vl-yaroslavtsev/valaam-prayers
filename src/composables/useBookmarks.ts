import { ref, computed, onUnmounted, type Ref } from "vue";
import { f7 } from "framework7-vue";
import type { Dialog } from "framework7/types";
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

/** Прогресс начала страницы — чтобы закладка открывала верх страницы, а не позицию внутри неё. */
export const pageToProgress = (page: number, totalPages: number): number => {
  if (totalPages <= 1) return 0;
  const clamped = Math.min(Math.max(page, 1), totalPages);
  return (clamped - 1) / (totalPages - 1);
};

/**
 * Композабл закладок для страницы чтения молитвы/книги (itemId).
 *
 * progress/totalPages — как в reading-history: закладка хранит прогресс (0..1), а не номер
 * страницы, чтобы оставаться корректной при пересчёте пагинации (смена шрифта/языка).
 * Сохраняем прогресс начала текущей страницы, а не точную позицию скролла.
 */
export function useBookmarks(itemId: string, progress: Ref<number>, totalPages: Ref<number>) {
  const store = useBookmarksStore();

  const bookmarksForItem = computed<BookmarkWithPage[]>(() =>
    store.getBookmarksByItem(itemId).map((bookmark) => ({
      ...bookmark,
      page: progressToPage(bookmark.progress, totalPages.value),
    }))
  );

  const currentPage = computed(() => progressToPage(progress.value, totalPages.value));

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

  // --- Тултипы ---
  let addedToast: ReturnType<typeof f7.toast.create> | null = null;
  let deletedToast: ReturnType<typeof f7.toast.create> | null = null;

  const showAddedToast = (onEdit: () => void) => {
    addedToast?.destroy();
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
    deletedToast?.destroy();
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

  const openEditDialog = (bookmark: { id: string; name: string }) => {
    currentDialog?.destroy();

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
          onClick: () => {
            deleteBookmarkWithUndo(bookmark.id);
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
    addedToast?.destroy();
    deletedToast?.destroy();
    currentDialog?.destroy();
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
    onCornerTap,
    openEditDialog,
    deleteBookmarkWithUndo,
  };
}
