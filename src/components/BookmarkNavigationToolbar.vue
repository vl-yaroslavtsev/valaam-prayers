<template>
  <f7-toolbar
    ref="bookmarkNavToolbar"
    class="bookmark-navigation-toolbar"
    bottom
    hidden
  >
    <div class="header">
      <f7-link class="side-link" icon-only href="#" @click="emit('openList')">
        <SvgIcon icon="bookmark" :color="iconColor" />
      </f7-link>

      <div class="nav-controls">
        <f7-link icon-only href="#" @click="emit('prev')">
          <SvgIcon icon="chevron-left" :color="iconColor" />
        </f7-link>
        <div class="bookmark-counter">{{ currentNumber }} из {{ total }}</div>
        <f7-link icon-only href="#" @click="emit('next')">
          <SvgIcon icon="chevron-right" :color="iconColor" />
        </f7-link>
      </div>

      <f7-link class="side-link" icon-only href="#" @click="emit('close')">
        <SvgIcon icon="cancel" :size="20" :color="iconColor" />
      </f7-link>
    </div>
  </f7-toolbar>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, useTemplateRef, type ComponentPublicInstance } from "vue";
import { f7 } from "framework7-vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";

interface Props {
  currentIndex: number; // 0-based индекс текущей закладки
  total: number;
  isHidden: boolean;
}

interface Emits {
  (e: "next"): void;
  (e: "prev"): void;
  (e: "openList"): void;
  (e: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const currentNumber = computed(() => (props.currentIndex >= 0 ? props.currentIndex + 1 : 0));

const bookmarkNavToolbar = useTemplateRef<ComponentPublicInstance>("bookmarkNavToolbar");

const { isDarkMode } = useTheme();
const iconColor = computed(() => (isDarkMode.value ? "baige-60" : "black-40"));

const applyVisibility = (isHidden: boolean) => {
  if (!bookmarkNavToolbar.value) return;
  const toolbarEl = bookmarkNavToolbar.value.$el;
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
.bookmark-navigation-toolbar {
  --f7-toolbar-height: calc(40px + var(--f7-safe-area-bottom));
  --f7-link-touch-ripple-color: rgba(255, 255, 255, 0.15);
  --bookmark-counter-color: var(--content-color-black-60);

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

  .bookmark-counter {
    min-width: 72px;
    text-align: center;
    font-size: 14px;
    line-height: 130%;
    letter-spacing: 0.05em;
    color: var(--bookmark-counter-color);
  }

  &.theme-dark {
    .bookmark-counter {
      color: var(--content-color-baige-90);
    }
  }
}

:global(.dark .bookmark-navigation-toolbar) {
  --bookmark-counter-color: var(--content-color-baige-60);
}
</style>
