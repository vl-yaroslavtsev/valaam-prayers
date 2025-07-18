<template>
  <f7-toolbar tabbar icons bottom class="bottom-menu" ref="toolbar">
    <f7-link tab-link="#view-home" tab-link-active
      ><SvgIcon icon="home" :color="getColor('home')" :size="48"/></f7-link>

    <f7-link tab-link="#view-prayers">
      <SvgIcon icon="molitvoslov" :color="getColor('prayers')" :size="48"/>
    </f7-link>

    <f7-link tab-link="#view-calendar">
      <SvgIcon icon="calendar" :color="getColor('calendar')" :size="48"/>
    </f7-link>

    <f7-link tab-link="#view-books">
      <SvgIcon icon="books" :color="getColor('books')" :size="48"/>
    </f7-link>

    <f7-link tab-link="#view-rites">
      <SvgIcon icon="rites" :color="getColor('rites')" :size="48"/>
    </f7-link>
  </f7-toolbar>
</template>

<script setup lang="ts">
// Импорт всех SVG иконок
import SvgIcon from "@/components/SvgIcon.vue";
import { setCSSVariable } from "@/js/utils";
import { useTemplateRef } from "vue";

export interface Toolbar {
  hide: (animate?: boolean) => void;
  show: (animate?: boolean) => void;
}

const { activeTab } = defineProps<{
  activeTab: string;
}>();

const toolbarRef = useTemplateRef<Toolbar>("toolbar");

const show = (animate?: boolean) => {
  toolbarRef.value?.show(animate);
  setCSSVariable("--bottom-tabbar-shown", "1");
};
const hide = (animate?: boolean) => {
  toolbarRef.value?.hide(animate);
  setCSSVariable("--bottom-tabbar-shown", "0");
};

defineExpose({
  show,
  hide,
});

const getColor = (tab: string) => (activeTab === tab ? "white" : "baige-60");
</script>

<style scoped lang="less">
.bottom-menu {
  --f7-toolbar-bg-color: var(--content-color-black-primary);
  --f7-tabbar-link-active-bg-color: transparent; // var(--content-color-black-primary);

  --f7-tabbar-icons-height: calc(83px - var(--f7-safe-area-bottom));
  --f7-tabbar-icons-tablet-height: calc(83px - var(--f7-safe-area-bottom));

  --f7-link-touch-ripple-color: rgba(255, 255, 255, 0.15);
  --f7-tabbar-link-active-color: var(--content-color-white-100);
  --f7-tabbar-link-inactive-color: var(--content-color-baige-60);

  backdrop-filter: blur(50px);
  box-shadow: 0 -0px 0 0 rgba(0, 0, 0, 0.3);
}

.dark {
  .bottom-menu {
    --f7-toolbar-bg-color: var(--content-color-baige-5-no-opacity); //var(--content-color-baige-5); //var(--content-color-black-primary);
  }
}
</style>
