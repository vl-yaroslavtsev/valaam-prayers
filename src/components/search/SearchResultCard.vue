<template>
  <!-- Переход по href выполняет роутер Framework7 (клики по <a> перехватываются им сами) -->
  <a class="search-card" :href="item.href">
    <div class="search-card__head">
      <div class="search-card__name" v-html="item.name"></div>
      <span class="search-card__arrow">
        <SvgIcon icon="chevron-right" :size="24" :color="isDarkMode ? 'baige-90' : 'black-primary'" />
      </span>
    </div>
    <div class="search-card__meta">
      <span class="search-card__type">{{ item.type_name }}</span>
      <span v-if="pathLabel" class="search-card__path">{{ pathLabel }}</span>
    </div>
    <div v-if="item.text" class="search-card__text" v-html="item.text"></div>
  </a>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";
import type { SearchItem } from "@/services/api/SearchApi";
import { formatSearchPath } from "./formatSearchPath";

const { item } = defineProps<{
  item: SearchItem;
}>();

const { isDarkMode } = useTheme();

const pathLabel = computed(() => formatSearchPath(item.path));
</script>

<style scoped lang="less">
.search-card {
  --search-card-title: var(--content-color-black-secondary);
  --search-card-meta: var(--content-color-black-60);
  --search-card-text: var(--content-color-black-40);

  display: block;
  padding: 0 6px 7px 15px;
  color: var(--search-card-title);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

:global(.dark .search-card) {
  --search-card-title: var(--content-color-baige-90);
  --search-card-meta: var(--content-color-baige-60);
  --search-card-text: var(--content-color-baige-40);
}

.search-card__head {
  display: flex;
  align-items: center;
  padding: 7px 0;
}

.search-card__name {
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  font-size: var(--mobile-main-text-bold-b2);
  line-height: var(--mobile-main-text-bold-b2-line-height);
  font-weight: 700;
  color: var(--search-card-title);
}

.search-card__arrow {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
}

.search-card__meta {
  display: flex;
  min-width: 0;
  margin-top: 13px;
  font-size: var(--mobile-main-text-regular-b3);
  line-height: var(--mobile-main-text-regular-b3-line-height);
  color: var(--search-card-title);
}

.search-card__type {
  flex: none;
  white-space: nowrap;
}

.search-card__path {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  // pre, а не nowrap: иначе ведущий пробел разделителя " * " у flex-элемента схлопывается
  white-space: pre;
  color: var(--search-card-meta);
}

.search-card__text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  margin-top: 10px;
  font-size: var(--mobile-main-text-regular-b3);
  line-height: var(--mobile-main-text-regular-b3-line-height);
  color: var(--search-card-text);
}

// <mark> приходит с сервера внутри v-html; браузерный жёлтый фон сбрасываем
.search-card__name :deep(mark),
.search-card__text :deep(mark) {
  background: transparent;
  color: var(--brand-color-primary-accent-50);
  font-weight: inherit;
}
</style>
