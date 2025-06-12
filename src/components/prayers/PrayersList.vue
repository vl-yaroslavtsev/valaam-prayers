<template>
  <!-- searchAll,-->
  <f7-list
    :class="`prayers ${cssClass}`"
    virtual-list
    :virtual-list-params="{
      items,
      renderExternal,
      height: getRowHeight,
    }"
  >
    <f7-list-item
      :class="{ 'has-progress': !!item.progress }"
      swipeout
      v-for="item in vlData.items"
      :key="item.id"
      :title="item.name"
      :link="item.url"
      :style="`top: ${vlData.topPosition}px`"
    >
      <template #inner>
        <PrayersListProgress :progress="item.progress" :pages="item.pages" />
      </template>
      <template #after>
        <LanguageBadges :languages="item.lang" />
      </template>
      <f7-swipeout-actions right>
        <f7-swipeout-button close @click="shareItem(item, $event)">
          <ShareIcon :color="isDarkMode ? 'baige-900' : 'black-600'" />
        </f7-swipeout-button>
        <f7-swipeout-button
          close
          v-if="item.progress && item.pages"
          @click="resetItem(item)"
        >
          <ResetIcon :color="isDarkMode ? 'baige-900' : 'black-600'"
        /></f7-swipeout-button>
        <f7-swipeout-button
          close
          v-if="!isSection(item.id, item.url)"
          @click="toggleFavorite(item)"
        >
          <FavoriteFillIcon
            v-if="isFavorite(item.id)"
            :size="27"
            color="primary-accent-50"
          />
          <FavoriteIcon v-else :size="27" color="primary-accent-50" />
        </f7-swipeout-button>
      </f7-swipeout-actions>
    </f7-list-item>
  </f7-list>
  <SharePopover
    :item="{ title: sharedItem?.name || '', url: sharedItem?.url || '' }"
    :target-el="sharedTargetEl"
    v-model="isSharedOpened"
  />
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import type { VirtualList, Toast } from "framework7/types";
import { f7 } from "framework7-vue";

import { useTheme } from "@/composables/useTheme";
import { useUndoToast } from "@/composables/useUndoToast";

import ResetIcon from "@/components/icons/ResetIcon.vue";
import ShareIcon from "@/components/icons/ShareIcon.vue";
import FavoriteFillIcon from "@/components/icons/FavoriteFillIcon.vue";
import FavoriteIcon from "@/components/icons/FavoriteIcon.vue";

import LanguageBadges from "./LanguageBadges.vue";
import SharePopover from "@/components/SharePopover.vue";
import PrayersListProgress from "./PrayersListProgress.vue";

import { usePrayersStore } from "@/stores/prayers";
import { useFavoritesStore } from "@/stores/favorites";
import { useInfoToast } from "@/composables/useInfoToast";

interface PrayerListItem {
  id: string;
  name: string;
  url: string;
  lang?: Array<"ру" | "цс" | "гр">;
  progress?: number;
  pages?: number;
}

interface VirtualListData {
  fromIndex?: number;
  toIndex?: number;
  listHeight?: number;
  topPosition?: number;
  items: PrayerListItem[];
}
// Props
const {
  prayers: items,
  cssClass = "",
  query = "",
} = defineProps<{
  prayers: PrayerListItem[];
  query: string;
  cssClass?: string;
}>();

// Events
const emit = defineEmits<{
  resetItemProgress: [id: string];
  undoResetItemProgress: [];
}>();

const vlData = ref<VirtualListData>({
  items: [],
});

let f7VirtualList: VirtualList.VirtualList;

const renderExternal = (vl: VirtualList.VirtualList, data: VirtualListData) => {
  // console.log("renderExternal", vl, data);
  f7VirtualList = vl;
  vlData.value = data;
};

watch(
  () => items,
  () => {
    // console.log("watch items", items);
    if (f7VirtualList) {
      f7VirtualList.replaceAllItems(items);
      if (query) {
        f7VirtualList.filterItems(searchAll(query, items));
      }
    }
  }
);

const getRowHeight = (item: PrayerListItem) => {
  const longName = item.name.length > 26;
  const hasProgress = !!item.progress;

  if (longName && hasProgress) {
    return 96;
  }
  if (hasProgress) {
    return 76;
  }
  if (longName) {
    return 66;
  }

  return 62;
};

watch(
  () => query,
  (newQuery, oldQuery) => {
    console.log("watch query = ", newQuery, oldQuery);

    if (!f7VirtualList) {
      return;
    }

    if (oldQuery && !newQuery) {
      f7VirtualList.resetFilter();
      return;
    }

    if (newQuery) {
      f7VirtualList.filterItems(searchAll(newQuery, f7VirtualList.items));
    }
  }
);

const searchAll = (query: string, items: PrayerListItem[]) => {
  const found = [];
  const lowerQuery = query.toLowerCase();

  for (let i = 0; i < items.length; i += 1) {
    const name = items[i].name.toLowerCase();
    if (name.indexOf(lowerQuery) >= 0) found.push(i);
  }
  return found; // return array with matched indexes
};

const { isDarkMode } = useTheme();

const resetItem = (item: PrayerListItem) => {
  emit("resetItemProgress", item.id);
  showUndoResetItemProgressToast();
};

const sharedTargetEl = ref<Element | undefined>(undefined);

const isSharedOpened = ref(false);

const sharedItem = ref<PrayerListItem | null>(null);

const shareItem = (item: PrayerListItem, $event: Event) => {
  sharedTargetEl.value = ($event.target as HTMLElement)
    ?.closest("li")
    ?.querySelector(".item-title") as HTMLElement;
  sharedItem.value = item;
  isSharedOpened.value = true;
};

const { showUndoToast: showUndoResetItemProgressToast } = useUndoToast({
  text: "Прогресс сброшен",
  onUndo: () => {
    emit("undoResetItemProgress");
  },
});

const { isSection } = usePrayersStore();

const { addFavorite, deleteFavorite, isFavorite } = useFavoritesStore();

const { showInfoToast: showAddedToFavoritesToast } = useInfoToast({
  text: "Элемент добавлен на главный экран",
});

const { showInfoToast: showRemovedFromFavoritesToast } = useInfoToast({
  text: "Элемент удален с главного экрана",
});

const toggleFavorite = (item: PrayerListItem) => {
  if (isFavorite(item.id)) {
    deleteFavorite(item.id);
    showRemovedFromFavoritesToast();
  } else {
    addFavorite(item.id, "prayers");
    showAddedToFavoritesToast();
  }
};
</script>

<style scoped lang="less">
:deep(.item-inner) {
  transition: padding;
  transition-duration: 600ms;
}
</style>
