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
        v-for="item in favorites"
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
          <f7-swipeout-button close @click="resetItem(item)">
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
import { ref, watchEffect, computed } from "vue";
import { f7 } from "framework7-vue";
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
  favorites,
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
  resetItem: [item: FavoriteItem];
}>();

const deleteItem = (item: FavoriteItem) => {
  emit("deleteItem", item);
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
  emit("resetItem", item);
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
