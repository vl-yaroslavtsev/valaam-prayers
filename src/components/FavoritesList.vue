<template>
  <f7-list
    class="prayers"
    :sortable="sortable"
    :sortable-tap-hold="sortable"
    @sortable:enable="onSortableEnabled"
    @sortable:disable="onSortableDisabled"
  >
    <TransitionGroup name="favorite-item" tag="ul">
      <f7-list-item
        swipeout
        v-for="item in favorites"
        :key="item.id"
        :title="item.title"
        :link="item.url"
      >
        <template #root-start>
          <f7-link class="delete-handler" @click="deleteFavorite(item)">
            <DeleteIcon color="primary-accent-50" />
          </f7-link>
        </template>
        <template #after>
          <div class="lang-list">
            <div class="lang-item" v-for="lang in item.lang" :key="lang">
              {{ lang }}
            </div>
          </div>
        </template>
        <f7-swipeout-actions right v-if="!isSortableMode">
          <f7-swipeout-button>
            <ShareIcon :color="isDarkMode ? 'baige-900' : 'black-600'"
          /></f7-swipeout-button>
          <f7-swipeout-button>
            <ResetIcon :color="isDarkMode ? 'baige-900' : 'black-600'"
          /></f7-swipeout-button>
          <f7-swipeout-button @click="deleteFavorite(item)">
            <DeleteIcon color="primary-accent-50" />
          </f7-swipeout-button>
        </f7-swipeout-actions>
      </f7-list-item>
    </TransitionGroup>
  </f7-list>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { f7 } from "framework7-vue";
import { useTheme } from "@/composables/useTheme";
import DeleteIcon from "@/components/icons/DeleteIcon.vue";
import ResetIcon from "./icons/ResetIcon.vue";
import ShareIcon from "./icons/ShareIcon.vue";

export interface FavoriteItem {
  id: number;
  title: string;
  url: string;
  lang: Array<"ру" | "цс" | "гр">;
}

// Props
const { favorites, sortable = false } = defineProps<{
  favorites: FavoriteItem[];
  sortable?: boolean;
}>();

// Events
const emit = defineEmits<{
  deleteFavorite: [item: FavoriteItem];
  sortableModeToggle: [isSortableMode: boolean];
}>();

const deleteFavorite = (item: FavoriteItem) => {
  emit("deleteFavorite", item);
};

const { isDarkMode } = useTheme();

const isSortableMode = ref(false);

const onSortableEnabled = () => {
  isSortableMode.value = true;
  if (f7.params.touch) {
    f7.params.touch.tapHold = false;
  }
  emit("sortableModeToggle", true);
};

const onSortableDisabled = () => {
  isSortableMode.value = false;
  if (f7.params.touch) {
    f7.params.touch.tapHold = true;
  }
  emit("sortableModeToggle", false);
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
.lang-list {
  display: flex;
  gap: 18px;
}
.lang-item {
  display: flex;
  align-items: center;
  justify-content: center;

  border: 1px solid var(--list-item-lang-color);
  border-radius: 50px;
  width: 14px;
  height: 14px;
  color: var(--list-item-lang-color);
  font-weight: 700;
  font-size: 10px;
  line-height: 14px;
  text-align: center;
  text-transform: uppercase;
}
</style>
