<template>
  <f7-toolbar tabbar icons bottom>
    <f7-link
      tab-link="#view-main"
      tab-link-active
    >
      <div class="inline-icon icon-home" v-html="homeIcon"></div>
    </f7-link>
    
    <f7-link tab-link="#view-prayers">
      <div class="inline-icon icon-prayers" v-html="prayersIcon"></div>
    </f7-link>
    
    <f7-link tab-link="#view-calendar">
      <div class="inline-icon icon-calendar" v-html="calendarIcon"></div>
    </f7-link>
    
    <f7-link tab-link="#view-books">
      <div class="inline-icon icon-books" v-html="booksIcon"></div>
    </f7-link>
    
    <f7-link tab-link="#view-rites">
      <div class="inline-icon icon-rites" v-html="ritesIcon"></div>
    </f7-link>
  </f7-toolbar>
</template>

<script setup lang="ts">
// Импорт всех SVG иконок как raw содержимое
import homeIcon from "/icons/tabbar-home.svg?raw";
import prayersIcon from "/icons/tabbar-molitvoslov.svg?raw";
import calendarIcon from "/icons/tabbar-calendar.svg?raw";
import booksIcon from "/icons/tabbar-books.svg?raw";
import ritesIcon from "/icons/tabbar-rites.svg?raw";
</script>

<style scoped lang="less">
.inline-icon {
  width: 48px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;

  :deep(svg) {
    width: 100%;
    height: 100%;

    path {
      transition-duration: 200ms;
    }
  }
}

.icon-home,
.icon-prayers,
.icon-calendar {
  :deep(svg) path {
    stroke: var(--f7-tabbar-link-inactive-color);
  }
}

.icon-books,
.icon-rites {
  :deep(svg) path {
    fill: var(--f7-tabbar-link-inactive-color);
  }
}

/* Активное состояние */
.tab-link-active {
  .icon-home,
  .icon-prayers,
  .icon-calendar {
    :deep(svg) path {
      stroke: var(--f7-tabbar-link-active-color);
    }
  }

  .icon-books,
  .icon-rites {
    :deep(svg) path {
      fill: var(--f7-tabbar-link-active-color);
    }
  }
}


</style>