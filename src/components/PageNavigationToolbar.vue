<template>
  <f7-toolbar 
    ref="pageNavToolbar"
    class="page-navigation-toolbar"
    bottom
    hidden
  >
    <div class="header">
      <f7-link 
        class="reset-link" 
        icon-only 
        href="#"
        @click="handleResetProgress"
      >
        <SvgIcon icon="reset" color="baige-60" />
      </f7-link>
      
      <div class="page-counter">
        {{ currentPage }} из {{ totalPages }}
      </div>
    </div>
      
    <f7-range
      v-if="!isHidden"
      class="page-range-slider"
      :min="1"
      :max="totalPages"
      :step="1"
      @range:change="handlePageSliderChange"
      @touchstart.passive="handlePageSliderTouchStart"
      @touchend.passive="handlePageSliderTouchEnd"
      :value="currentPage"          
    />
  </f7-toolbar>
</template>

<script setup lang="ts">
import { ref, computed, watch, useTemplateRef, type ComponentPublicInstance } from "vue";
import { f7 } from "framework7-vue";
import SvgIcon from "@/components/SvgIcon.vue";

interface Props {
  currentPage: number;
  totalPages: number;
  isHidden: boolean;
}

interface Emits {
  (e: 'page-change', value: number): void;
  (e: 'reset-progress'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const pageNavToolbar = useTemplateRef<ComponentPublicInstance>("pageNavToolbar");

// Показать/скрыть тулбар
watch(() => props.isHidden, (isHidden) => {
  if (!pageNavToolbar.value) return;
  const pageNavToolbarEl = pageNavToolbar.value.$el;
  if (isHidden) {
    f7.toolbar.hide(pageNavToolbarEl, true);
  } else {
    f7.toolbar.show(pageNavToolbarEl, true);
  }
});

let pageSliderTouching = false;

const handlePageSliderTouchStart = (event: TouchEvent) => {
  pageSliderTouching = true;
};

const handlePageSliderTouchEnd = (event: TouchEvent) => {
  pageSliderTouching = false;
};

// Обработчик изменения слайдера страниц
const handlePageSliderChange = (value: number) => {
  if (!pageSliderTouching) {
    return;
  }

  emit('page-change', value);
};

const handleResetProgress = () => {
  emit('reset-progress');
};
</script>

<style scoped lang="less">
.page-navigation-toolbar {
  --f7-toolbar-height: calc(70px + var(--f7-safe-area-bottom));
  --f7-toolbar-bg-color: var(--f7-bars-bg-color);
  --f7-toolbar-border-color: var(--f7-bars-border-color);
  --f7-link-touch-ripple-color: rgba(255, 255, 255, 0.15);
  
  :deep(.toolbar-inner) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    padding: 8px 16px;
    gap: 8px;
  }

  .header {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 10px;
    height: 24px;
    width: 100%;
    position: relative;
  }

  .reset-link {
    position: absolute;
    right: 0;
    left: 0;
    width: 24px;
    height: 24px;
    padding: 0;
  }
  
  .page-counter {
    font-size: 14px;
    line-height: 130%;
    letter-spacing: 0.05em;
    color: var(--content-color-baige-60);
    text-align: center;
  }
  
  .page-range-slider {
    width: 100%;
    --f7-range-bar-bg-color: var(--content-color-baige-30);
    --f7-range-bar-active-bg-color: var(--brand-color-primary-accent-50);
    --f7-range-knob-color: var(--brand-color-primary-accent-50);
  }
  
  &.theme-dark {
    .page-counter {
      color: var(--content-color-baige-90);
    }
  }
}
</style>