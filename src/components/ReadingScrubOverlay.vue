<template>
  <!-- Пока протяжка ползунка не устоялась, реальный переход отложен —
       закрываем текст фоном текущей темы чтения (не сам reading-text,
       у которого горизонтальный режим рендерит слайды через Shadow DOM) -->
  <div v-if="isPageScrubbing" class="page-scrub-overlay" :class="`theme-${textTheme}`"></div>
  <!-- Подзаголовок текущей страницы слайдера — как в large title navbar -->
  <div
    v-if="isSliderScrubbing && subtitle.length"
    class="page-scrub-heading"
    :class="`theme-${textTheme}`"
  >
    <div
      class="page-scrub-subtitle"
      :class="{ 'lang-cs': currentLanguage === 'cs' }"
    >
      <span
        v-for="(item, index) in subtitle"
        :key="index"
        class="page-scrub-subtitle-item"
      >{{ item }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Language } from "@/types/common";

defineProps<{
  isPageScrubbing: boolean;
  isSliderScrubbing: boolean;
  subtitle: readonly string[];
  textTheme: string;
  currentLanguage: Language | null;
}>();
</script>

<style scoped lang="less">
.page-scrub-overlay {
  position: absolute;
  top: var(--f7-safe-area-top);
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
}

.page-scrub-heading {
  position: absolute;
  top: var(--f7-safe-area-top);
  left: 0;
  right: 0;
  z-index: 7;
  padding: 4px 12px 4px;
  pointer-events: none;
  background-color: var(--reading-text-background-color);
}

.page-scrub-subtitle {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  font-size: 16px;
  font-weight: 400;
  line-height: 130%;
  color: var(--reading-text-subtitle-color);
  hyphens: none;

  &.lang-cs {
    font-family: "Triodion Unicode";
  }
}

.page-scrub-subtitle-item:not(:first-child) {
  white-space: nowrap;
}

.page-scrub-subtitle-item:not(:first-child)::before {
  content: "";
  display: inline-block;
  width: 5px;
  height: 5px;
  margin: 0 7.5px;
  border-radius: 50%;
  background-color: var(--reading-text-subtitle-color);
  vertical-align: middle;
}
</style>
