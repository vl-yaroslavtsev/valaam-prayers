<template>
  <f7-popup
    :tablet-fullscreen="true"
    v-model:opened="isOpened"
    @popup:opened="onPopupOpened"
  >
    <f7-page>
      <f7-navbar>
        <f7-nav-left>
          <f7-link icon="icon-back" @click="isOpened = false" />
        </f7-nav-left>
        <f7-searchbar
          ref="searchbarRef"
          class="search-page-searchbar"
          custom-search
          :disable-button="false"
          placeholder="Поиск по тексту"
          v-model:value="query"
        />
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
          :style="`top: ${vlData.topPosition}px`"
          @click.prevent="selectMatch(match.id)"
        >
          <span class="search-result-snippet"
            >{{ match.snippet.slice(0, match.matchStart) }}<mark>{{
              match.snippet.slice(match.matchStart, match.matchStart + match.matchLength)
            }}</mark>{{ match.snippet.slice(match.matchStart + match.matchLength) }}</span
          >
        </f7-list-item>
      </f7-list>
      <f7-block v-else-if="query.trim().length > 0" class="search-empty-state">
        <p>Совпадений не найдено</p>
      </f7-block>
    </f7-page>
  </f7-popup>
</template>

<script setup lang="ts">
import { ref, nextTick, useTemplateRef, type ComponentPublicInstance } from "vue";
import type { VirtualList } from "framework7/types";
import type { SearchMatch } from "@/text-processing";

const { matches = [] } = defineProps<{
  matches: SearchMatch[];
}>();

const isOpened = defineModel<boolean>("isOpened", { default: false });
const query = defineModel<string>("query", { default: "" });

const emit = defineEmits<{
  selectMatch: [id: number];
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

const renderExternal = (vl: VirtualList.VirtualList, data: VirtualListData) => {
  vlData.value = data;
};

const selectMatch = (id: number) => {
  emit("selectMatch", id);
};

const searchbarRef = useTemplateRef<ComponentPublicInstance>("searchbarRef");

const onPopupOpened = () => {
  nextTick(() => {
    const inputEl = searchbarRef.value?.$el?.querySelector("input");
    inputEl?.focus();
  });
};
</script>

<style scoped lang="less">
.search-results-list {
  margin: 0;
}

.search-result-snippet {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  line-height: 1.3em;

  mark {
    background-color: var(--brand-color-primary-accent-70, #ffe08a);
    color: inherit;
    border-radius: 2px;
  }
}

.search-empty-state {
  text-align: center;
  color: var(--content-color-black-40);
}
</style>
