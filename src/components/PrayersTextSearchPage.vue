<template>
  <!-- @popup:open="onPopupOpen" -->
  <f7-popup
    ref="popup"
    :tablet-fullscreen="true"
    v-model:opened="isOpened"
    @popup:opened="onPopupOpened"
  >
    <f7-page>
      <f7-navbar>
        <f7-nav-left>
          <f7-link icon="icon-back" @click="emit('closeSearch')" />
        </f7-nav-left>
        <f7-searchbar
          ref="searchbarRef"
          class="search-page-searchbar text-normal-case"
          custom-search
          :disable-button="false"
          placeholder="Поиск по тексту"
          v-model:value="query"
          backdrop="false"
        >
          <template #input-wrap-end>
            <span class="input-clear-button custom-button">
              <SvgIcon icon="cancel" color="baige-30" />
            </span>
          </template>
        </f7-searchbar>
      </f7-navbar>
      <f7-list
        v-if="matches.length > 0"
        class="search-results-list"
        virtual-list
        :virtual-list-params="{ items: matches, renderExternal, height: ITEM_HEIGHT }"
      >
        <f7-list-item
          v-for="match in vlData.items"
          :key="match.id"
          link="#"
          no-chevron
          :selected="match.id === activeMatchId"
          :style="`top: ${vlData.topPosition}px`"
          @click.prevent="selectMatch(match.id)"
        >
          <template #title>
            <span class="search-result-snippet"
              >{{ match.snippet.slice(0, match.matchStart) }}<mark>{{
                match.snippet.slice(match.matchStart, match.matchStart + match.matchLength)
              }}</mark>{{ match.snippet.slice(match.matchStart + match.matchLength) }}</span
            >
          </template>
          <template #after>
            <span class="search-result-page">{{ match.page }}</span>
          </template>
        </f7-list-item>
      </f7-list>
      <f7-block v-else-if="query.trim().length > 0" class="search-empty-state">
        <p>Совпадений не найдено</p>
      </f7-block>
    </f7-page>
  </f7-popup>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, useTemplateRef, type ComponentPublicInstance } from "vue";
import { f7 } from "framework7-vue";
import SvgIcon from "@/components/SvgIcon.vue";
import type { VirtualList } from "framework7/types";
import type { SearchMatch } from "@/text-processing";

const { matches = [], activeMatchId = null } = defineProps<{
  matches: SearchMatch[];
  activeMatchId?: number | null;
}>();

const isOpened = defineModel<boolean>("isOpened", { default: false });
const query = defineModel<string>("query", { default: "" });

const emit = defineEmits<{
  selectMatch: [id: number];
  closeSearch: [];
}>();

const ITEM_HEIGHT = 76;

interface VirtualListData {
  fromIndex?: number;
  toIndex?: number;
  listHeight?: number;
  topPosition?: number;
  items: SearchMatch[];
}

const vlData = ref<VirtualListData>({ items: [] });

let f7VirtualList: VirtualList.VirtualList | undefined;

const renderExternal = (vl: VirtualList.VirtualList, data: VirtualListData) => {
  f7VirtualList = vl;
  vlData.value = data;
};

// Virtual List читает items только при создании — при смене запроса нужно
// явно подменять массив, иначе на экране остаются старые совпадения.
watch(
  () => matches,
  (newMatches) => {
    if (!f7VirtualList?.el?.isConnected) {
      f7VirtualList = undefined;
      return;
    }
    f7VirtualList.replaceAllItems(newMatches);
  },
);

const popupRef = useTemplateRef<ComponentPublicInstance>("popup");

const selectMatch = (id: number) => {
  const popupEl = popupRef.value?.$el;
  if (popupEl) {
    f7.popup.close(popupEl, false);
  }
  isOpened.value = false;
  emit("selectMatch", id);
};

const searchbarRef = useTemplateRef<ComponentPublicInstance>("searchbarRef");

const scrollToActiveIfNeeded = () => {
  if (!isOpened.value || activeMatchId == null || !f7VirtualList?.el?.isConnected) return;

  const index = matches.findIndex((m) => m.id === activeMatchId);
  if (index < 0) return;

  const container = f7VirtualList.pageContentEl as HTMLElement | undefined;
  if (!container?.clientHeight) return;

  const selectedEl = container.querySelector(".item-selected") as HTMLElement | null;
  if (selectedEl) {
    const cRect = container.getBoundingClientRect();
    const eRect = selectedEl.getBoundingClientRect();
    const isAbove = eRect.top < cRect.top;
    const isBelow = eRect.bottom > cRect.bottom;
    if (!isAbove && !isBelow) return;
  }

  f7VirtualList.scrollToItem(index);
};

const onPopupOpened = () => {
  nextTick(() => {
    const inputEl = searchbarRef.value?.$el?.querySelector("input") as HTMLInputElement | undefined;
    inputEl?.focus({ preventScroll: true });
  });
};

watch(
  () => isOpened.value,
  (opened) => {
    if (opened) {
      nextTick(() => scrollToActiveIfNeeded());
    }
  },
);
</script>

<style scoped lang="less">
.search-results-list {
  margin: 0;
  --f7-list-item-after-padding: 16px;
  --f7-list-item-padding-vertical: 12px;

  :deep(.item-title) {
    white-space: normal;
    flex: 1;
    min-width: 0;
  }

  :deep(.item-selected),
  :deep(.item-selected .item-content) {
    background-color: var(--f7-treeview-selectable-selected-bg-color);
  }
}

.search-result-snippet {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  line-height: 1.3em;

  mark {
    color: var(--brand-color-primary-accent-50, #ffe08a);
    font-weight: 600;
    background-color: inherit;
  }
}

.search-result-page {
  flex-shrink: 0;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-size: var(--mobile-main-text-regular-b3);
  color: var(--treeview-children-label-text-color);
}

.search-empty-state {
  text-align: center;
  color: var(--content-color-black-40);
}

.search-page-searchbar {
  position: absolute;
  z-index: 0;

  :deep(.searchbar-icon) {
    display: none;
  }

  :deep(.searchbar-inner:after) {
    display: none;
  }
}
</style>
