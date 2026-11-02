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
        <div
          class="text-chunk-body"
          :style="{
            paddingTop: item.paddingTop,
            paddingRight: item.paddingRight,
            paddingBottom: item.paddingBottom,
            paddingLeft: item.paddingLeft,
          }"
          v-html="item.html"
        ></div>
      </li>
    </f7-list>
  </div>
</template>
<script setup lang="ts">
import { useTemplateRef, ref, computed } from "vue";
import { useTextSelection } from "@/composables/useTextSelection";
import { pageToProgress, progressToPage } from "@/composables/useBookmarks";
import { useSettingsStore } from "@/stores/settings";
import type { VirtualList } from "framework7/types";
import type { TextTheme, Language } from "@/types/common";
import SvgIcon from "@/components/SvgIcon.vue";
import { estimateCharsForPages, splitHtmlByCharBudget } from "@/text-processing-v3/splitHtmlChunks";
import { detectTapZone } from "./tapZone";

const VERTICAL_CHUNK_SCREENS = 4;
const CHUNK_TAIL = '<span aria-hidden="true" style="display:block;height:0;overflow:hidden"></span>';

interface ChunkPadding {
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
}

interface VerticalListItem extends ChunkPadding {
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

type PendingText = {
  sourceHtml: string;
  cssClasses: string;
  highlight?: (html: string, index: number) => string;
};
let pendingText: PendingText | null = null;
// Смещение границы каждого h2/h3 от начала полотна, в порядке документа.
// Совпадает с headers пагинации: пустые заголовки пропускаются так же.
let headerAnchors: number[] = [];

const readPadding = (container: HTMLElement, isFirst: boolean, isLast: boolean): ChunkPadding => {
  const style = getComputedStyle(container);
  const x = style.getPropertyValue("--reading-text-page-padding-x").trim() || "24px";
  const y = style.getPropertyValue("--reading-text-page-padding-y").trim() || "24px";
  const bottom = style.getPropertyValue("--reading-text-page-padding-bottom").trim() || "35px";
  return {
    paddingTop: isFirst ? y : "0px",
    paddingRight: x,
    paddingBottom: isLast ? bottom : "0px",
    paddingLeft: x,
  };
};

interface MeasuredChunk {
  height: number;
  html: string;
  headerOffsets: number[];
}

const measureChunk = (
  container: HTMLElement,
  html: string,
  padding: ChunkPadding,
  headerStart: number
): MeasuredChunk => {
  const probe = document.createElement("div");
  Object.assign(probe.style, {
    position: "absolute",
    visibility: "hidden",
    left: "0",
    top: "0",
    width: `${container.clientWidth}px`,
    boxSizing: "border-box",
    pointerEvents: "none",
    ...padding,
  });
  probe.innerHTML = html;
  container.appendChild(probe);
  const probeTop = probe.getBoundingClientRect().top;
  const headerOffsets: number[] = [];
  let headerIndex = headerStart;
  probe.querySelectorAll("h2, h3").forEach((node) => {
    const text = (node.textContent || "").replace(/\u00AD/g, "").trim();
    if (!text) return;
    node.setAttribute("data-header-index", String(headerIndex));
    headerIndex += 1;
    headerOffsets.push((node as HTMLElement).getBoundingClientRect().top - probeTop);
  });
  const height = Math.max(1, probe.offsetHeight);
  const measuredHtml = probe.innerHTML;
  probe.remove();
  return { height, html: measuredHtml, headerOffsets };
};

const flushText = () => {
  const job = pendingText;
  const container = verticalContainerRef.value;
  if (!job || !f7VirtualList || !container) {
    return;
  }
  pendingText = null;

  const charsPerChunk = estimateCharsForPages(
    container.clientWidth,
    container.clientHeight,
    job.cssClasses,
    VERTICAL_CHUNK_SCREENS
  );
  const chunks = splitHtmlByCharBudget(job.sourceHtml, charsPerChunk);
  const last = chunks.length - 1;
  const anchors: number[] = [];
  let cursor = 0;
  let headerCount = 0;
  const items = chunks.map((html, index) => {
    const shown = (job.highlight ? job.highlight(html, index) : html) + CHUNK_TAIL;
    const padding = readPadding(container, index === 0, index === last);
    const measured = measureChunk(container, shown, padding, headerCount);
    headerCount += measured.headerOffsets.length;
    for (const offset of measured.headerOffsets) {
      anchors.push(cursor + offset);
    }
    cursor += measured.height;
    return {
      index,
      html: measured.html,
      height: measured.height,
      ...padding,
    };
  });
  headerAnchors = anchors;

  f7VirtualList.params.height = chunkHeight;
  f7VirtualList.replaceAllItems(items);
};

const handleRenderExternal = (vl: VirtualList.VirtualList, data: VerticalListRenderData) => {
  f7VirtualList = vl;
  vlData.value = data;
  if (pendingText) {
    flushText();
  }
};

const applyText = (
  sourceHtml: string,
  cssClasses: string,
  highlight?: (html: string, index: number) => string
) => {
  pendingText = { sourceHtml, cssClasses, highlight };
  flushText();
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
let bookmarkTabTouchStart: { x: number; y: number } | null = null;
let lastBookmarkTabTapAt = 0;

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
  emitBookmarkTabTap(currentPage.value, touch.clientX, touch.clientY);
};

const onBookmarkTabClick = (event: MouseEvent) => {
  if (currentPage.value <= 0) {
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

defineExpose({
  containerEl: computed(() => verticalContainerRef.value ?? undefined),
  applyText,
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
  scrollToHeader: (index: number): boolean => {
    const el = verticalContainerRef.value;
    const anchor = headerAnchors[index];
    if (!el || anchor == null) {
      return false;
    }
    const paddingRaw = getComputedStyle(el).getPropertyValue("--reading-text-page-padding-y").trim();
    const paddingY = parseFloat(paddingRaw);
    const inset = Number.isFinite(paddingY) ? paddingY : 0;
    const maxScroll = () => Math.max(0, el.scrollHeight - el.clientHeight);
    const top = Math.min(maxScroll(), Math.max(0, anchor - inset));
    // Кусок могли замерить до окончательной ширины: живой заголовок съезжает
    // на строку. Ставим границу именно этого заголовка на верхний отступ.
    const alignRenderedHeading = () => {
      const heading = el.querySelector(`[data-header-index="${index}"]`);
      if (!(heading instanceof HTMLElement)) return;
      const delta = heading.getBoundingClientRect().top - el.getBoundingClientRect().top - inset;
      if (Math.abs(delta) < 1) return;
      el.scrollTo({
        top: Math.min(maxScroll(), Math.max(0, el.scrollTop + delta)),
        behavior: "instant",
      });
    };
    if (Math.abs(el.scrollTop - top) >= 1) {
      markProgrammaticScrollStart();
      el.scrollTo({ top, behavior: "instant" });
    }
    alignRenderedHeading();
    requestAnimationFrame(alignRenderedHeading);
    return true;
  },
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

.text-chunk-body {
  box-sizing: border-box;
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
