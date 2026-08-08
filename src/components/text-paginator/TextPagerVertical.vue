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
    <f7-list
      class="text-paginator-vlist"
      virtual-list
      :virtual-list-params="{
        items: [],
        renderExternal: handleRenderExternal,
        height: 1,
        setListHeight: true,
        scrollableParentEl: paginatorInstanceSelector,
        rowsBefore: 2,
        rowsAfter: 2,
      }"
    >
      <li
        v-for="item in vlData.items"
        :key="item.index"
        class="text-page"
        :style="{ top: (vlData.topPosition || 0) + 'px', height: pageHeightPx + 'px' }"
        v-html="item.html"
      ></li>
    </f7-list>
  </div>
</template>
<script setup lang="ts">
import { useTemplateRef, ref, computed } from "vue";
import { useTextSelection } from "@/composables/useTextSelection";
import type { VirtualList } from "framework7/types";
import type { TextTheme, Language } from "@/types/common";
import { detectTapZone } from "./tapZone";

interface VerticalListItem {
  index: number;
  html: string;
}

interface VerticalListRenderData {
  fromIndex?: number;
  toIndex?: number;
  listHeight?: number;
  topPosition?: number;
  items: VerticalListItem[];
}

const { isLoading = false, isCalculating = false } = defineProps<{
  theme: TextTheme;
  lang?: Language | null;
  isLoading?: boolean;
  isCalculating?: boolean;
}>();

const emit = defineEmits<{
  tap: [payload: { type: "center" | "left" | "right" | "top" | "bottom"; x: number; y: number }];
  touchstart: [payload: { swiper: null; event: Event }];
  touchend: [event: Event];
  "update:progress": [progress: number];
  "update:transitioning": [value: boolean];
}>();

const verticalContainerRef = useTemplateRef<HTMLElement>("verticalContainerRef");

// Уникальный на инстанс идентификатор для scrollableParentEl VirtualList (несколько страниц
// читалки могут одновременно жить в DOM из-за кэширования страниц Framework7)
const paginatorInstanceId = `tp-${Math.random().toString(36).slice(2)}`;
const paginatorInstanceSelector = `[data-text-paginator-id="${paginatorInstanceId}"]`;

const { clearSelection, isSelected } = useTextSelection();

let f7VirtualList: VirtualList.VirtualList | undefined;
const vlData = ref<VerticalListRenderData>({ items: [] });
const pageHeightPx = ref<number>(0);

const handleRenderExternal = (vl: VirtualList.VirtualList, data: VerticalListRenderData) => {
  f7VirtualList = vl;
  vlData.value = data;
};

const applyPages = (pages: string[]) => {
  if (!f7VirtualList) {
    return;
  }

  const container = verticalContainerRef.value;
  if (container) {
    pageHeightPx.value = container.clientHeight;
  }

  f7VirtualList.params.height = pageHeightPx.value || 1;
  f7VirtualList.replaceAllItems(
    pages.map((html, index) => ({ index, html }))
  );
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
  // Страховка на случай, если "scrollend" не придёт (с запасом больше длительности smooth-анимации)
  programmaticScrollTimeout = setTimeout(() => {
    isProgrammaticScroll.value = false;
    programmaticScrollTimeout = null;
  }, 400);
};

const isTouchingVertical = ref(false);
let verticalScrollSettleTimeout: ReturnType<typeof setTimeout> | null = null;
// В браузерах без поддержки "scrollend" (Safari < 17, старые WebView) используем
// debounce по "scroll" как фолбэк — см. handleVerticalScroll/handleVerticalScrollEnd
const supportsScrollEnd = typeof window !== "undefined" && "onscrollend" in window;
let verticalTouchStartPoint: { x: number; y: number } | null = null;
const VERTICAL_TAP_MOVE_THRESHOLD = 10; // px — максимальное смещение пальца, чтобы считать касание тапом

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
  el.scrollTo({ top: progress * maxScroll, behavior: animate ? "smooth" : "instant" });
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

  if (isLoading || isCalculating) {
    return;
  }

  const el = verticalContainerRef.value;
  if (!el) {
    return;
  }
  const maxScroll = el.scrollHeight - el.clientHeight;
  const progress = maxScroll > 0 ? Math.min(1, Math.max(0, el.scrollTop / maxScroll)) : 0;
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

// Прокручивает вертикальный список на одну "страницу" вперед/назад, накапливая
// цель при повторных быстрых вызовах (аналог lastTranslatePosition для swiper)
const scrollByPage = (direction: 1 | -1) => {
  const el = verticalContainerRef.value;
  if (!el || !pageHeightPx.value) {
    return;
  }

  const speed = 300;
  const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
  const base = lastVerticalScrollTarget ?? el.scrollTop;
  lastVerticalScrollTarget = Math.min(maxScroll, Math.max(0, base + direction * pageHeightPx.value));

  if (lastVerticalScrollTimeout) {
    clearTimeout(lastVerticalScrollTimeout);
  }
  lastVerticalScrollTimeout = setTimeout(() => {
    lastVerticalScrollTarget = null;
    lastVerticalScrollTimeout = null;
  }, speed);

  markProgrammaticScrollStart();
  el.scrollTo({ top: lastVerticalScrollTarget, behavior: "smooth" });
};

defineExpose({
  containerEl: computed(() => verticalContainerRef.value ?? undefined),
  applyPages,
  restoreProgress: (progress: number) => scrollToProgress(progress, false),
  goToPage: (page: number, animate: boolean = true) => {
    const el = verticalContainerRef.value;
    if (!el || !pageHeightPx.value) {
      return;
    }
    markProgrammaticScrollStart();
    el.scrollTo({ top: (page - 1) * pageHeightPx.value, behavior: animate ? "smooth" : "instant" });
  },
  setProgress: (progress: number) => scrollToProgress(progress, false),
  slidePrev: () => scrollByPage(-1),
  slideNext: () => scrollByPage(1),
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

  :deep(li) {
    overflow: hidden;
  }
}
</style>
