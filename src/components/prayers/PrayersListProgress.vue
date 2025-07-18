<template>
  <Transition name="fade">
    <div class="item-progress" v-if="progress && pages">
      <f7-progressbar :progress="Math.round(progress * 100)" v-if="!loading" />
      <div class="skeleton-text" v-if="loading">
        _____________________
      </div>
      <div class="progress-text" v-else>
        {{ Math.ceil(progress * pages) || 1 }} из
        {{ pages }} страниц
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  progress?: number;
  pages?: number;
  loading?: boolean;
}

defineProps<Props>();
</script>

<style scoped lang="less">
.item-progress {
  --list-item-progress-color: var(--content-color-black-40);
  
  --f7-progressbar-height: 1px;
  --f7-progressbar-progress-color:  var(--list-item-progress-color);
  --f7-progressbar-bg-color: transparent; /*rgba(255, 255, 255, 0.1);*/


  position: absolute;
  right: calc(var(--f7-list-chevron-icon-area) + var(--f7-list-item-padding-horizontal) + var(--f7-safe-area-right));
  bottom: var(--f7-list-item-padding-vertical);
  left: 0;

  transition: transform 300ms;

  .progress-text {
    font-weight: 400;
    font-size: var(--mobile-main-text-regular-b3);
    line-height: var(--mobile-main-text-regular-b3-line-height);
    color: var(--list-item-progress-color);
    text-transform: lowercase;
    margin-top: 2px;
  }
}

.dark {
  .item-progress {
    --list-item-progress-color: var(--content-color-baige-40);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style> 