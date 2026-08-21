<template>
  <f7-toolbar
    ref="searchNavToolbar"
    class="search-navigation-toolbar"
    bottom
    hidden
  >
    <div class="header">
      <f7-link class="side-link" icon-only href="#" @click="emit('openList')">
        <SvgIcon icon="search" color="baige-60" />
      </f7-link>

      <div class="nav-controls">
        <f7-link icon-only href="#" @click="emit('prev')">
          <SvgIcon icon="shevron-left" :size="32" color="baige-60" />
        </f7-link>
        <div class="match-counter">{{ currentNumber }} из {{ total }}</div>
        <f7-link icon-only href="#" @click="emit('next')">
          <SvgIcon icon="shevron-right" :size="32" color="baige-60" />
        </f7-link>
      </div>

      <f7-link class="side-link" icon-only href="#" @click="emit('closeSearch')">
        <SvgIcon icon="cancel" :size="20" color="baige-60" />
      </f7-link>
    </div>
  </f7-toolbar>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, useTemplateRef, type ComponentPublicInstance } from "vue";
import { f7 } from "framework7-vue";
import SvgIcon from "@/components/SvgIcon.vue";

interface Props {
  currentIndex: number; // 0-based индекс текущего результата
  total: number;
  isHidden: boolean;
}

interface Emits {
  (e: "next"): void;
  (e: "prev"): void;
  (e: "openList"): void;
  (e: "closeSearch"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const currentNumber = computed(() => (props.currentIndex >= 0 ? props.currentIndex + 1 : 0));

const searchNavToolbar = useTemplateRef<ComponentPublicInstance>("searchNavToolbar");

const applyVisibility = (isHidden: boolean) => {
  if (!searchNavToolbar.value) return;
  const toolbarEl = searchNavToolbar.value.$el;
  if (isHidden) {
    f7.toolbar.hide(toolbarEl, true);
  } else {
    f7.toolbar.show(toolbarEl, true);
  }
};

watch(() => props.isHidden, applyVisibility);
onMounted(() => applyVisibility(props.isHidden));
</script>

<style scoped lang="less">
.search-navigation-toolbar {
  --f7-toolbar-height: calc(40px + var(--f7-safe-area-bottom));
  --f7-toolbar-bg-color: var(--f7-bars-bg-color);
  --f7-toolbar-border-color: var(--f7-bars-border-color);
  --f7-link-touch-ripple-color: rgba(255, 255, 255, 0.15);

  :deep(.toolbar-inner) {
    padding: 0 16px;
  }

  .header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .side-link {
    width: 24px;
    height: 24px;
    padding: 0;
    flex-shrink: 0;
  }

  .nav-controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .match-counter {
    min-width: 72px;
    text-align: center;
    font-size: 14px;
    line-height: 130%;
    letter-spacing: 0.05em;
    color: var(--content-color-baige-60);
  }

  &.theme-dark {
    .match-counter {
      color: var(--content-color-baige-90);
    }
  }
}
</style>
