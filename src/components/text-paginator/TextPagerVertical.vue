<template>
  <div
    ref="verticalContainerRef"
    :data-text-paginator-id="paginatorInstanceId"
    :class="`text-paginator mode-vertical reading-text ${lang ? 'prayer-text lang-' + lang : ''} theme-${theme}`"
    @scroll.passive="handleVerticalScroll"
    @scrollend.passive="handleVerticalScrollEnd"
    @touchstart.passive="handleVerticalTouchStart"
    @touchend.passive="handleVerticalTouchEnd"
  >
    <div
      v-if="showCurrentBookmark"
      class="page-bookmark-tab"
      @touchstart.stop="onBookmarkTabTouchStart"
      @touchend.stop="onBookmarkTabTouchEnd"
      @click.stop="onBookmarkTabClick"
    >
      <SvgIcon icon="bookmark-filled" color="primary-accent-50" :size="24" />
    </div>
    <f7-list
      class="text-paginator-vlist"
      virtual-list
      :virtual-list-params="{
        items: [],
        renderExternal: handleRenderExternal,
        height: chunkHeight,
        setListHeight: true,
        scrollableParentEl: paginatorInstanceSelector,
      }"
    >
      <li
        v-for="item in vlData.items"
        :key="item.index"
        class="text-chunk"
        :style="{ top: (vlData.topPosition || 0) + 'px', height: item.height + 'px' }"
      >
        <div class="text-chunk-body text-page" v-html="item.html"></div>
      </li>
    </f7-list>
    <!-- Нижнее меню поиска лежит поверх конца текста. Без этого хвоста
         последнее совпадение нельзя докрутить выше меню. -->
    <div v-if="showSearchTail" class="search-scroll-tail" aria-hidden="true"></div>
  </div>
</template>
<script setup lang="ts">
import { useTemplateRef, ref, computed, nextTick } from "vue";
import { useTextSelection } from "@/composables/useTextSelection";
import { pageToProgress, progressToPage } from "@/composables/useBookmarks";
import { useSettingsStore } from "@/stores/settings";
import type { VirtualList } from "framework7/types";
import type { TextTheme, Language } from "@/types/common";
import SvgIcon from "@/components/SvgIcon.vue";
import { detectTapZone } from "./tapZone";

interface VerticalListItem {
  index: number;
  html: string;
  height: number;
}

interface VerticalListRenderData {
  fromIndex?: number;
  toIndex?: number;
  listHeight?: number;
  topPosition?: number;
  items: VerticalListItem[];
}

const {
  isLoading = false,
  isCalculating = false,
  bookmarkedPages = [],
  showBookmarkTabs = false,
  pagesCount = 0,
} = defineProps<{
  theme: TextTheme;
  lang?: Language | null;
  isLoading?: boolean;
  isCalculating?: boolean;
  bookmarkedPages?: number[];
  showBookmarkTabs?: boolean;
  pagesCount?: number;
}>();

const bookmarkedPageSet = computed(() => new Set(bookmarkedPages));
const scrollProgress = ref(0);

const settingsStore = useSettingsStore();
const pageTurnScrollBehavior = computed<"smooth" | "instant">(() =>
  settingsStore.isPageTurnAnimationEnabled ? "smooth" : "instant"
);

const emit = defineEmits<{
  tap: [payload: { type: "center" | "left" | "right" | "top" | "bottom" | "bookmark"; x: number; y: number; page?: number }];
  touchstart: [payload: { swiper: null; event: Event }];
  touchend: [event: Event];
  "update:progress": [progress: number];
  "update:transitioning": [value: boolean];
}>();

const verticalContainerRef = useTemplateRef<HTMLElement>("verticalContainerRef");

const currentPage = computed(() => {
  if (pagesCount <= 0) return 0;
  const el = verticalContainerRef.value;
  const maxScroll = el ? Math.max(0, el.scrollHeight - el.clientHeight) : 0;
  const raw = scrollProgress.value * (pagesCount - 1);
  // scrollTop целый и на границе страницы оказывается на пиксель раньше.
  // Без этого переход к закладке открывает её страницу, но иконка скрыта.
  const slop = maxScroll > 0 ? (pagesCount - 1) / maxScroll : 0;
  return Math.min(Math.floor(raw + slop) + 1, pagesCount);
});
const showCurrentBookmark = computed(
  () => showBookmarkTabs && currentPage.value > 0 && bookmarkedPageSet.value.has(currentPage.value)
);

// Уникальный на инстанс идентификатор для scrollableParentEl VirtualList (несколько страниц
// читалки могут одновременно жить в DOM из-за кэширования страниц Framework7)
const paginatorInstanceId = `tp-${Math.random().toString(36).slice(2)}`;
const paginatorInstanceSelector = `[data-text-paginator-id="${paginatorInstanceId}"]`;

const { clearSelection, isSelected } = useTextSelection();

let f7VirtualList: VirtualList.VirtualList | undefined;
const vlData = ref<VerticalListRenderData>({ items: [] });

const chunkHeight = (item: VerticalListItem) => item.height || 1;

let pendingPages: string[] | null = null;
let pageItems: VerticalListItem[] = [];
const showSearchTail = ref(false);

// Страницы уже посчитаны и лежат в кэше пагинации. Высота каждой — экран,
// заново текст не меряем.
const flushPages = () => {
  const pages = pendingPages;
  const container = verticalContainerRef.value;
  if (!pages || !f7VirtualList || !container || container.clientHeight < 1) {
    return;
  }
  pendingPages = null;

  const height = container.clientHeight;
  pageItems = pages.map((html, index) => ({ index, html, height }));
  showSearchTail.value = pages.some((html) => html.includes("search-highlight"));

  f7VirtualList.params.height = chunkHeight;
  f7VirtualList.replaceAllItems(pageItems);
};

const handleRenderExternal = (vl: VirtualList.VirtualList, data: VerticalListRenderData) => {
  f7VirtualList = vl;
  vlData.value = data;
  if (pendingPages) {
    flushPages();
  }
};

const applyPages = (pages: string[]) => {
  pendingPages = pages;
  flushPages();
};

const setPageHtml = (index: number, html: string) => {
  const item = pageItems[index];
  if (!item || !f7VirtualList) {
    return;
  }
  item.html = html;
  f7VirtualList.replaceItem(index, item);
};

// Флаг "сейчас идёт наш собственный el.scrollTo()" — нужен, чтобы отличать
// инерционную (momentum) докрутку браузера после свайпа от программного скролла
const isProgrammaticScroll = ref(false);
let programmaticScrollTimeout: ReturnType<typeof setTimeout> | null = null;

const markProgrammaticScrollStart = () => {
  isProgrammaticScroll.value = true;
  if (programmaticScrollTimeout) {
    clearTimeout(programmaticScrollTimeout);
  }
  // Страховка на случай, если "scrollend" не придёт (с запасом больше длительности анимации)
  programmaticScrollTimeout = setTimeout(() => {
    isProgrammaticScroll.value = false;
    programmaticScrollTimeout = null;
  }, settingsStore.isPageTurnAnimationEnabled ? 400 : 50);
};

const isTouchingVertical = ref(false);
let verticalScrollSettleTimeout: ReturnType<typeof setTimeout> | null = null;
// В браузерах без поддержки "scrollend" (Safari < 17, старые WebView) используем
// debounce по "scroll" как фолбэк — см. handleVerticalScroll/handleVerticalScrollEnd
const supportsScrollEnd = typeof window !== "undefined" && "onscrollend" in window;
let verticalTouchStartPoint: { x: number; y: number } | null = null;
const VERTICAL_TAP_MOVE_THRESHOLD = 10; // px — максимальное смещение пальца, чтобы считать касание тапом
const BOOKMARK_TAB_TAP_DEBOUNCE_MS = 50;
// Касание даёт touchend и затем click. Второй вызов снова открывает диалог
// редактирования и срывает его закрытие по «Сохранить» / «Удалить».
const BOOKMARK_TAB_CLICK_SUPPRESS_MS = 700;
let bookmarkTabTouchStart: { x: number; y: number } | null = null;
let lastBookmarkTabTapAt = 0;
let bookmarkTabTouchAt = 0;

const isTransitioning = ref(false);

// Инерционная докрутка: скролл идёт, палец уже не касается экрана, и это не наш scrollTo()
const isMomentumScrolling = computed(
  () => isTransitioning.value && !isTouchingVertical.value && !isProgrammaticScroll.value
);

const scrollToProgress = (progress: number, animate: boolean) => {
  const el = verticalContainerRef.value;
  if (!el) {
    return;
  }
  markProgrammaticScrollStart();
  const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
  el.scrollTo({
    top: progress * maxScroll,
    behavior: animate ? pageTurnScrollBehavior.value : "instant",
  });
};

const emitBookmarkTabTap = (page: number, clientX: number, clientY: number) => {
  if (isLoading || isCalculating) {
    return;
  }
  const now = performance.now();
  if (now - lastBookmarkTabTapAt < BOOKMARK_TAB_TAP_DEBOUNCE_MS) {
    return;
  }
  lastBookmarkTabTapAt = now;
  emit("tap", { type: "bookmark", x: clientX, y: clientY, page });
};

const onBookmarkTabTouchStart = (event: TouchEvent) => {
  const touch = event.touches[0];
  bookmarkTabTouchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
};

const onBookmarkTabTouchEnd = (event: TouchEvent) => {
  const start = bookmarkTabTouchStart;
  bookmarkTabTouchStart = null;
  const touch = event.changedTouches[0];
  if (!start || !touch || currentPage.value <= 0) {
    return;
  }
  if (Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > VERTICAL_TAP_MOVE_THRESHOLD) {
    return;
  }
  event.preventDefault();
  bookmarkTabTouchAt = performance.now();
  emitBookmarkTabTap(currentPage.value, touch.clientX, touch.clientY);
};

const onBookmarkTabClick = (event: MouseEvent) => {
  if (currentPage.value <= 0) {
    return;
  }
  if (bookmarkTabTouchAt > 0 && performance.now() - bookmarkTabTouchAt < BOOKMARK_TAB_CLICK_SUPPRESS_MS) {
    return;
  }
  emitBookmarkTabTap(currentPage.value, event.clientX, event.clientY);
};

// Общая проверка перед эмитом тапа по зоне (используется и из touchend, и из click)
const tryEmitVerticalTap = (clientX: number, clientY: number) => {
  if (isLoading || isCalculating) {
    return;
  }

  if (isSelected.value) {
    clearSelection();
    return;
  }

  const el = verticalContainerRef.value;
  if (!el) {
    return;
  }

  const rect = el.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const type = detectTapZone(x, y, rect.width, rect.height, "vertical");
  emit("tap", { type, x, y });
};

// true, если палец коснулся экрана во время инерционной прокрутки — такое касание
// "ловит"/останавливает скролл и не должно считаться тапом по меню
let verticalTouchStoppedMomentum = false;

const handleVerticalTouchStart = (event: TouchEvent) => {
  if (isLoading || isCalculating) {
    return;
  }

  verticalTouchStoppedMomentum = isMomentumScrolling.value;

  isTouchingVertical.value = true;

  const touch = event.touches[0];
  verticalTouchStartPoint = touch ? { x: touch.clientX, y: touch.clientY } : null;

  emit("touchstart", { swiper: null, event });
};

const handleVerticalTouchEnd = (event: TouchEvent) => {
  if (isLoading || isCalculating) {
    return;
  }
  isTouchingVertical.value = false;

  if (!event.isTrusted) {
    event.stopPropagation();
  }

  const startPoint = verticalTouchStartPoint;
  verticalTouchStartPoint = null;
  const touch = event.changedTouches[0];
  const stoppedMomentum = verticalTouchStoppedMomentum;
  verticalTouchStoppedMomentum = false;

  if (startPoint && touch && !stoppedMomentum) {
    const dx = touch.clientX - startPoint.x;
    const dy = touch.clientY - startPoint.y;
    if (Math.hypot(dx, dy) <= VERTICAL_TAP_MOVE_THRESHOLD) {
      // Эмитим "tap" ДО "touchend": родитель (prayersText.vue) сбрасывает свой guard
      // от повторного показа меню именно по "touchend", а тап должен успеть отработать
      // до этого сброса — так же, как это естественным образом происходит в Swiper
      tryEmitVerticalTap(touch.clientX, touch.clientY);
    }
  }

  emit("touchend", event);
};

const handleVerticalScroll = () => {
  if (isSelected.value) {
    clearSelection();
  }

  isTransitioning.value = true;
  emit("update:transitioning", true);

  if (!supportsScrollEnd) {
    // Фолбэк: считаем скролл завершённым, если новых "scroll"-событий не было 120мс
    if (verticalScrollSettleTimeout) {
      clearTimeout(verticalScrollSettleTimeout);
    }
    verticalScrollSettleTimeout = setTimeout(() => {
      isTransitioning.value = false;
      isProgrammaticScroll.value = false;
      emit("update:transitioning", false);
      verticalScrollSettleTimeout = null;
    }, 120);
  }

  const el = verticalContainerRef.value;
  if (!el) {
    return;
  }
  const maxScroll = el.scrollHeight - el.clientHeight;
  const progress = maxScroll > 0 ? Math.min(1, Math.max(0, el.scrollTop / maxScroll)) : 0;
  scrollProgress.value = progress;

  if (isLoading || isCalculating) {
    return;
  }

  emit("update:progress", progress);
};

// Точное определение конца скролла (в т.ч. инерционного) там, где браузер это поддерживает
const handleVerticalScrollEnd = () => {
  isTransitioning.value = false;
  isProgrammaticScroll.value = false;
  emit("update:transitioning", false);
  if (programmaticScrollTimeout) {
    clearTimeout(programmaticScrollTimeout);
    programmaticScrollTimeout = null;
  }
};

let lastVerticalScrollTarget: number | null = null;
let lastVerticalScrollTimeout: ReturnType<typeof setTimeout> | null = null;

// Нижние панели стоят в одной точке и накрывают друг друга. Берём верхнюю
// кромку тех, что реально пересекают контейнер: скрытый тулбар уехал за экран.
const BOTTOM_CHROME_SELECTOR = [
  ".text-paginator-progress",
  ".page-navigation-toolbar",
  ".chapter-navigation-toolbar",
  ".bookmark-navigation-toolbar",
  ".search-navigation-toolbar",
].join(", ");

const readingBottomCover = (el: HTMLElement): number => {
  const page = el.closest(".page");
  if (!page) {
    return 0;
  }
  const container = el.getBoundingClientRect();
  if (container.height <= 0) {
    return 0;
  }
  let coverTop = container.bottom;
  page.querySelectorAll(BOTTOM_CHROME_SELECTOR).forEach((node) => {
    const rect = (node as HTMLElement).getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    if (rect.bottom <= container.top || rect.top >= container.bottom) {
      return;
    }
    coverTop = Math.min(coverTop, Math.max(rect.top, container.top));
  });
  return Math.max(0, container.bottom - coverTop);
};

// Прокручивает вертикальный список на одну "страницу" вперед/назад, накапливая
// цель при повторных быстрых вызовах (аналог lastTranslatePosition для swiper)
const scrollByPage = (direction: 1 | -1) => {
  const el = verticalContainerRef.value;
  if (!el) {
    return;
  }
  if (!el.clientHeight) {
    return;
  }
  const pageHeight = Math.max(1, el.clientHeight - readingBottomCover(el));

  const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
  const base = lastVerticalScrollTarget ?? el.scrollTop;
  lastVerticalScrollTarget = Math.min(maxScroll, Math.max(0, base + direction * pageHeight));

  if (lastVerticalScrollTimeout) {
    clearTimeout(lastVerticalScrollTimeout);
  }
  lastVerticalScrollTimeout = setTimeout(() => {
    lastVerticalScrollTarget = null;
    lastVerticalScrollTimeout = null;
  }, 300);

  markProgrammaticScrollStart();
  el.scrollTo({ top: lastVerticalScrollTarget, behavior: pageTurnScrollBehavior.value });
};

// Меню поиска может ещё ехать анимацией и не попасть в измерение.
const searchBottomCover = (el: HTMLElement): number => {
  const safeRaw = getComputedStyle(document.documentElement).getPropertyValue("--f7-safe-area-bottom");
  const safe = parseFloat(safeRaw);
  const reserve = 40 + (Number.isFinite(safe) ? safe : 0);
  return Math.max(readingBottomCover(el), reserve);
};

// Совпадение внизу страницы может оказаться под меню поиска.
const revealActiveSearchMark = () => {
  nextTick(() => {
    const root = verticalContainerRef.value;
    const mark = root?.querySelector("mark.search-highlight-active");
    if (!root || !(mark instanceof HTMLElement)) return;
    const cover = searchBottomCover(root);
    const container = root.getBoundingClientRect();
    const rect = mark.getBoundingClientRect();
    const margin = 16;
    const visibleBottom = container.bottom - cover;
    if (rect.top >= container.top + margin && rect.bottom <= visibleBottom - margin) return;
    const delta = rect.top - (container.top + Math.min(72, (container.height - cover) * 0.2));
    if (Math.abs(delta) < 2) return;
    const maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
    const top = Math.min(maxScroll, Math.max(0, root.scrollTop + delta));
    if (Math.abs(root.scrollTop - top) < 1) return;
    markProgrammaticScrollStart();
    root.scrollTo({ top, behavior: "instant" });
  });
};

defineExpose({
  containerEl: computed(() => verticalContainerRef.value ?? undefined),
  applyPages,
  setPageHtml,
  revealActiveSearchMark,
  restoreProgress: (progress: number) => scrollToProgress(progress, false),
  goToPage: (page: number, animate: boolean = true) => {
    const el = verticalContainerRef.value;
    if (!el || pagesCount <= 0) {
      return;
    }
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    const top = pageToProgress(page, pagesCount) * maxScroll;
    if (Math.abs(el.scrollTop - top) < 1) {
      return;
    }
    markProgrammaticScrollStart();
    el.scrollTo({
      top,
      behavior: animate ? pageTurnScrollBehavior.value : "instant",
    });
  },
  setProgress: (progress: number) => scrollToProgress(progress, false),
  // Заголовок лежит на уже посчитанной странице кэша — родитель откроет её.
  scrollToHeader: (_index: number): boolean => false,
  slidePrev: () => scrollByPage(-1),
  slideNext: () => scrollByPage(1),
  page: currentPage,
});
</script>
<style scoped lang="less">
.text-paginator.mode-vertical {
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  // Полоса прокрутки не должна сужать текст: страницы посчитаны на полную ширину.
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.text-paginator-vlist {
  margin: 0;
  // .list ставит font-size: var(--f7-list-font-size) и затирает размер,
  // с которым страницы уже посчитаны в горизонтальном режиме
  font-size: inherit;
  line-height: inherit;

  :deep(li.text-chunk) {
    margin: 0;
    padding: 0;
    border: 0;
    overflow: visible;
    background: none;
  }
}

.text-chunk-body.text-page {
  height: 100%;
  overflow: hidden;
}

.search-scroll-tail {
  height: 80px;
}

.page-bookmark-tab {
  position: sticky;
  top: 0;
  z-index: 6;
  // 4px зазор сверху и сама иконка. Отрицательный margin не сдвигает текст
  // и не даёт нулевой высоте обрезать svg.
  height: 28px;
  margin-bottom: -28px;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  overflow: visible;
  pointer-events: none;

  :deep(.icon) {
    pointer-events: auto;
  }
}
</style>
