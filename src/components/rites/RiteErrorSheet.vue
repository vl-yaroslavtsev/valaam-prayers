<template>
  <f7-sheet
    v-model:opened="opened"
    class="rite-error-sheet"
    bottom
    backdrop
    backdrop-el=".rite-popup .rite-sheet-backdrop"
    swipe-to-close
    swipe-handler=".swipe-handler"
  >
    <div class="swipe-handler"></div>
    <div class="rite-error-sheet__body">
      <span class="rite-error-sheet__icon" aria-hidden="true">!</span>
      <p class="rite-error-sheet__text">{{ text }}</p>
    </div>
  </f7-sheet>
</template>

<script setup lang="ts">
defineProps<{
  /** Полный текст ошибки поля */
  text: string;
}>();

const opened = defineModel<boolean>("opened", { default: false });
</script>

<style lang="less">
.rite-error-sheet {
  --f7-sheet-height: auto;
  // Записка красит текст в тёмный. Лист темнее, поэтому цвет берём у темы
  color: var(--f7-md-on-surface);

  &__body {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 44px 20px calc(28px + var(--f7-safe-area-bottom));
  }

  &__icon {
    display: flex;
    flex: 0 0 24px;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--red-r-100);
    font-size: 16px;
    line-height: 1;
    font-weight: 700;
    color: var(--content-color-white-100);
  }

  &__text {
    flex: 1;
    margin: 0;
    font-size: 16px;
    line-height: 24px;
  }
}
</style>
