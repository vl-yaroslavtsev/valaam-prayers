<template>
  <f7-list :class="`prayers ${cssClass}`">
    <f7-list-item
      :class="{ 'has-progress': !!item.progress }"
      swipeout
      v-for="item in items"
      :key="item.id"
      :title="item.name"
      :link="item.url"
      :data-id="item.id"
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
          @click="resetItem(item)"
          v-if="item.progress && item.pages"
        >
          <ResetIcon :color="isDarkMode ? 'baige-900' : 'black-600'"
        /></f7-swipeout-button>
        <!-- <f7-swipeout-button @click="deleteItem(item)">
            <DeleteIcon color="primary-accent-50" />
          </f7-swipeout-button> -->
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
import { ref } from "vue";
import { f7 } from "framework7-vue";
import { useTheme } from "@/composables/useTheme";
import { useUndoToast } from "@/composables/useUndoToast";

import ResetIcon from "@/components/icons/ResetIcon.vue";
import ShareIcon from "@/components/icons/ShareIcon.vue";
import LanguageBadges from "./LanguageBadges.vue";
import SharePopover from "@/components/SharePopover.vue";
import PrayersListProgress from "./PrayersListProgress.vue";

interface PrayerListItem {
  id: string;
  name: string;
  url: string;
  lang?: Array<"ру" | "цс" | "гр">;
  progress?: number;
  pages?: number;
}
// Props
const { prayers: items, cssClass = "" } = defineProps<{
  prayers: PrayerListItem[];
  cssClass?: string;
}>();

// Events
const emit = defineEmits<{
  resetItemProgress: [id: string];
  undoResetItemProgress: [];
}>();

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
</script>

<style scoped lang="less">
:deep(.item-inner) {
  transition: padding;
  transition-duration: 600ms;
}
</style>
