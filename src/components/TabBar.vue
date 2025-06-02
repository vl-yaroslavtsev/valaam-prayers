<template>
  <f7-toolbar tabbar icons bottom>
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
</style>
