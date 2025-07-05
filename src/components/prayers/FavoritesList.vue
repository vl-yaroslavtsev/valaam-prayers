<template>
  <f7-list
    ref="list"
    :class="`prayers ${cssClass} favorites-list`"
    :sortable="sortable"
    :sortable-tap-hold="sortable"
    :sortable-enabled="isSortableMode"
    @sortable:sort="onSortableSort"
    @taphold.passive="onTapHold"
    @touchend.passive="onTouchEnd"
    @contextmenu="handleContextMenu"
  >
    <TransitionGroup :name="showListAnimation ? 'favorite-item' : ''" tag="ul">
      <f7-list-item
        :class="{ 'has-progress': !!item.progress, 'skeleton-text skeleton-effect-wave': !item.name }"
        swipeout
        v-for="item in items"
        :key="item.id"
        :title="item.name ? item.name : '________________________________'"
        :link="isSortableMode || !item.name ? 'javascript:void(0)' : item.url"
        :data-id="item.id"
        @contextmenu="handleContextMenu"
      >
        <template #root-start>
          <f7-link class="delete-handler" @click="deleteItem(item)">
            <SvgIcon icon="delete" color="primary-accent-50" />
          </f7-link>
        </template>
        <template #inner>
          <PrayersListProgress :progress="item.progress" :pages="item.pages" :loading="!item.name" />
        </template>
        <template #after>
          <LanguageBadges :languages="item.lang" />
        </template>
        <f7-swipeout-actions right v-if="!isSortableMode && !isSortingByTapHold">
          <f7-swipeout-button close @click="shareItem(item, $event)">
            <SvgIcon icon="share" :color="isDarkMode ? 'baige-900' : 'black-600'" />
          </f7-swipeout-button>
          <f7-swipeout-button
            close
            @click="resetItem(item)"
            v-if="item.progress && item.pages"
          >
            <SvgIcon icon="reset" :color="isDarkMode ? 'baige-900' : 'black-600'"
          /></f7-swipeout-button>
          <f7-swipeout-button @click="deleteItem(item)">
            <SvgIcon icon="delete" color="primary-accent-50" />
          </f7-swipeout-button>
        </f7-swipeout-actions>
      </f7-list-item>
    </TransitionGroup>
  </f7-list>
</template>

<script setup lang="ts">
import { ref, watchEffect, computed, useTemplateRef, ComponentPublicInstance } from "vue";
import { storeToRefs } from "pinia";
import { f7 } from "framework7-vue";
import { useTheme } from "@/composables/useTheme";
import { useUndoToast } from "@/composables/useUndoToast";
import { device } from "@/js/device";

import type { Lang } from "@/types/common";

import SvgIcon from "@/components/SvgIcon.vue";
import LanguageBadges from "./LanguageBadges.vue";
import PrayersListProgress from "./PrayersListProgress.vue";
import { usePageVisiblility } from "@/composables/usePageVisiblity";
import { useSwipeoutEdgeGuard, swipeoutClearCache } from "@/composables/useSwipeout";
import { useComponentsStore } from "@/stores/components";

interface FavoriteListItem {
  id: string;
  name: string;
  url: string;
  lang?: Lang[];
  progress?: number;
  pages?: number;
}
// Props
const {
  favorites: items,
  sortable = false,
  sortableEnabled = false,
  cssClass = "",
} = defineProps<{
  favorites: FavoriteListItem[];
  sortable?: boolean;
  sortableEnabled?: boolean;
  cssClass?: string;
}>();

// Events
const emit = defineEmits<{
  deleteItem: [id: string ];
  undoDeleteItem: [];
  resetItemProgress: [id: string];
  undoResetItemProgress: [];
  sorted: [id: string, from: number, to: number];
}>();

const { isDarkMode } = useTheme();

const isSortableMode = computed(() => {
  return sortable && sortableEnabled;
});

const showListAnimation = ref(false);

const deleteItem = (item: FavoriteListItem) => {
  showListAnimation.value = true;
  setTimeout(() => {
    showListAnimation.value = false;
  }, 600);
  emit("deleteItem", item.id);
  showUndoDeleteToast();
};

const onSortableSort = ({ from, to, el }: { from: number; to: number; el: HTMLElement   }) => {
  // console.log("onSortableSort", from, to, el);
  const id = el.dataset.id as string;
  emit("sorted", id, from, to);
};

const { getComponent }  = useComponentsStore();

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
  text: "Элемент удален",
  onUndo: () => {
    showListAnimation.value = true;
    setTimeout(() => {
      showListAnimation.value = false;
    }, 600);
    emit("undoDeleteItem");
  },
});

const { showUndoToast: showUndoResetToast } = useUndoToast({
  text: "Прогресс сброшен",
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

</script>

<style scoped>
/* Анимация для удаления элементов из избранного */
.favorite-item-move,
.favorite-item-enter-active,
.favorite-item-leave-active {
  transition: all 600ms ease;
}

.favorite-item-enter-from,
.favorite-item-leave-to {
  opacity: 0;
  /* transform: translateY(-50%); */
  transform: translateX(-40%) translateY(-50%);
}

/* Обеспечиваем плавное схлопывание высоты */
.favorite-item-leave-active {
  position: absolute;
  width: 100%;
  z-index: -1;
}

.favorites-list :deep(.item-link) {
  --f7-touch-ripple-color: transparent;
}
</style>
