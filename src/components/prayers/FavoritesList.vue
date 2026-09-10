<template>
  <f7-list ref="list" :class="[
      'prayers',
      'favorites-list',
      cssClass,
      { 'is-deleting': showListAnimation },
    ]"
    :sortable="sortable" 
    :sortable-tap-hold="sortable && tutorialItemId == null"
    :sortable-enabled="isSortableMode" 
    @sortable:sort="onSortableSort" 
    @taphold.passive="onTapHold"
    @touchend.passive="onTouchEnd" 
    @contextmenu="handleContextMenu">
    <TransitionGroup 
      name="favorite-item"
      tag="ul" 
      :key="isLoading ? 'loading' : 'loaded'"
      @before-leave="onBeforeLeave">
      <f7-list-item 
        :class="{ 'has-progress': !!item.progress, 'skeleton-text skeleton-effect-wave': isLoading }"
        swipeout 
        v-for="item in localItems" 
        :key="item.id" 
        :title="item.name"
        :link="isSortableMode || tutorialItemId != null ? 'javascript:void(0)' : item.url" 
        :data-id="item.id" 
        @contextmenu="handleContextMenu">
        <template #root-start>
          <f7-link class="delete-handler" @click="deleteItem(item)">
            <SvgIcon icon="delete" color="primary-accent-50" />
          </f7-link>
        </template>
        <template #inner>
          <PrayersListProgress :progress="item.progress" :pages="item.pages" :loading="isLoading" />
        </template>
        <template #after>
          <LanguageBadges :languages="item.lang" />
        </template>
        <f7-swipeout-actions right v-if="!isSortableMode && !isSortingByTapHold">
          <f7-swipeout-button
            data-tutorial-action="share"
            close
            @click="shareItem(item, $event)"
          >
            <SvgIcon icon="share" :color="isDarkMode ? 'baige-90' : 'black-60'" />
          </f7-swipeout-button>
          <f7-swipeout-button
            data-tutorial-action="reset"
            close
            @click="resetItem(item)"
            v-if="shouldShowResetButton(item)"
          >
            <SvgIcon icon="reset" :color="isDarkMode ? 'baige-90' : 'black-60'" />
          </f7-swipeout-button>
          <f7-swipeout-button
            data-tutorial-action="delete"
            @click="deleteItem(item)"
          >
            <SvgIcon icon="delete" color="primary-accent-50" />
          </f7-swipeout-button>
        </f7-swipeout-actions>
      </f7-list-item>
    </TransitionGroup>
  </f7-list>
</template>

<script setup lang="ts">
import { ref, watchEffect, computed, useTemplateRef, onBeforeUpdate, onBeforeUnmount, type ComponentPublicInstance } from "vue";
import { f7 } from "framework7-vue";
import { useTheme } from "@/composables/useTheme";
import { useUndoToast } from "@/composables/useUndoToast";
import { device } from "@/js/device";

import type { Language } from "@/types/common";

import SvgIcon from "@/components/SvgIcon.vue";
import LanguageBadges from "./LanguageBadges.vue";
import PrayersListProgress from "./PrayersListProgress.vue";
import { usePageVisiblility } from "@/composables/usePageVisiblity";
import { useSwipeoutEdgeGuard, swipeoutClearCache } from "@/composables/useSwipeout";
import { useComponentsStore } from "@/stores/components";

interface FavoriteListItem {
  id: number;
  name: string;
  url: string;
  lang?: Language[];
  progress?: number;
  pages?: number;
}
// Props
const {
  favorites: items,
  sortable = false,
  sortableEnabled = false,
  cssClass = "",
  isLoading = false,
  tutorialItemId = null,
} = defineProps<{
  favorites: FavoriteListItem[];
  sortable?: boolean;
  sortableEnabled?: boolean;
  cssClass?: string;
  isLoading?: boolean;
  // Во время тура на главной всегда показываем кнопку сброса на этой строке
  tutorialItemId?: number | null;
}>();

const shouldShowResetButton = (item: FavoriteListItem) =>
  Boolean((item.progress && item.pages) || item.id === tutorialItemId);

// Events
const emit = defineEmits<{
  deleteItem: [id: number];
  undoDeleteItem: [];
  resetItemProgress: [id: number];
  undoResetItemProgress: [];
  sorted: [id: number, prevId: number | null];
}>();

const { isDarkMode } = useTheme();

const skeletonItems = Array(5).fill(null).map((_, index) => ({
  id: -(index + 1),
  name: "________________________________",
  url: "javascript:void(0)",
  progress: 0.5,
  pages: 10,
  lang: [],
}));

const localItems = computed(() => {
  if (isLoading) {
    return skeletonItems;
  }
  return items;
});

const isSortableMode = computed(() => {
  return sortable && sortableEnabled;
});

const showListAnimation = ref(0);

/** Позиции li до патча DOM — нужны, т.к. leave идёт последовательно и absolute сбивает offsetTop. */
const itemOffsets = new Map<string, { top: number; width: number }>();

onBeforeUpdate(() => {
  const listEl = listRef.value?.$el as HTMLElement | undefined;
  const ul = listEl?.querySelector("ul");
  if (!ul) return;

  itemOffsets.clear();
  ul.querySelectorAll<HTMLElement>("li[data-id]").forEach((li) => {
    const id = li.dataset.id;
    if (!id) return;
    itemOffsets.set(id, { top: li.offsetTop, width: li.offsetWidth });
  });
});

/** Фиксирует позицию уходящего элемента, чтобы при фильтре они не схлопывались в кучу. */
const onBeforeLeave = (el: Element) => {
  //return;
  const htmlEl = el as HTMLElement;
  const id = htmlEl.dataset.id;
  const saved = id ? itemOffsets.get(id) : undefined;
  htmlEl.style.top = `${saved?.top ?? htmlEl.offsetTop}px`;
  htmlEl.style.left = "0";
  htmlEl.style.width = `${saved?.width ?? htmlEl.offsetWidth}px`;
};

const deleteItem = (item: FavoriteListItem) => {
  showListAnimation.value = 1;
  setTimeout(() => {
    showListAnimation.value = 0;
  }, 600);
  emit("deleteItem", item.id);
  showUndoDeleteToast();
};

const onSortableSort = ({ from, to, el }: { from: number; to: number; el: HTMLElement }) => {
  const prevEl = el.previousElementSibling;
  const prevId = prevEl ? Number((prevEl as HTMLElement).dataset.id) : null;
  const id = Number(el.dataset.id);
  emit("sorted", id, Number.isFinite(prevId) ? prevId : null);
};

const { getComponent } = useComponentsStore();

const listRef = useTemplateRef<ComponentPublicInstance>("list");
useSwipeoutEdgeGuard(() => listRef.value?.$el);

const isSortingByTapHold = ref(false);
const onTapHold = (e: Event) => {
  // console.log("onTapHold", e);
  isSortingByTapHold.value = true;
};

const onTouchEnd = (e: Event) => {
  // console.log("onTouchEnd", e);
  isSortingByTapHold.value = false;
};

const { isPageVisible } = usePageVisiblility();

watchEffect(() => {
  if (!f7.params.touch) {
    return;
  }
  // console.log("f7", f7);

  if (isPageVisible.value) {
    f7.params.touch.tapHold = !isSortableMode.value;
    device.setShouldHandleLongClick(f7.params.touch.tapHold);
  } else {
    f7.params.touch.tapHold = false;
    device.setShouldHandleLongClick(f7.params.touch.tapHold);
  }
});

const resetItem = (item: FavoriteListItem) => {

  if (!listRef.value) return;

  listRef.value.$el.addEventListener("swipeout:closed", (e: Event) => {
    const swipeoutEl = e.target as HTMLElement;
    swipeoutClearCache(swipeoutEl);
    emit("resetItemProgress", item.id);
    showUndoResetToast();
  }, { once: true });
};

const shareItem = (item: FavoriteListItem, $event: Event) => {
  const sharePopover = getComponent("sharePopover");
  if (!sharePopover) return;

  const targetEl = ($event.target as HTMLElement)
    ?.closest("li")
    ?.querySelector(".item-title") as HTMLElement;

  sharePopover.open({
    title: item.name,
    url: item.url,
  }, targetEl);
};

const { showUndoToast: showUndoDeleteToast } = useUndoToast({
  text: "Убрано из Избранного",
  onUndo: () => {
    showListAnimation.value = 1;
    setTimeout(() => {
      showListAnimation.value = 0;
    }, 600);
    emit("undoDeleteItem");
  },
});

const { showUndoToast: showUndoResetToast } = useUndoToast({
  text: "Чтение начнется сначала",
  onUndo: () => {
    emit("undoResetItemProgress");
  },
});

// Добавляем обработчик контекстного меню
const handleContextMenu = (e: Event) => {
  // Предотвращаем показ нативного контекстного меню на мобильных устройствах
  e.preventDefault();
  return false;
};

const getTutorialItemEl = (): HTMLElement | null => {
  const listEl = listRef.value?.$el as HTMLElement | undefined;
  if (!listEl) return null;
  if (tutorialItemId != null) {
    return listEl.querySelector<HTMLElement>(`li[data-id="${tutorialItemId}"]`);
  }
  return listEl.querySelector<HTMLElement>("li.swipeout");
};

const getTutorialActionEl = (action: string): HTMLElement | null => {
  return (
    getTutorialItemEl()?.querySelector<HTMLElement>(
      `[data-tutorial-action="${action}"]`
    ) ?? null
  );
};

const getTutorialDeleteHandlerEl = (): HTMLElement | null => {
  return (
    getTutorialItemEl()?.querySelector<HTMLElement>(".delete-handler") ?? null
  );
};

const getTutorialSortHandlerEl = (): HTMLElement | null => {
  return (
    getTutorialItemEl()?.querySelector<HTMLElement>(".sortable-handler") ?? null
  );
};

// Тап по карточке тура F7 считает «тапом снаружи» и закрывает swipeout
// (swipeout.js: app.on('touchstart') → close). Строка схлопывается и
// на следующем шаге снова открывается — отсюда дёрганье на шагах 3–5.
type SwipeoutWithEl = { el?: HTMLElement; close: (...args: unknown[]) => void };

const resolveSwipeoutEl = (el: unknown): HTMLElement | null => {
  if (!el) return null;
  if (typeof el === "string") return document.querySelector(el);
  if (el instanceof HTMLElement) return el;
  if (typeof el === "object" && el !== null && "0" in el) {
    const first = (el as { 0: unknown })[0];
    return first instanceof HTMLElement ? first : null;
  }
  return null;
};

type SwipeoutCloseFn = (this: unknown, el: unknown, callback?: () => void) => void;

let keepTutorialSwipeoutOpen = false;
let originalSwipeoutClose: SwipeoutCloseFn | null = null;

const releaseTrackedSwipeout = () => {
  const swipeout = f7.swipeout as SwipeoutWithEl | undefined;
  if (swipeout) swipeout.el = undefined;
};

const onPointerStartCapture = () => {
  if (keepTutorialSwipeoutOpen) releaseTrackedSwipeout();
};

const installSwipeoutCloseGuard = () => {
  if (originalSwipeoutClose) return;
  originalSwipeoutClose = f7.swipeout.close as unknown as SwipeoutCloseFn;
  f7.swipeout.close = function (this: unknown, el: unknown, callback?: () => void) {
    if (keepTutorialSwipeoutOpen) {
      const tutorialEl = getTutorialItemEl();
      const targetEl = resolveSwipeoutEl(el);
      if (tutorialEl && targetEl && (targetEl === tutorialEl || tutorialEl.contains(targetEl))) {
        return;
      }
    }
    return originalSwipeoutClose?.call(this, el, callback);
  } as typeof f7.swipeout.close;
  document.addEventListener("touchstart", onPointerStartCapture, true);
  document.addEventListener("mousedown", onPointerStartCapture, true);
};

const uninstallSwipeoutCloseGuard = () => {
  document.removeEventListener("touchstart", onPointerStartCapture, true);
  document.removeEventListener("mousedown", onPointerStartCapture, true);
  if (!originalSwipeoutClose) return;
  f7.swipeout.close = originalSwipeoutClose as typeof f7.swipeout.close;
  originalSwipeoutClose = null;
};

const openTutorialSwipeout = (): Promise<void> => {
  const el = getTutorialItemEl();
  if (!el) return Promise.resolve();
  keepTutorialSwipeoutOpen = true;
  installSwipeoutCloseGuard();
  if (el.classList.contains("swipeout-opened")) {
    releaseTrackedSwipeout();
    return Promise.resolve();
  }
  swipeoutClearCache(el);
  return new Promise((resolve) => {
    f7.swipeout.open(el, "right", () => {
      releaseTrackedSwipeout();
      resolve();
    });
  });
};

const closeTutorialSwipeout = (): Promise<void> => {
  keepTutorialSwipeoutOpen = false;
  const el = getTutorialItemEl();
  if (!el || !el.classList.contains("swipeout-opened")) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    f7.swipeout.close(el, () => resolve());
  });
};

onBeforeUnmount(() => {
  keepTutorialSwipeoutOpen = false;
  uninstallSwipeoutCloseGuard();
});

defineExpose({
  getTutorialItemEl,
  getTutorialActionEl,
  getTutorialDeleteHandlerEl,
  getTutorialSortHandlerEl,
  openTutorialSwipeout,
  closeTutorialSwipeout,
});

</script>

<style scoped>
/* Якорь для absolute leave при фильтрации / удалении */
.favorites-list :deep(ul) {
  position: relative;
}

/* Плавная перестройка при смене фильтра */
.favorite-item-move,
.favorite-item-enter-active,
.favorite-item-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.favorite-item-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}

.favorite-item-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.favorite-item-leave-active {
  position: absolute;
  width: 100%;
  pointer-events: none;
  z-index: 0;
}

/* Более выразительная анимация удаления / undo */
.favorites-list.is-deleting .favorite-item-move,
.favorites-list.is-deleting .favorite-item-enter-active,
.favorites-list.is-deleting .favorite-item-leave-active {
  transition-duration: 0.6s;
}

.favorites-list.is-deleting .favorite-item-enter-from,
.favorites-list.is-deleting .favorite-item-leave-to {
  transform: translateX(-40%) translateY(-50%);
}

.favorites-list.is-deleting .favorite-item-leave-active {
  z-index: -1;
}

.favorites-list :deep(.item-link) {
  --f7-touch-ripple-color: transparent;
}
</style>
