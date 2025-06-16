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
import { useComponentsStore, Toolbar } from "@/stores/components";
import { onMounted, useTemplateRef } from "vue";

const { activeTab } = defineProps<{
  activeTab: string;
}>();

const getColor = (tab: string) => (activeTab === tab ? "white" : "baige-600");
const { register } = useComponentsStore();

const toolbarRef = useTemplateRef<Toolbar >("toolbar");

onMounted(() => {
  register('toolbar', toolbarRef.value);
})

</script>

<style scoped lang="less">
.bottom-menu {
  --f7-toolbar-bg-color: var(--content-color-black-primary);
  --f7-tabbar-link-active-bg-color: var(--content-color-black-primary);

  --f7-tabbar-icons-height: 83px;
  --f7-tabbar-icons-tablet-height: 83px;

  --f7-link-touch-ripple-color: rgba(255, 255, 255, 0.15);
  --f7-tabbar-link-active-color: var(--content-color-white-100);
  --f7-tabbar-link-inactive-color: var(--content-color-baige-600);

  backdrop-filter: blur(50px);
  box-shadow: 0 -0px 0 0 rgba(0, 0, 0, 0.3);
}

.dark {
  .bottom-menu {
    --f7-toolbar-bg-color: var(--content-color-black-primary);
    --f7-tabbar-link-active-bg-color: var(--content-color-black-primary);
  }
}
</style>
