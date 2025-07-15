<template>
  <!-- searchAll,-->
  <f7-list
    :class="['prayers', cssClass, {'skeleton-text skeleton-effect-wave': isLoading}]"
    ref="list"
    virtual-list
    :virtual-list-params="{
      items: isLoading ? skeletonItems : items,
      renderExternal,
      height: getRowHeight,
    }"
  >
    <f7-list-item
      v-if="isLoading"
      v-for="item in vlData.items"
      :key="item"
      title="__________________________________________"
      link="#"
      :style="`top: ${vlData.topPosition}px`"
      class="no-ripple"
    ></f7-list-item>
    <f7-list-item
      v-if="!isLoading"
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
          <SvgIcon icon="share" :color="isDarkMode ? 'baige-900' : 'black-600'" />
        </f7-swipeout-button>
        <f7-swipeout-button
          close
          v-if="item.progress && item.pages"
          @click="resetItem(item)"
        >
          <SvgIcon :color="isDarkMode ? 'baige-900' : 'black-600'" icon="reset" />
        </f7-swipeout-button>
        <f7-swipeout-button
          close
          v-if="!isSection(item.id, item.url)"
          @click="toggleFavorite(item)"
        >
          <SvgIcon :icon="isFavorite(item.id) ? 'favorite-filled' : 'favorite'" :size="27" color="primary-accent-50" />
        </f7-swipeout-button>
      </f7-swipeout-actions>
    </f7-list-item>
  </f7-list>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, useTemplateRef, ComponentPublicInstance } from "vue";
import type { VirtualList, Toast } from "framework7/types";
import { f7 } from "framework7-vue";
import { storeToRefs } from "pinia";

import { useTheme } from "@/composables/useTheme";
import { useUndoToast } from "@/composables/useUndoToast";

import type { Lang } from "@/types/common";

import LanguageBadges from "./LanguageBadges.vue";
import PrayersListProgress from "./PrayersListProgress.vue";
import SvgIcon from "@/components/SvgIcon.vue";

import { usePrayersStore } from "@/stores/prayers";
import { useFavoritesStore } from "@/stores/favorites";
import { useInfoToast } from "@/composables/useInfoToast";
import { useSwipeoutEdgeGuard, swipeoutClearCache } from "@/composables/useSwipeout";
import { useComponentsStore } from "@/stores/components";

interface PrayerListItem {
  id: string;
  name: string;
  url: string;
  lang?: Lang[];
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
  isLoading = false,
} = defineProps<{
  prayers: PrayerListItem[];
  query: string;
  cssClass?: string;
  isLoading?: boolean;
}>();

// Events
const emit = defineEmits<{
  resetItemProgress: [id: string];
  undoResetItemProgress: [];
}>();


const { getComponent }  = useComponentsStore();

const vlData = ref<VirtualListData>({
  items: [],
});

let f7VirtualList: VirtualList.VirtualList;

const renderExternal = (vl: VirtualList.VirtualList, data: VirtualListData) => {
  // console.log("renderExternal", vl, data);
  f7VirtualList = vl;
  vlData.value = data;
};

const skeletonItems = [1,2,3];

watch(
  [() => items, () => isLoading],
  () => {
    console.log("watch items", items, isLoading);
    if (f7VirtualList) {
      if (isLoading) {
        f7VirtualList.replaceAllItems(skeletonItems);
        return;
      }
      f7VirtualList.replaceAllItems(items);
      if (query) {
        f7VirtualList.filterItems(searchAll(query, items));
      }
    }
  }
);

const getRowHeight = (item: PrayerListItem) => {
  if (isLoading) {
    return 62;
  }

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
  if (!listRef.value) return;
  
  listRef.value.$el.addEventListener("swipeout:closed", (e: Event) => {
    const swipeoutEl = e.target as HTMLElement;
    swipeoutClearCache(swipeoutEl);
    emit("resetItemProgress", item.id);
    showUndoResetItemProgressToast();
  }, { once: true });
};

const listRef = useTemplateRef<ComponentPublicInstance>("list");
useSwipeoutEdgeGuard(() => listRef.value?.$el);

const shareItem = (item: PrayerListItem, $event: Event) => {
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

const { showUndoToast: showUndoResetItemProgressToast } = useUndoToast({
  text: "Прогресс сброшен",
  onUndo: () => {
    emit("undoResetItemProgress");
  },
});

const { isSection } = usePrayersStore();

const { addFavorite, deleteFavorite, isFavorite } = useFavoritesStore();

const { showInfoToast: showAddedToFavoritesToast } = useInfoToast({
  text: "Добавлено на главный экран",
});

const { showInfoToast: showRemovedFromFavoritesToast } = useInfoToast({
  text: "Удалено с главного экрана",
});

const toggleFavorite = async (item: PrayerListItem) => {
  if (isFavorite(item.id)) {
    await deleteFavorite(item.id);
    showRemovedFromFavoritesToast();
  } else {
    await addFavorite(item.id, "prayers");
    showAddedToFavoritesToast();
  }
};
</script>

<style scoped lang="less">
:deep(.item-inner) {
  transition: padding;
  transition-duration: 300ms;
}
</style>
