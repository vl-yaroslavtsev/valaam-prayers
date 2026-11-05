<template>
  <div
    ref="verticalContainerRef"
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
    <div class="flow-top-pad" aria-hidden="true"></div>
    <div class="flow-spacer" :style="{ height: spacerBefore + 'px' }" aria-hidden="true"></div>
    <div ref="flowWindowRef" class="flow-window">
      <div
        v-for="chunk in renderedChunks"
        :key="chunk.index"
        class="flow-chunk"
        v-html="chunk.html"
      ></div>
    </div>
    <div class="flow-spacer" :style="{ height: spacerAfter + 'px' }" aria-hidden="true"></div>
    <div class="flow-bottom-pad" aria-hidden="true"></div>
    <!-- Нижнее меню поиска лежит поверх конца текста. Без этого хвоста
         последнее совпадение нельзя докрутить выше меню. -->
    <div v-if="showSearchTail" class="search-scroll-tail" aria-hidden="true"></div>
    <div ref="measurerRef" class="flow-chunk flow-measure" aria-hidden="true"></div>
  </div>
</template>
<script setup lang="ts">
import { useTemplateRef, ref, computed, nextTick, onMounted, onUnmounted } from "vue";
import { useTextSelection } from "@/composables/useTextSelection";
import { useSettingsStore } from "@/stores/settings";
import type { TextTheme, Language } from "@/types/common";
import SvgIcon from "@/components/SvgIcon.vue";
import { detectTapZone } from "./tapZone";
import {
  joinReadingPages,
  planFlowChunks,
  type FlowChunkPlan,
} from "@/text-processing-v3/joinReadingPages";

interface FlowChunk extends FlowChunkPlan {
  index: number;
  html: string | null;
  height: number;
  measured: boolean;
  localTops: number[];
}

interface FlowLayout {
  tops: number[];
  total: number;
  topPad: number;
}

interface ScrollJob {
  dest: number;
  animate: boolean;
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
const flowWindowRef = useTemplateRef<HTMLElement>("flowWindowRef");
const measurerRef = useTemplateRef<HTMLElement>("measurerRef");

const page = ref(1);
const scrollTop = ref(0);
const viewport = ref(0);
const flowVersion = ref(0);
const showSearchTail = ref(false);
const layout = ref<FlowLayout>({ tops: [], total: 0, topPad: 0 });

let pageHtml: string[] = [];
let chunks: FlowChunk[] = [];
let chunkByPage: FlowChunk[] = [];
let pendingPages: string[] | null = null;
let pendingRestore: number | null = null;
let scrollJob: ScrollJob | null = null;
let scrollJobQueued = false;
let lastVerticalScrollTarget: number | null = null;
let lastVerticalScrollTimeout: ReturnType<typeof setTimeout> | null = null;
let lastMeasuredWidth = 0;
let measureGeneration = 0;
let measureFrame = 0;
let flushFrame = 0;
let resizeObserver: ResizeObserver | null = null;
let alive = true;

const { clearSelection, isSelected } = useTextSelection();

const showCurrentBookmark = computed(
  () => showBookmarkTabs && pagesCount > 0 && page.value > 0 && bookmarkedPageSet.value.has(page.value)
);

const readCssPx = (name: string, fallback: number): number => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
};

const estimatedPageHeight = (): number => {
  const el = verticalContainerRef.value;
  const screen = el && el.clientHeight > 0 ? el.clientHeight : 700;
  const padY = readCssPx("--reading-text-page-padding-y", 24);
  const padBottom = readCssPx("--reading-text-page-padding-bottom", 35);
  return Math.max(1, screen - padY - padBottom);
};

const contentWidth = (): number => {
  const rendered = verticalContainerRef.value?.querySelector(".flow-chunk:not(.flow-measure)");
  if (rendered instanceof HTMLElement && rendered.clientWidth > 0) {
    return rendered.clientWidth;
  }
  const el = verticalContainerRef.value;
  if (!el) return 0;
  return Math.max(0, el.clientWidth - readCssPx("--reading-text-page-padding-x", 24) * 2);
};

const estimateLocalTops = (count: number, height: number): number[] =>
  Array.from({ length: count }, (_, index) => (count <= 1 ? 0 : (height * index) / count));

const chunkHtml = (chunk: FlowChunk): string => {
  if (chunk.html != null) return chunk.html;
  const joined = joinReadingPages(
    pageHtml.slice(chunk.pageStart, chunk.pageEnd),
    chunk.pageStart,
    chunk.headerStart,
  );
  chunk.html = joined.html;
  return joined.html;
};

const readLocalTops = (root: HTMLElement, chunk: FlowChunk): number[] => {
  const count = chunk.pageEnd - chunk.pageStart;
  const height = root.offsetHeight;
  const tops = estimateLocalTops(count, height);
  const rootTop = root.getBoundingClientRect().top;
  root.querySelectorAll<HTMLElement>("[data-flow-page]").forEach((node) => {
    const pageIndex = Number(node.dataset.flowPage);
    const local = pageIndex - chunk.pageStart;
    if (local < 0 || local >= count) return;
    tops[local] = Math.max(0, node.getBoundingClientRect().top - rootTop);
  });
  return tops;
};

const recomputeTops = () => {
  const topPad = readCssPx("--reading-text-page-padding-y", 24);
  const tops: number[] = [];
  let total = 0;
  for (const chunk of chunks) {
    tops.push(topPad + total);
    total += chunk.height;
  }
  layout.value = { tops, total, topPad };
};

const applyMeasured = (
  chunk: FlowChunk,
  height: number,
  localTops: number[],
  adjustScroll: boolean,
) => {
  const previousHeight = chunk.height;
  const previousTop = layout.value.tops[chunk.index] ?? 0;
  chunk.height = height;
  chunk.localTops = localTops;
  chunk.measured = true;
  const el = verticalContainerRef.value;
  const delta = height - previousHeight;
  if (
    adjustScroll &&
    el &&
    delta !== 0 &&
    previousTop + previousHeight <= el.scrollTop + 1
  ) {
    el.scrollTop += delta;
    scrollTop.value = el.scrollTop;
    if (lastVerticalScrollTarget != null) lastVerticalScrollTarget += delta;
  }
  recomputeTops();
};

const measureChunk = (chunk: FlowChunk, width: number, adjustScroll: boolean): boolean => {
  const host = measurerRef.value;
  if (!host || width < 1) return false;
  host.style.width = `${width}px`;
  try {
    host.innerHTML = chunkHtml(chunk);
    const height = host.offsetHeight;
    const count = chunk.pageEnd - chunk.pageStart;
    if (height < 1) {
      applyMeasured(chunk, 1, estimateLocalTops(count, 1), adjustScroll);
      return true;
    }
    applyMeasured(chunk, height, readLocalTops(host, chunk), adjustScroll);
    return true;
  } finally {
    host.innerHTML = "";
  }
};

const scheduleMeasure = () => {
  measureGeneration += 1;
  const generation = measureGeneration;
  const step = () => {
    measureFrame = 0;
    if (generation !== measureGeneration) return;
    if (
      scrollJobQueued ||
      isTouchingVertical.value ||
      isProgrammaticScroll.value ||
      isTransitioning.value
    ) {
      measureFrame = requestAnimationFrame(step);
      return;
    }
    const width = contentWidth();
    if (width < 1) {
      measureFrame = requestAnimationFrame(step);
      return;
    }
    lastMeasuredWidth = width;
    const started = performance.now();
    while (performance.now() - started < 12) {
      const chunk = chunks.find((item) => !item.measured);
      if (!chunk) return;
      if (!measureChunk(chunk, width, true)) {
        measureFrame = requestAnimationFrame(step);
        return;
      }
    }
    if (chunks.some((item) => !item.measured)) {
      measureFrame = requestAnimationFrame(step);
    }
  };
  if (measureFrame) cancelAnimationFrame(measureFrame);
  measureFrame = requestAnimationFrame(step);
};

const ensureMeasuredThrough = (pageIndex: number) => {
  const width = contentWidth();
  if (width < 1) return;
  lastMeasuredWidth = width;
  for (const chunk of chunks) {
    if (chunk.pageStart > pageIndex) break;
    if (!chunk.measured) measureChunk(chunk, width, false);
  }
};

const pageTotal = () => pageHtml.length;

const pageStartY = (pageIndex: number): number => {
  const chunk = chunkByPage[pageIndex];
  if (!chunk) return 0;
  const chunkTop = layout.value.tops[chunk.index] ?? 0;
  const local = pageIndex - chunk.pageStart;
  const count = Math.max(1, chunk.pageEnd - chunk.pageStart);
  return chunkTop + (chunk.localTops[local] ?? (chunk.height * local) / count);
};

const locate = (top: number, el: HTMLElement): { page: number; progress: number } => {
  const count = pageTotal();
  if (count <= 0) return { page: 1, progress: 0 };
  const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
  if (maxScroll > 0 && top >= maxScroll - 1) {
    return { page: count, progress: 1 };
  }

  let found = 0;
  let lo = 0;
  let hi = count - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (pageStartY(mid) <= top + 1) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const start = pageStartY(found);
  const next = found + 1 < count ? pageStartY(found + 1) : start + 1;
  const frac = Math.min(0.999, Math.max(0, (top - start) / Math.max(1, next - start)));
  const progress = count <= 1 ? 0 : (found + frac) / (count - 1);
  return { page: found + 1, progress };
};

const syncFromScroll = (el: HTMLElement) => {
  scrollTop.value = el.scrollTop;
  viewport.value = el.clientHeight;
  const located = locate(el.scrollTop, el);
  page.value = located.page;
  if (isLoading || isCalculating) return;
  emit("update:progress", located.progress);
};

const viewHeight = () =>
  viewport.value || verticalContainerRef.value?.clientHeight || estimatedPageHeight();

const visibleChunks = computed(() => {
  flowVersion.value;
  const height = viewHeight();
  const from = scrollTop.value - height;
  const to = scrollTop.value + height * 2;
  const tops = layout.value.tops;
  return chunks.filter((chunk) => {
    const start = tops[chunk.index] ?? 0;
    const end = start + chunk.height;
    return end >= from && start <= to;
  });
});

const spacerBefore = computed(() => {
  const first = visibleChunks.value[0];
  if (!first) return layout.value.total;
  return Math.max(0, (layout.value.tops[first.index] ?? 0) - layout.value.topPad);
});

const spacerAfter = computed(() => {
  const list = visibleChunks.value;
  const last = list[list.length - 1];
  if (!last) return 0;
  const end = (layout.value.tops[last.index] ?? 0) + last.height;
  return Math.max(0, layout.value.topPad + layout.value.total - end);
});

const renderedChunks = computed(() => {
  const list = visibleChunks.value;
  for (const chunk of list) chunkHtml(chunk);
  return list;
});

const rebuild = (pages: string[]) => {
  measureGeneration += 1;
  pageHtml = pages.slice();
  const saved = verticalContainerRef.value?.scrollTop ?? scrollTop.value;
  const plans = planFlowChunks(pageHtml);
  const pageHeight = estimatedPageHeight();
  chunks = plans.map((plan, index) => {
    const count = plan.pageEnd - plan.pageStart;
    const height = Math.max(1, count * pageHeight);
    return {
      ...plan,
      index,
      html: null,
      height,
      measured: false,
      localTops: estimateLocalTops(count, height),
    };
  });
  chunkByPage = [];
  for (const chunk of chunks) {
    for (let index = chunk.pageStart; index < chunk.pageEnd; index += 1) {
      chunkByPage[index] = chunk;
    }
  }
  showSearchTail.value = pageHtml.some((html) => html.includes("search-highlight"));
  recomputeTops();
  flowVersion.value += 1;
  if (pageHtml.length > 0) page.value = 1;
  queueScroll(saved, false);
  scheduleMeasure();
};

const flushPages = () => {
  if (!alive) return;
  const el = verticalContainerRef.value;
  if (!pendingPages) return;
  if (!el || el.clientWidth < 1) {
    flushFrame = requestAnimationFrame(flushPages);
    return;
  }
  const pages = pendingPages;
  pendingPages = null;
  rebuild(pages);
  if (pendingRestore != null) {
    const progress = pendingRestore;
    pendingRestore = null;
    restoreProgress(progress);
  }
};

const applyPages = (pages: string[]) => {
  pendingPages = pages;
  flushPages();
};

const setScroll = (el: HTMLElement, dest: number, animate: boolean) => {
  const top = Math.max(0, dest);
  if (Math.abs(el.scrollTop - top) < 1) {
    scrollTop.value = top;
    syncFromScroll(el);
    return;
  }
  markProgrammaticScrollStart();
  if (!animate) {
    scrollTop.value = top;
    el.scrollTop = top;
    syncFromScroll(el);
    return;
  }
  el.scrollTo({ top, behavior: pageTurnScrollBehavior.value });
};

const queueScroll = (dest: number, animate: boolean) => {
  const top = Math.max(0, dest);
  // Мгновенный переход сразу показывает нужное окно. Плавный едет за scrollTop,
  // иначе окно прыгает в конец раньше пальца.
  if (!animate) scrollTop.value = top;
  scrollJob = { dest: top, animate };
  if (scrollJobQueued) return;
  scrollJobQueued = true;
  nextTick(() => {
    scrollJobQueued = false;
    const job = scrollJob;
    scrollJob = null;
    const el = verticalContainerRef.value;
    if (!el || !job) return;
    setScroll(el, job.dest, job.animate);
  });
};

const scrollTopForPage = (pageIndex: number): number => {
  if (pageIndex <= 0) return 0;
  return pageStartY(pageIndex);
};

const destForProgress = (progress: number): number => {
  const count = pageTotal();
  if (count <= 1) return 0;
  const scaled = Math.min(count - 1, Math.max(0, progress * (count - 1)));
  const pageIndex = Math.min(count - 1, Math.floor(scaled + 1e-6));
  const frac = Math.min(0.999, Math.max(0, scaled - pageIndex));
  const start = scrollTopForPage(pageIndex);
  const next = pageIndex + 1 < count ? pageStartY(pageIndex + 1) : start;
  return start + frac * Math.max(0, next - start);
};

const restoreProgress = (progress: number) => {
  if (pendingPages || chunks.length === 0) {
    pendingRestore = progress;
    return;
  }
  ensureMeasuredThrough(pageTotal() - 1 > 0 ? Math.round(progress * (pageTotal() - 1)) : 0);
  recomputeTops();
  queueScroll(destForProgress(progress), false);
};

const goToPage = (target: number, animate: boolean = true) => {
  const count = pageTotal();
  if (count <= 0) return;
  const pageIndex = Math.min(count, Math.max(1, target)) - 1;
  ensureMeasuredThrough(pageIndex);
  recomputeTops();
  queueScroll(scrollTopForPage(pageIndex), animate);
};

const scrollToProgress = (progress: number, animate: boolean) => {
  if (chunks.length === 0) {
    pendingRestore = progress;
    return;
  }
  ensureMeasuredThrough(pageTotal() - 1 > 0 ? Math.round(progress * (pageTotal() - 1)) : 0);
  recomputeTops();
  queueScroll(destForProgress(progress), animate);
};

const isProgrammaticScroll = ref(false);
let programmaticScrollTimeout: ReturnType<typeof setTimeout> | null = null;

const markProgrammaticScrollStart = () => {
  isProgrammaticScroll.value = true;
  if (programmaticScrollTimeout) clearTimeout(programmaticScrollTimeout);
  programmaticScrollTimeout = setTimeout(() => {
    isProgrammaticScroll.value = false;
    programmaticScrollTimeout = null;
  }, settingsStore.isPageTurnAnimationEnabled ? 400 : 50);
};

const isTouchingVertical = ref(false);
let verticalScrollSettleTimeout: ReturnType<typeof setTimeout> | null = null;
const supportsScrollEnd = typeof window !== "undefined" && "onscrollend" in window;
let verticalTouchStartPoint: { x: number; y: number } | null = null;
const VERTICAL_TAP_MOVE_THRESHOLD = 10;
const BOOKMARK_TAB_TAP_DEBOUNCE_MS = 50;
const BOOKMARK_TAB_CLICK_SUPPRESS_MS = 700;
let bookmarkTabTouchStart: { x: number; y: number } | null = null;
let lastBookmarkTabTapAt = 0;
let bookmarkTabTouchAt = 0;

const isTransitioning = ref(false);
const isMomentumScrolling = computed(
  () => isTransitioning.value && !isTouchingVertical.value && !isProgrammaticScroll.value
);

const emitBookmarkTabTap = (bookmarkPage: number, clientX: number, clientY: number) => {
  if (isLoading || isCalculating) return;
  const now = performance.now();
  if (now - lastBookmarkTabTapAt < BOOKMARK_TAB_TAP_DEBOUNCE_MS) return;
  lastBookmarkTabTapAt = now;
  emit("tap", { type: "bookmark", x: clientX, y: clientY, page: bookmarkPage });
};

const onBookmarkTabTouchStart = (event: TouchEvent) => {
  const touch = event.touches[0];
  bookmarkTabTouchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
};

const onBookmarkTabTouchEnd = (event: TouchEvent) => {
  const start = bookmarkTabTouchStart;
  bookmarkTabTouchStart = null;
  const touch = event.changedTouches[0];
  if (!start || !touch || page.value <= 0) return;
  if (Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > VERTICAL_TAP_MOVE_THRESHOLD) return;
  event.preventDefault();
  bookmarkTabTouchAt = performance.now();
  emitBookmarkTabTap(page.value, touch.clientX, touch.clientY);
};

const onBookmarkTabClick = (event: MouseEvent) => {
  if (page.value <= 0) return;
  if (bookmarkTabTouchAt > 0 && performance.now() - bookmarkTabTouchAt < BOOKMARK_TAB_CLICK_SUPPRESS_MS) return;
  emitBookmarkTabTap(page.value, event.clientX, event.clientY);
};

const tryEmitVerticalTap = (clientX: number, clientY: number) => {
  if (isLoading || isCalculating) return;
  if (isSelected.value) {
    clearSelection();
    return;
  }
  const el = verticalContainerRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const type = detectTapZone(x, y, rect.width, rect.height, "vertical");
  emit("tap", { type, x, y });
};

let verticalTouchStoppedMomentum = false;

const handleVerticalTouchStart = (event: TouchEvent) => {
  if (isLoading || isCalculating) return;
  verticalTouchStoppedMomentum = isMomentumScrolling.value;
  isTouchingVertical.value = true;
  const touch = event.touches[0];
  verticalTouchStartPoint = touch ? { x: touch.clientX, y: touch.clientY } : null;
  emit("touchstart", { swiper: null, event });
};

const handleVerticalTouchEnd = (event: TouchEvent) => {
  if (isLoading || isCalculating) return;
  isTouchingVertical.value = false;
  if (!event.isTrusted) event.stopPropagation();

  const startPoint = verticalTouchStartPoint;
  verticalTouchStartPoint = null;
  const touch = event.changedTouches[0];
  const stoppedMomentum = verticalTouchStoppedMomentum;
  verticalTouchStoppedMomentum = false;

  if (startPoint && touch && !stoppedMomentum) {
    const dx = touch.clientX - startPoint.x;
    const dy = touch.clientY - startPoint.y;
    if (Math.hypot(dx, dy) <= VERTICAL_TAP_MOVE_THRESHOLD) {
      tryEmitVerticalTap(touch.clientX, touch.clientY);
    }
  }
  emit("touchend", event);
};

const handleVerticalScroll = () => {
  if (isSelected.value) clearSelection();
  isTransitioning.value = true;
  emit("update:transitioning", true);

  if (!supportsScrollEnd) {
    if (verticalScrollSettleTimeout) clearTimeout(verticalScrollSettleTimeout);
    verticalScrollSettleTimeout = setTimeout(() => {
      isTransitioning.value = false;
      isProgrammaticScroll.value = false;
      emit("update:transitioning", false);
      verticalScrollSettleTimeout = null;
    }, 120);
  }

  const el = verticalContainerRef.value;
  if (!el) return;
  syncFromScroll(el);
};

const handleVerticalScrollEnd = () => {
  isTransitioning.value = false;
  isProgrammaticScroll.value = false;
  emit("update:transitioning", false);
  if (programmaticScrollTimeout) {
    clearTimeout(programmaticScrollTimeout);
    programmaticScrollTimeout = null;
  }
};

const BOTTOM_CHROME_SELECTOR = [
  ".text-paginator-progress",
  ".page-navigation-toolbar",
  ".chapter-navigation-toolbar",
  ".bookmark-navigation-toolbar",
  ".search-navigation-toolbar",
].join(", ");

const readingBottomCover = (el: HTMLElement): number => {
  const readingPage = el.closest(".page");
  if (!readingPage) return 0;
  const container = el.getBoundingClientRect();
  if (container.height <= 0) return 0;
  let coverTop = container.bottom;
  readingPage.querySelectorAll(BOTTOM_CHROME_SELECTOR).forEach((node) => {
    const rect = (node as HTMLElement).getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    if (rect.bottom <= container.top || rect.top >= container.bottom) return;
    coverTop = Math.min(coverTop, Math.max(rect.top, container.top));
  });
  return Math.max(0, container.bottom - coverTop);
};

const scrollByPage = (direction: 1 | -1) => {
  const el = verticalContainerRef.value;
  if (!el || !el.clientHeight) return;
  const distance = Math.max(1, el.clientHeight - readingBottomCover(el));
  const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
  const base = lastVerticalScrollTarget ?? el.scrollTop;
  lastVerticalScrollTarget = Math.min(maxScroll, Math.max(0, base + direction * distance));
  if (lastVerticalScrollTimeout) clearTimeout(lastVerticalScrollTimeout);
  lastVerticalScrollTimeout = setTimeout(() => {
    lastVerticalScrollTarget = null;
    lastVerticalScrollTimeout = null;
  }, 300);
  markProgrammaticScrollStart();
  el.scrollTo({ top: lastVerticalScrollTarget, behavior: pageTurnScrollBehavior.value });
};

const searchBottomCover = (el: HTMLElement): number => {
  const safeRaw = getComputedStyle(document.documentElement).getPropertyValue("--f7-safe-area-bottom");
  const safe = parseFloat(safeRaw);
  const reserve = 40 + (Number.isFinite(safe) ? safe : 0);
  return Math.max(readingBottomCover(el), reserve);
};

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
    queueScroll(top, false);
  });
};

const setPageHtml = (index: number, html: string) => {
  const chunk = chunkByPage[index];
  if (!chunk || index < 0 || index >= pageHtml.length) return;
  pageHtml[index] = html;
  chunk.html = null;
  chunk.measured = false;
  showSearchTail.value = pageHtml.some((item) => item.includes("search-highlight"));
  flowVersion.value += 1;
  const width = contentWidth();
  if (width > 0) measureChunk(chunk, width, true);
};

const scrollToHeader = (index: number): boolean => {
  const chunk = chunks.find(
    (item) => index >= item.headerStart && index < item.headerStart + item.headerCount,
  );
  const host = measurerRef.value;
  const width = contentWidth();
  if (!chunk || !host || width < 1) return false;
  ensureMeasuredThrough(Math.max(0, chunk.pageEnd - 1));
  recomputeTops();
  host.style.width = `${width}px`;
  host.innerHTML = chunkHtml(chunk);
  const node = host.querySelector<HTMLElement>(`[data-header-index="${index}"]`);
  if (!node) {
    host.innerHTML = "";
    return false;
  }
  const local = node.getBoundingClientRect().top - host.getBoundingClientRect().top;
  const marginTop = parseFloat(getComputedStyle(node).marginTop) || 0;
  host.innerHTML = "";
  const dest = Math.max(0, (layout.value.tops[chunk.index] ?? 0) + local - marginTop);
  queueScroll(dest, false);
  return true;
};

onMounted(() => {
  flushPages();
  const el = verticalContainerRef.value;
  if (!el || typeof ResizeObserver === "undefined") return;
  lastMeasuredWidth = contentWidth();
  resizeObserver = new ResizeObserver(() => {
    const width = contentWidth();
    if (width < 1 || Math.abs(width - lastMeasuredWidth) < 2) return;
    lastMeasuredWidth = width;
    let dirty = false;
    for (const chunk of chunks) {
      if (!chunk.measured) continue;
      chunk.measured = false;
      dirty = true;
    }
    if (dirty) scheduleMeasure();
  });
  resizeObserver.observe(el);
});

onUnmounted(() => {
  alive = false;
  measureGeneration += 1;
  if (measureFrame) cancelAnimationFrame(measureFrame);
  if (flushFrame) cancelAnimationFrame(flushFrame);
  resizeObserver?.disconnect();
  if (programmaticScrollTimeout) clearTimeout(programmaticScrollTimeout);
  if (verticalScrollSettleTimeout) clearTimeout(verticalScrollSettleTimeout);
  if (lastVerticalScrollTimeout) clearTimeout(lastVerticalScrollTimeout);
});

defineExpose({
  containerEl: computed(() => verticalContainerRef.value ?? undefined),
  applyPages,
  setPageHtml,
  revealActiveSearchMark,
  restoreProgress,
  goToPage,
  setProgress: (progress: number) => scrollToProgress(progress, false),
  scrollToHeader,
  slidePrev: () => scrollByPage(-1),
  slideNext: () => scrollByPage(1),
  page,
});
</script>
<style scoped lang="less">
.text-paginator.mode-vertical {
  overflow-y: auto;
  overflow-x: hidden;
  overflow-anchor: none;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -webkit-user-select: text;
  user-select: text;
  -webkit-touch-callout: default;

  &::-webkit-scrollbar {
    display: none;
  }
}

.flow-window {
  box-sizing: border-box;
  padding-right: var(--reading-text-page-padding-x);
  padding-left: var(--reading-text-page-padding-x);
}

.flow-top-pad {
  height: var(--reading-text-page-padding-y);
}

.flow-bottom-pad {
  height: var(--reading-text-page-padding-bottom);
}

.flow-chunk {
  display: flow-root;
}

// .reading-text обнуляет нижнее поле последнего абзаца — так страница не
// оставляет пустоту у края экрана. В потоке это же правило склеивало бы
// абзацы на границе кусков.
.text-paginator.mode-vertical .flow-chunk:deep(p:last-child) {
  margin-bottom: 15px;
}

.flow-chunk:deep(.flow-page-anchor) {
  display: inline;
  white-space: nowrap;
}

.flow-measure {
  position: fixed;
  left: -100000px;
  top: 0;
  opacity: 0;
  pointer-events: none;
  box-sizing: border-box;
}

.search-scroll-tail {
  height: 80px;
}

.page-bookmark-tab {
  position: sticky;
  top: 0;
  z-index: 6;
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
