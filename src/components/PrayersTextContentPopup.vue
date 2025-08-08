<template>
  <f7-popup 
    :tablet-fullscreen="true"  
    v-model:opened="isOpened">
    <f7-page>
      <f7-navbar>
        <f7-nav-left>
          <f7-link icon="icon-back" @click="isOpened = false" />
        </f7-nav-left>
        <f7-nav-title>{{ title }}</f7-nav-title>
      </f7-navbar>
      <f7-toolbar top tabbar>
        <f7-link 
          tab-link="#tab-text-content"
          tab-link-active
        >
          Содержание
        </f7-link>
        <f7-link 
          tab-link="#tab-text-zakladki"
        >
          Закладки
        </f7-link>
      </f7-toolbar>
    <f7-tabs swipeable
      @slidechange="onTabsSlideChange"
      @touchend.passive="onTabsTouchEnd">
      <f7-tab
        id="tab-text-content"
        class="page-content"
        ref="contentTabRef"
        tab-active
      >
        <f7-block v-if="headers.length > 0"
          class="no-padding-horizontal">
          <f7-treeview >
            <f7-treeview-item
              v-for="header in groupedHeaders" 
              :key="`${header.index}`"
              :label="header.text"
              :footer="`Страница ${header.page}`"
              :toggle="header.children.length > 0"
              :opened="header.opened"
              :selected="header.selected"
              @click="goToPage(header.page, $event)"
            >
              <f7-treeview-item
                v-for="child in header.children"
                :key="`${child.index}`"
                :label="child.text"
                :footer="`Страница ${child.page}`"
                :selected="child.selected"
                @click="goToPage(child.page, $event)"
              />
            </f7-treeview-item>
          </f7-treeview>
        </f7-block>
        <f7-block v-else>
          <p>Содержание не найдено</p>
        </f7-block>
      </f7-tab>
      <f7-tab
        id="tab-text-zakladki"
        class="page-content"
      >
        <f7-block>
            <p>Коснитесь правого верхнего угла текста и 
              закладка появится здесь
            </p>
        </f7-block>
      </f7-tab>
    </f7-tabs>
    </f7-page>
  </f7-popup>
</template>
<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import { f7 } from "framework7-vue";

import type { PaginationCacheItemHeader } from "@/services/storage/PaginationCacheStorage";
import Swiper from "swiper";

const { itemId, title, headers, page } = defineProps<{
  itemId: string;
  title: string;
  headers: PaginationCacheItemHeader[];
  page: number;
}>();

const isOpened = defineModel<boolean>('isOpened');

// События
const emit = defineEmits<{
  goToPage: [page: number];
}>();

interface GroupedHeaderItem extends PaginationCacheItemHeader {
  index: number;
  selected: boolean;
  opened?: boolean;
  children: GroupedHeaderItem[];
}

const groupedHeaders = computed(() => {
  // Находим индекс последнего заголовка, страница которого <= текущей
  let currentFlatIndex = -1;
  for (let i = 0; i < headers.length; i += 1) {
    if (headers[i].page <= page) {
      currentFlatIndex = i;
    }
  }

  const result: GroupedHeaderItem[] = [];
  let lastRoot: GroupedHeaderItem | null = null;

  headers.forEach((h, i) => {
    const isSelected = i === currentFlatIndex;
    if (h.level === 2) {
      lastRoot = {
        ...h,
        index: result.length,
        children: [],
        selected: isSelected,
        opened: isSelected,
      };
      result.push(lastRoot);
    } else if (lastRoot) {
      const child: GroupedHeaderItem = {
        ...h,
        index: lastRoot.children.length,
        children: [],
        selected: isSelected,
      };
      lastRoot.children.push(child);
      if (isSelected) {
        lastRoot.opened = true;
        lastRoot.selected = true;
      }
    }
  });

  return result;
});

// Функция для перехода к странице
const goToPage = (page: number, event: PointerEvent) => {
  if (event.target instanceof HTMLElement && 
      event.target.classList.contains('treeview-toggle')) {
    return;
  }
  emit('goToPage', page);
  isOpened.value = false; // Закрываем попап после выбора
};

// Всплытие Custom TouchEnd от Swiper вызывает ошибку в Range
const onTabsTouchEnd = (event: PointerEvent) => {
  if (!event.isTrusted) {
     event.stopPropagation();
  }
};

const onTabsSlideChange = (event: CustomEvent<[Swiper]>) => {
  const swiper = event.detail[0];
  const currSlide = swiper.slides[swiper.activeIndex];
  f7.tab.show(currSlide);
  // После переключения на вкладку содержания пытаемся прокрутить к выбранному заголовку
  nextTick(() => scrollToSelectedIfNeeded());
};

// Прокрутка к выбранному пункту, если он вне видимой области
const contentTabRef = ref<any | null>(null);
const scrollToSelectedIfNeeded = () => {
  const container: HTMLElement | null =
    (contentTabRef.value && (contentTabRef.value.$el || contentTabRef.value.el)) || contentTabRef.value;
  if (!isOpened.value || !container) return;
  // Прокручиваем только если вкладка активна
  if (!container.classList.contains('tab-active')) return;

  // Сначала ищем выбранный дочерний элемент, затем корневой
  let selectedEl = container.querySelector('.treeview-item-children .treeview-item-selected') as HTMLElement | null;
  if (!selectedEl) {
    selectedEl = container.querySelector('.treeview-item-selected') as HTMLElement | null;
  }
  if (!selectedEl) return;

  const cRect = container.getBoundingClientRect();
  const eRect = selectedEl.getBoundingClientRect();

  const isAbove = eRect.top < cRect.top;
  const isBelow = eRect.bottom > cRect.bottom;
  if (!isAbove && !isBelow) return;

  const currentScrollTop = container.scrollTop;
  const deltaTop = eRect.top - cRect.top;
  const target = currentScrollTop + deltaTop - (container.clientHeight / 2 - eRect.height / 2);
  container.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
};

// Когда открывается попап — прокрутить к текущему заголовку
watch(() => isOpened.value, (opened) => {
  if (opened) {
    nextTick(() => scrollToSelectedIfNeeded());
  }
});

// При смене страницы/списка заголовков — тоже обновить прокрутку, если попап открыт
watch([() => page, () => headers], () => {
  if (isOpened.value) {
    nextTick(() => scrollToSelectedIfNeeded());
  }
});

</script>