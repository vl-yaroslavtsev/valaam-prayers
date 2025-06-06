<template>
  <f7-list
    :class="`prayers ${cssClass}`"
    :sortable="sortable"
    :sortable-tap-hold="sortable"
    :sortable-enabled="isSortableMode"
  >
    <TransitionGroup name="favorite-item" tag="ul">
      <f7-list-item
        :class="{ 'has-progress': !!item.progress }"
        swipeout
        v-for="item in items"
        :key="item.id"
        :title="item.title"
        :link="item.url"
      >
        <template #root-start>
          <f7-link class="delete-handler" @click="deleteItem(item)">
            <DeleteIcon color="primary-accent-50" />
          </f7-link>
        </template>
        <template #inner v-if="item.progress && item.pages">
          <div class="item-progress">
            <f7-progressbar :progress="item.progress * 100" />
            <div class="progress-text">
              {{ Math.floor(item.progress * item.pages) }} из
              {{ item.pages }} страниц
            </div>
          </div>
        </template>
        <template #after>
          <LanguageBadges :languages="item.lang" />
        </template>
        <f7-swipeout-actions right v-if="!isSortableMode">
          <f7-swipeout-button close @click="shareItem(item, $event)">
            <ShareIcon :color="isDarkMode ? 'baige-900' : 'black-600'" />
          </f7-swipeout-button>
          <f7-swipeout-button
            close
            @click="resetItem(item)"
            v-if="item.progress && item.pages"
          >
            <ResetIcon :color="isDarkMode ? 'baige-900' : 'black-600'"
          /></f7-swipeout-button>
          <f7-swipeout-button @click="deleteItem(item)">
            <DeleteIcon color="primary-accent-50" />
          </f7-swipeout-button>
        </f7-swipeout-actions>
      </f7-list-item>
    </TransitionGroup>
  </f7-list>
  <SharePopover
    :item="{ title: sharedItem?.title || '', url: sharedItem?.url || '' }"
    :target-el="sharedTargetEl"
    v-model="isSharedOpened"
  />
</template>

<script setup lang="ts">
import { ref, watchEffect, computed, onUnmounted } from "vue";
import { f7 } from "framework7-vue";
import type { Toast } from "framework7/types";
import { useTheme } from "@/composables/useTheme";

import DeleteIcon from "@/components/icons/DeleteIcon.vue";
import ResetIcon from "./icons/ResetIcon.vue";
import ShareIcon from "./icons/ShareIcon.vue";
import LanguageBadges from "./LanguageBadges.vue";
import SharePopover from "./SharePopover.vue";

export interface FavoriteItem {
  id: number;
  title: string;
  url: string;
  lang?: Array<"ру" | "цс" | "гр">;
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
  favorites: FavoriteItem[];
  sortable?: boolean;
  sortableEnabled?: boolean;
  cssClass?: string;
}>();

// Events
const emit = defineEmits<{
  deleteItem: [item: FavoriteItem];
  undoDeleteItem: [payload: { item: FavoriteItem; index: number }];
  resetItemProgress: [item: FavoriteItem];
  undoResetItemProgress: [
    payload: { item: FavoriteItem; progress: number; pages: number },
  ];
}>();

const deleteItem = (item: FavoriteItem) => {
  const index = items.indexOf(item);
  emit("deleteItem", item);
  showUndoDeleteToast(item, index);
};

const { isDarkMode } = useTheme();

const isSortableMode = computed(() => {
  return sortable && sortableEnabled;
});

watchEffect(() => {
  if (f7.params.touch) {
    f7.params.touch.tapHold = !isSortableMode.value;
  }
});

const resetItem = (item: FavoriteItem) => {
  const progress = item.progress || 0;
  const pages = item.pages || 0;

  emit("resetItemProgress", item);
  showUndoResetItemProgressToast(item, progress, pages);
};

const sharedTargetEl = ref<Element | undefined>(undefined);

const isSharedOpened = ref(false);

const sharedItem = ref<FavoriteItem | null>(null);

const shareItem = (item: FavoriteItem, $event: Event) => {
  sharedTargetEl.value = ($event.target as HTMLElement)
    ?.closest("li")
    ?.querySelector(".item-title") as HTMLElement;
  sharedItem.value = item;
  isSharedOpened.value = true;
};

let undoDeleteToast: Toast.Toast;
let dataToUndoDelete: { item: FavoriteItem; index: number };

const showUndoDeleteToast = (item: FavoriteItem, index: number) => {
  dataToUndoDelete = { item, index };
  if (!undoDeleteToast) {
    // , closeTimeout: 2000
    undoDeleteToast = f7.toast.create({
      text: "Элемент удален",
      closeTimeout: 5000,
      closeButton: true,
      closeButtonText: "Отменить",
      on: {
        closeButtonClick() {
          emit("undoDeleteItem", dataToUndoDelete);
        },
      },
    });
  }
  undoDeleteToast.open();
};

let undoResetItemProgressToast: Toast.Toast;
let dataToUndoReset: { item: FavoriteItem; progress: number; pages: number };

const showUndoResetItemProgressToast = (
  item: FavoriteItem,
  progress: number,
  pages: number
) => {
  dataToUndoReset = { item, progress, pages };
  if (!undoResetItemProgressToast) {
    undoResetItemProgressToast = f7.toast.create({
      text: "Прогресс сброшен",
      closeTimeout: 5000,
      closeButton: true,
      closeButtonText: "Отменить",
      on: {
        closeButtonClick() {
          emit("undoResetItemProgress", dataToUndoReset);
        },
      },
    });
  }
  undoResetItemProgressToast.open();
};

onUnmounted(() => {
  if (undoDeleteToast) {
    undoDeleteToast.destroy();
  }
  if (undoResetItemProgressToast) {
    undoResetItemProgressToast.destroy();
  }
});
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
  /* transform: translateY(-100%); */
  transform: translateX(-40%);
}

/* Обеспечиваем плавное схлопывание высоты */
.favorite-item-leave-active {
  position: absolute;
  width: 100%;
  z-index: -1;
}
</style>
