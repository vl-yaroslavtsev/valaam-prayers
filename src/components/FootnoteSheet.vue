<template>
  <f7-sheet
    v-model:opened="opened"
    class="footnote-sheet"
    bottom
    backdrop
    close-by-backdrop-click
    swipe-to-close
    swipe-handler=".swipe-handler"
  >
    <div class="swipe-handler"></div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="footnote-sheet__body" v-html="html" @click="onBodyClick"></div>
  </f7-sheet>
</template>

<script setup lang="ts">
import { textActionFromEvent } from "@/text-processing-v3/readingAnnotations";

const opened = defineModel<boolean>("opened", { default: false });

defineProps<{
  html: string;
}>();

const emit = defineEmits<{
  anchor: [id: string];
}>();

const onBodyClick = (event: MouseEvent) => {
  const action = textActionFromEvent(event);
  if (action?.type !== "anchor") return;
  event.preventDefault();
  event.stopPropagation();
  opened.value = false;
  emit("anchor", action.id);
};
</script>

<style lang="less">
.footnote-sheet {
  --f7-sheet-height: auto;
  --footnote-sheet-bg: var(--content-color-baige-100);
  --footnote-sheet-text: var(--content-color-black-primary);
  --f7-sheet-bg-color: var(--footnote-sheet-bg);
  background: var(--footnote-sheet-bg);
  color: var(--footnote-sheet-text);

  &.sheet-modal {
    max-height: 70%;
  }

  .sheet-modal-inner {
    display: flex;
    flex-direction: column;
    height: auto;
    max-height: inherit;
    min-height: 0;
  }

  &__body {
    box-sizing: border-box;
    overflow-y: auto;
    padding: 36px 20px calc(24px + var(--f7-safe-area-bottom));
    font-size: 16px;
    line-height: 22px;
    hyphens: manual;

    p {
      margin: 0 0 12px;
    }

    p:last-child {
      margin-bottom: 0;
    }

    a {
      color: var(--brand-color-primary-accent-50);
    }
  }
}

.dark .footnote-sheet {
  --footnote-sheet-bg: var(--content-color-black-primary);
  --footnote-sheet-text: var(--content-color-baige-90);
}
</style>
