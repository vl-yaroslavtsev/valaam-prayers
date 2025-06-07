<template>
  <f7-toolbar tabbar icons bottom class="bottom-menu">
    <f7-link tab-link="#view-home" tab-link-active
      ><HomeIcon :color="getColor('home')"></HomeIcon>
    </f7-link>

    <f7-link tab-link="#view-prayers">
      <MolitvoslovIcon :color="getColor('prayers')"></MolitvoslovIcon>
    </f7-link>

    <f7-link tab-link="#view-calendar">
      <CalendarIcon :color="getColor('calendar')"></CalendarIcon>
    </f7-link>

    <f7-link tab-link="#view-books">
      <BooksIcon :color="getColor('books')"></BooksIcon>
    </f7-link>

    <f7-link tab-link="#view-rites">
      <RitesIcon :color="getColor('rites')"></RitesIcon>
    </f7-link>
  </f7-toolbar>
</template>

<script setup lang="ts">
// Импорт всех SVG иконок
import HomeIcon from "./icons/HomeIcon.vue";
import BooksIcon from "./icons/BooksIcon.vue";
import CalendarIcon from "./icons/CalendarIcon.vue";
import MolitvoslovIcon from "./icons/MolitvoslovIcon.vue";
import RitesIcon from "./icons/RitesIcon.vue";

const { activeTab } = defineProps<{
  activeTab: string
}>();

const getColor = (tab: string) =>
activeTab === tab ? "white" : "baige-600";
</script>

<style scoped lang="less">
.bottom-menu {
  --f7-toolbar-bg-color:  var(--content-color-black-primary);
  --f7-tabbar-link-active-bg-color: var(--content-color-black-primary);

  --f7-tabbar-icons-height: 83px;
  --f7-tabbar-icons-tablet-height: 83px;
  
  --f7-link-touch-ripple-color: rgba(255, 255, 255, 0.15);
  --f7-tabbar-link-active-color: var(--content-color-white-100);
  --f7-tabbar-link-inactive-color:  var(--content-color-baige-600);

  backdrop-filter: blur(50px);
  box-shadow: 0 -0px 0 0 rgba(0, 0, 0, 0.3);
}

.dark {
  .bottom-menu {
    --f7-toolbar-bg-color:  var(--content-color-black-primary);
    --f7-tabbar-link-active-bg-color: var(--content-color-black-primary);
  }
}
</style>
