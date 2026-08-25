<template>
  <f7-popup 
    ref="popup"
    :tablet-fullscreen="true"  
    v-model:opened="isOpened"
    @popup:open="onPopupOpen">
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
          <f7-treeview :class="{ 'lang-cs': lang === 'cs' }">
            <f7-treeview-item
              v-for="header in groupedHeaders" 
              :key="`${header.index}`"
              :label="header.text"
              :toggle="header.children.length > 0"
              :opened="header.opened"
              :selected="header.selected"
              @click="goToPage(header.page, $event)"
            >
              <template #content-end>
                <span class="treeview-item-page">{{ header.page }}</span>
              </template>
              <f7-treeview-item
                v-for="child in header.children"
                :key="`${child.index}`"
                :label="child.text"
                :selected="child.selected"
                @click="goToPage(child.page, $event)"
              >
                <template #content-end>
                  <span class="treeview-item-page">{{ child.page }}</span>
                </template>
              </f7-treeview-item>
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
        <f7-list v-if="bookmarks.length > 0" class="bookmarks-list no-hairlines-md">
          <transition-group tag="ul" name="bookmark-item">
            <f7-list-item
              v-for="bookmark in bookmarks"
              :key="bookmark.id"
              link="#"
              no-chevron
              :selected="bookmark.id === activeBookmarkId"
              :title="bookmark.name"
              @click.prevent="onBookmarkClick(bookmark.id)"
            >
              <template #after>
                <span class="bookmark-page">{{ bookmark.page }}</span>
                <f7-link
                  icon-only
                  class="bookmark-actions-link"
                  @click.stop.prevent="openActionsPopover(bookmark, $event)"
                >
                  <SvgIcon icon="more-vertical" :size="24" :color="pageIconColor" />
                </f7-link>
              </template>
            </f7-list-item>
          </transition-group>
        </f7-list>
        <f7-block v-else>
            <p>Коснитесь правого верхнего угла текста и 
              закладка появится здесь
            </p>
        </f7-block>
      </f7-tab>
    </f7-tabs>
    </f7-page>
    <f7-popover
      ref="bookmarkActionsPopoverRef"
      class="bookmark-actions-popover"
      v-model:opened="isActionsPopoverOpened"
      @popover:open="onActionsPopoverOpen"
    >
      <f7-list no-chevron>
        <f7-list-item link="#" @click="onEditBookmarkClick">
          <template #media>
            <SvgIcon icon="pencil" :size="24" :color="actionIconColor" />
          </template>
          <template #title>Редактировать</template>
        </f7-list-item>
        <f7-list-item link="#" @click="onDeleteBookmarkClick">
          <template #media>
            <SvgIcon icon="delete" :size="24" :color="actionIconColor" />
          </template>
          <template #title>Удалить</template>
        </f7-list-item>
      </f7-list>
    </f7-popover>
  </f7-popup>
</template>
<script setup lang="ts">
import { computed, ref, watch, nextTick, useTemplateRef, type ComponentPublicInstance } from "vue";
import { f7 } from "framework7-vue";
import { Dom7 as $$ } from "framework7";
import type { Popover } from "framework7/types";

import type { PaginationCacheItemHeader } from "@/services/storage/PaginationCacheStorage";
import type { Language } from "@/types/common";
import type { BookmarkWithPage } from "@/composables/useBookmarks";
import { useTheme } from "@/composables/useTheme";
import SvgIcon from "@/components/SvgIcon.vue";
import Swiper from "swiper";

const { itemId, title, headers, page, lang, bookmarks = [], initialTab = "content", activeBookmarkId = null } = defineProps<{
  itemId: string;
  title: string;
  headers: PaginationCacheItemHeader[];
  page: number;
  lang?: Language | null;
  bookmarks?: BookmarkWithPage[];
  initialTab?: "content" | "bookmarks";
  activeBookmarkId?: string | null;
}>();

const isOpened = defineModel<boolean>('isOpened');
const popupRef = useTemplateRef<ComponentPublicInstance>("popup");

// События
const emit = defineEmits<{
  goToPage: [page: number];
  goToBookmark: [id: string];
  editBookmark: [id: string];
  deleteBookmark: [id: string];
}>();

const { isDarkMode } = useTheme();
const pageIconColor = computed(() => (isDarkMode.value ? "baige-60" : "black-40"));
const actionIconColor = computed(() => (isDarkMode.value ? "baige-100" : "black-primary"));

// --- Вкладка "Закладки" ---
const onBookmarkClick = (id: string) => {
  emit('goToBookmark', id);
  const popupEl = popupRef.value?.$el;
  if (popupEl) {
    f7.popup.close(popupEl, false);
  }
  isOpened.value = false;
};

const isActionsPopoverOpened = ref(false);
const actionsTargetEl = ref<Element | null>(null);
const activeActionsBookmarkId = ref<string | null>(null);
// Примерная высота попапа с двумя пунктами — используется, чтобы решить,
// хватает ли места открыть его вниз, или нужно открыть вверх
const ACTIONS_POPOVER_ESTIMATED_HEIGHT = 120;
const actionsPopoverVerticalPosition = ref<"top" | "bottom">("bottom");

const openActionsPopover = (bookmark: BookmarkWithPage, event: PointerEvent) => {
  activeActionsBookmarkId.value = bookmark.id;
  const targetEl = event.currentTarget as Element;
  actionsTargetEl.value = targetEl;

  const rect = targetEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  actionsPopoverVerticalPosition.value =
    spaceBelow >= ACTIONS_POPOVER_ESTIMATED_HEIGHT ? "bottom" : "top";

  isActionsPopoverOpened.value = true;
};

const onActionsPopoverOpen = (popover: Popover.Popover) => {
  if (actionsTargetEl.value) {
    popover.$targetEl = $$(actionsTargetEl.value);
  }
  popover.params.verticalPosition = actionsPopoverVerticalPosition.value;
};

const onEditBookmarkClick = () => {
  if (activeActionsBookmarkId.value) {
    emit('editBookmark', activeActionsBookmarkId.value);
  }
  isActionsPopoverOpened.value = false;
};

const onDeleteBookmarkClick = () => {
  if (activeActionsBookmarkId.value) {
    emit('deleteBookmark', activeActionsBookmarkId.value);
  }
  isActionsPopoverOpened.value = false;
};

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
  const popupEl = popupRef.value?.$el;
  if (popupEl) {
    f7.popup.close(popupEl, false);
  }
  isOpened.value = false;
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

// Когда попап реально открылся (а не просто получил isOpened=true) — показать нужную
// вкладку и прокрутить к текущему заголовку. Именно "popup:open", а не watch по isOpened,
// потому что watch в этом компоненте срабатывает раньше внутреннего watch'а f7-popup
// (который и вызывает f7Popup.open()) — переключать вкладку swiper'а до реального открытия
// попапа нельзя: он ещё скрыт, и слайд не встанет на нужную позицию
const onPopupOpen = () => {
  const targetTabId = initialTab === "bookmarks" ? "tab-text-zakladki" : "tab-text-content";
  const targetTabEl = document.getElementById(targetTabId);
  // При повторном открытии попапа swiper внутри swipeable-табов пересоздаётся и
  // сбрасывается на первый слайд, а класс tab-active от предыдущего открытия может
  // остаться на другой вкладке. Из-за этого f7.tab.show() решает, что нужная вкладка
  // уже активна, и не переключает swiper. Снимаем класс заранее, чтобы show() не пропустил переключение
  targetTabEl?.classList.remove("tab-active");
  f7.tab.show(`#${targetTabId}`);
  nextTick(() => scrollToSelectedIfNeeded());
};

// При смене страницы/списка заголовков — тоже обновить прокрутку, если попап открыт
watch([() => page, () => headers], () => {
  if (isOpened.value) {
    nextTick(() => scrollToSelectedIfNeeded());
  }
});

</script>
<style scoped lang="less">
.navbar {
  --f7-navbar-border-color: transparent;
}

.bookmarks-list {
  margin: 0;
  --bookmark-page-color: var(--content-color-black-60);

  :deep(.item-title) {
    white-space: normal;
    flex: 1;
    min-width: 0;
  }

  :deep(.item-after) {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

:global(.dark .bookmarks-list) {
  --bookmark-page-color: var(--content-color-baige-60);
}

.bookmark-page {
  flex-shrink: 0;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-size: var(--mobile-main-text-regular-b3);
  color: var(--bookmark-page-color);
}

:deep(.item-selected),
:deep(.item-selected .item-content) {
  background-color: var(--f7-treeview-selectable-selected-bg-color);
}

.bookmarks-list :deep(ul) {
  position: relative;
}

:deep(.bookmark-item-move),
:deep(.bookmark-item-enter-active),
:deep(.bookmark-item-leave-active) {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

:deep(.bookmark-item-enter-from),
:deep(.bookmark-item-leave-to) {
  opacity: 0;
  transform: translateY(-8px);
}

:deep(.bookmark-item-leave-active) {
  position: absolute;
  width: 100%;
}

.bookmark-actions-link {
  width: 42px;
  height: 42px;
  padding: 0;
  flex-shrink: 0;
}

.bookmark-actions-popover {
  --f7-popover-width: 232px;
  --f7-popover-border-radius: 8px;
  --f7-list-item-padding-horizontal: 8px;
  --f7-list-item-min-height: 24px;
  --f7-list-item-media-margin: 10px;
  --f7-list-font-size: var(--mobile-main-text-regular-b3);

  :deep(ul) {
    padding: 8px;
  }

  :deep(.item-content) {
    border-radius: 8px;
  }
}

:global(.bookmark-actions-popover.modal-in ~ .popover-backdrop) {
  --popover-backdrop-bg-color: transparent;
}
</style>