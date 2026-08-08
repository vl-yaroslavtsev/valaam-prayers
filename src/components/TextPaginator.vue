<template>
  <swiper-container 
    v-if="mode === 'horizontal'"
    :key="`swiper-${mode}`"    
    :class="`text-paginator mode-${mode} reading-text ${lang ? 'prayer-text lang-' + lang : ''} theme-${theme}`" 
    ref="swiper"     
    :virtual="{
      slides: [],
      addSlidesAfter: 1,
      addSlidesBefore: 1,
    }" 
    :direction="mode"
    :freeMode="false" 
    :speed="300"
    :effect="'creative'" 
    :creativeEffect="{
      prev: {
        shadow: true,
        translate: ['-20%', 0, -1],
      },
      next: {
        translate: ['100%', 0, 0],
      },
    }"
    :touchRatio="1"
    :threshold="5"
    @tap="handleTap"
    @slidechange="handleSlideChange"
    @touchstart.passive="handleTouchStart"
    @touchend.passive="handleTouchEnd"
    @progress="handleProgress"
    @settransition="handleSetTransition" >
  </swiper-container>
  <div
    v-else
    ref="verticalContainer"
    :data-text-paginator-id="paginatorInstanceId"
    :class="`text-paginator mode-${mode} reading-text ${lang ? 'prayer-text lang-' + lang : ''} theme-${theme}`"
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
  <div :class="`text-paginator-progress theme-${theme}`"
       v-if="!isLoading && !isCalculating" >
    <f7-progressbar 
      :progress="Math.round(currentProgress * 10000) / 100"       
    />
  </div>
  <div v-if="isShowLoading" :class="`text-paginator-loading-overlay theme-${theme}`">
    <div class="text-paginator-loading">
      <p>Загрузка данных...</p>
      <p>
        <f7-progressbar infinite />
      </p>    
    </div>
  </div>  
  <div v-if="isShowCalculating" :class="`text-paginator-loading-overlay theme-${theme}`">
    <div class="text-paginator-loading">
      <p>Обработка текста...</p>
      <p>
        <f7-progressbar :progress="Math.round(calculatingProgress * 100000) / 1000" />
      </p>    
    </div>
  </div>  
  <!--
  <div 
    v-if="isLoading || isCalculating" 
    :class="`text-paginator text-page reading-text prayer-text theme-${theme}`" 
    style="z-index: 1000;"
  >
    <h1 class="skeleton-text skeleton-effect-wave">___________________</h1>
    <f7-skeleton-block class="skeleton-text-line skeleton-effect-wave" />
    <f7-skeleton-block class="skeleton-text-line skeleton-effect-wave" />
    <f7-skeleton-block class="skeleton-text-line skeleton-effect-wave" />
  </div>
  -->
</template>
<script setup lang="ts">
import { useTemplateRef, watchEffect, ref, shallowRef, watch, computed, nextTick, readonly } from "vue";
import { useTextSelection } from "@/composables/useTextSelection";
import { useSettingsStore } from "@/stores/settings";
import { useTextSettings } from "@/composables/useTextSettings";
import { usePaginationCache } from "@/composables/usePaginationCache";
import { useDelayed } from "@/composables/useDelayed";

import type { PaginationCacheItemHeader } from "@/services/storage/PaginationCacheStorage";
import type { SwiperContainer } from "swiper/element";
import type { Swiper } from "swiper";
import type { VirtualList } from "framework7/types";
import type { TextTheme, Language } from "@/types/common";
import {
  paginateText
} from "@/text-processing";

const { 
  text, 
  lang = null, 
  isLoading = false, 
  initialProgress = 0,
  itemId = ""
} = defineProps<{
  text: string;
  initialProgress?: number;
  lang?: Language | null;
  isLoading?: boolean;
  itemId: string;
}>();



const swiperRef = useTemplateRef<SwiperContainer>("swiper");
const verticalContainerRef = useTemplateRef<HTMLElement>("verticalContainer");

// Уникальный на инстанс идентификатор для scrollableParentEl VirtualList (несколько страниц
// читалки могут одновременно жить в DOM из-за кэширования страниц Framework7)
const paginatorInstanceId = `tp-${Math.random().toString(36).slice(2)}`;
const paginatorInstanceSelector = `[data-text-paginator-id="${paginatorInstanceId}"]`;

const settingsStore = useSettingsStore();
const { } = useTextSettings(); // Инициализируем синхронизацию настроек текста глобально
const { getCachedText, setCachedText } = usePaginationCache();

const mode = computed(() => settingsStore.pageMode);

// Используем настройки из store
const theme = computed(() => settingsStore.textTheme);

// Events
const emit = defineEmits<{
  tap: [payload: { type: "center" | "left" | "right" | "top" | "bottom"; x: number; y: number }];
  progress: [payload: { progress: number, pages: number }];
  touchstart: [payload: { swiper: Swiper | null, event: Event }];
  touchend: [event: Event];
}>();

let swiperRect = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  width: 0,
  height: 0,
};

const isCalculating = ref<boolean>(false);
const isShowCalculating = ref<boolean>(false);

// Используем композабл для отложенного отображения загрузки
const { delayed: isShowLoading } = useDelayed<boolean>(() => isLoading, false, 100);

const currentProgress = ref<number>(initialProgress);
const calculatingProgress = ref<number>(0);

const updateSlides = (slides: string[]) => {
  const template = `<div class="text-page">$content</div>`;

  const swiper = swiperRef.value?.swiper;
  if (!swiper) {
    return;
  }  
  swiper.virtual.removeAllSlides();
  swiper.virtual.slides = slides.map((slide) =>
    template.replace("$content", slide)
  );
  swiper.virtual.update(true);
};

// --- Вертикальный режим: Framework7 VirtualList на нативном скролле ---

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

let f7VirtualList: VirtualList.VirtualList | undefined;
const vlData = ref<VerticalListRenderData>({ items: [] });
const pageHeightPx = ref<number>(0);

const handleRenderExternal = (vl: VirtualList.VirtualList, data: VerticalListRenderData) => {
  f7VirtualList = vl;
  vlData.value = data;
};

const pushPagesToVerticalList = () => {
  if (!f7VirtualList) {
    return;
  }

  const container = verticalContainerRef.value;
  if (container) {
    pageHeightPx.value = container.clientHeight;
  }

  f7VirtualList.params.height = pageHeightPx.value || 1;
  f7VirtualList.replaceAllItems(
    pages.value.map((html, index) => ({ index, html }))
  );
};

// Применяет посчитанные страницы к активному в данный момент рендереру (swiper или VirtualList)
const applyPages = () => {
  if (mode.value === "horizontal") {
    updateSlides(pages.value);
  } else {
    pushPagesToVerticalList();
  }
};

const scrollToProgress = (progress: number, animate: boolean) => {
  const el = verticalContainerRef.value;
  if (!el) {
    return;
  }
  markProgrammaticScrollStart();
  const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
  el.scrollTo({ top: progress * maxScroll, behavior: animate ? "smooth" : "instant" });
};

const { clearSelection, isSelected } = useTextSelection();

const handleTap = (e: CustomEvent<[swiper: Swiper, event: PointerEvent]>) => {

  if (isLoading || isCalculating.value) {
    return;
  }

  console.log("handleTap", swiperRef.value?.swiper.animating);
  if (isSelected.value) {
    clearSelection();
    return;
  }

  if (swiperRef.value) {
    swiperRect = swiperRef.value.getBoundingClientRect();
  }

  const [swiper, event] = e.detail;
  const clientX = event.clientX;
  const clientY = event.clientY;

  // Получаем координаты относительно контейнера
  const x = clientX - swiperRect.left;
  const y = clientY - swiperRect.top;

  // Горизонтальный режим
  const leftZone = swiperRect.width * 0.25; // 25% слева
  const rightZone = swiperRect.width * 0.75; // 75% от левого края (25% справа)
  const centerX = swiperRect.width * 0.5; // Центр по горизонтали

  // Дополнительные ограничения для центральной области по вертикали
  const topCenterZone = swiperRect.height * 0.3; // 30% сверху
  const bottomCenterZone = swiperRect.height * 0.7; // 70% от верха (20% снизу)

  if (x < leftZone) {
    // Левая область - предыдущая страница
    emit("tap", { type: "left", x, y });
    // swiper.slidePrev();
  } else if (x > rightZone) {
    // Правая область - следующая страница
    emit("tap", { type: "right", x, y });
    // swiper.slideNext();
  } else {
    // Находимся в центральной горизонтальной зоне
    if (y >= topCenterZone && y <= bottomCenterZone) {
      // Центральная область - показать меню
      emit("tap", { type: "center", x, y });
    } else {
      // В nav top или nav bottom - определяем по половинам
      if (x < centerX) {
        // Левая половина nav области
        emit("tap", { type: "left", x, y });
        // swiper.slidePrev();
      } else {
        // Правая половина nav области
        emit("tap", { type: "right", x, y });
        // swiper.slideNext();
      }
    }
  }
};

const handleSlideChange = (e: CustomEvent<[swiper: Swiper]>) => {
  const [swiper] = e.detail;
  if (isSelected.value) {
    clearSelection();
  }
};

// --- Вертикальный режим: обработка тапов/скролла/касаний на нативном скролле ---

const isTouchingVertical = ref(false);
let verticalScrollSettleTimeout: ReturnType<typeof setTimeout> | null = null;
// В браузерах без поддержки "scrollend" (Safari < 17, старые WebView) используем
// debounce по "scroll" как фолбэк — см. handleVerticalScroll/handleVerticalScrollEnd
const supportsScrollEnd = typeof window !== "undefined" && "onscrollend" in window;
let verticalTouchStartPoint: { x: number; y: number } | null = null;
const VERTICAL_TAP_MOVE_THRESHOLD = 10; // px — максимальное смещение пальца, чтобы считать касание тапом

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

// Инерционная докрутка: скролл идёт, палец уже не касается экрана, и это не наш scrollTo()
const isMomentumScrolling = computed(
  () => isTransitioning.value && !isTouchingVertical.value && !isProgrammaticScroll.value
);

const emitVerticalTapZone = (x: number, y: number, rect: DOMRect) => {
  const topZone = rect.height * 0.25; // 25% сверху
  const bottomZone = rect.height * 0.75; // 75% от верха (25% снизу)
  const centerY = rect.height * 0.5; // Центр по вертикали

  // Дополнительные ограничения для центральной области по горизонтали
  const leftCenterZone = rect.width * 0.3; // 30% слева
  const rightCenterZone = rect.width * 0.7; // 70% от левого края (20% справа)

  if (y < topZone) {
    emit("tap", { type: "top", x, y });
  } else if (y > bottomZone) {
    emit("tap", { type: "bottom", x, y });
  } else {
    if (x >= leftCenterZone && x <= rightCenterZone) {
      emit("tap", { type: "center", x, y });
    } else {
      if (y < centerY) {
        emit("tap", { type: "top", x, y });
      } else {
        emit("tap", { type: "bottom", x, y });
      }
    }
  }
};

// Общая проверка перед эмитом тапа по зоне (используется и из touchend, и из click)
const tryEmitVerticalTap = (clientX: number, clientY: number) => {
  if (isLoading || isCalculating.value) {
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
  emitVerticalTapZone(clientX - rect.left, clientY - rect.top, rect);
};

// true, если палец коснулся экрана во время инерционной прокрутки — такое касание
// "ловит"/останавливает скролл и не должно считаться тапом по меню
let verticalTouchStoppedMomentum = false;

const handleVerticalTouchStart = (event: TouchEvent) => {
  if (isLoading || isCalculating.value) {
    return;
  }

  verticalTouchStoppedMomentum = isMomentumScrolling.value;

  isTouchingVertical.value = true;

  const touch = event.touches[0];
  verticalTouchStartPoint = touch ? { x: touch.clientX, y: touch.clientY } : null;

  emit("touchstart", { swiper: null, event });
};

const handleVerticalTouchEnd = (event: TouchEvent) => {
  if (isLoading || isCalculating.value) {
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

  if (!supportsScrollEnd) {
    // Фолбэк: считаем скролл завершённым, если новых "scroll"-событий не было 120мс
    if (verticalScrollSettleTimeout) {
      clearTimeout(verticalScrollSettleTimeout);
    }
    verticalScrollSettleTimeout = setTimeout(() => {
      isTransitioning.value = false;
      isProgrammaticScroll.value = false;
      verticalScrollSettleTimeout = null;
    }, 120);
  }

  if (isLoading || isCalculating.value) {
    return;
  }

  const el = verticalContainerRef.value;
  if (!el) {
    return;
  }
  const maxScroll = el.scrollHeight - el.clientHeight;
  currentProgress.value = maxScroll > 0 ? Math.min(1, Math.max(0, el.scrollTop / maxScroll)) : 0;
};

// Точное определение конца скролла (в т.ч. инерционного) там, где браузер это поддерживает
const handleVerticalScrollEnd = () => {
  console.log("handleVerticalScrollEnd isTransitioning false");
  isTransitioning.value = false;
  isProgrammaticScroll.value = false;
  if (programmaticScrollTimeout) {
    clearTimeout(programmaticScrollTimeout);
    programmaticScrollTimeout = null;
  }
};

const restoreProgress = () => {
  const progress = currentProgress.value;
  console.log("restoreProgress", progress);

  if (!progress) {
    return;
  }

  if (mode.value === "horizontal") {
    if (!swiperRef.value) {
      return;
    }
    const swiper = swiperRef.value.swiper;
    swiper.slideTo(Math.floor(progress * swiper.virtual.slides.length), 0);
  } else {
    scrollToProgress(progress, false);
  }
};

const handleProgress = (e: CustomEvent<[swiper: Swiper, progress: number]>) => {
  const [swiper, progress] = e.detail;

  if (isLoading || isCalculating.value) {
    return;
  }

  console.log("handleProgress progress = ", progress);

  currentProgress.value = progress;
};

const pages = shallowRef<string[]>([]);
const headers = shallowRef<PaginationCacheItemHeader[]>([]);

watch([
  () => text, 
  () => settingsStore.fontFamily, 
  () => settingsStore.fontSize, 
  () => settingsStore.lineHeight,
  () => settingsStore.fontFamilyCs, 
  () => settingsStore.fontSizeCs, 
  () => settingsStore.lineHeightCs,
  () => settingsStore.isTextAlignJustified,
  () => settingsStore.isTextWordsBreak,
  () => settingsStore.isTextPagePadding,
  () => settingsStore.isTextBold,
], 
async () => {
  if (isCalculating.value) {
    return;
  }

  const container: HTMLElement | undefined =
    mode.value === "horizontal" ? swiperRef.value ?? undefined : verticalContainerRef.value ?? undefined;

  if (text && container) {
    
    isCalculating.value = true;
    calculatingProgress.value = 0;    
    const cssClasses = `text-page reading-text ${lang ? 'prayer-text lang-' + lang : ''} theme-${theme.value}`;
    
    // Используем кэш если доступен itemId
    const cached = await getCachedText(itemId, lang); 
    if (cached) {
      pages.value = cached.pages;
      headers.value = cached.headers;
    } else {

      if (text.length > 38000) {
        isShowCalculating.value = true;
      }

      console.log("paginateText: text.length", text.length);
      const result = await paginateText(text, container, cssClasses, (progress) => {
        calculatingProgress.value = progress;
      });
      pages.value = result.pages;
      headers.value = result.headers;
      console.log("headers", headers.value);
      setCachedText(itemId, lang, pages.value, headers.value);
    }
    
    applyPages();

    restoreProgress();

    isShowCalculating.value = false;
    isCalculating.value = false;
  }
});

watch(mode, async (newMode) => {

  isCalculating.value = true;
  // При смене режима компонент пересоздается (v-if/v-else меняет ветку рендера)
  // Нужно только дождаться пересоздания и обновить страницы в новом рендерере
  await nextTick();

  if (pages.value.length === 0) {
    isCalculating.value = false;
    return;
  }

  const isReady = newMode === "horizontal" ? !!swiperRef.value?.swiper : !!f7VirtualList;
  if (!isReady) {
    isCalculating.value = false;
    return;
  }

  // Обновляем страницы в новом рендерере (swiper или VirtualList)
  applyPages();

  // Восстанавливаем позицию используя сохраненный прогресс или initialProgress
  restoreProgress();

  isCalculating.value = false;
});

watchEffect(() => {
  if (swiperRef.value) {
    console.log("TextPaginator swiper initialized:", swiperRef.value);
  }
});

const handleTouchStart = (e: CustomEvent<[swiper: Swiper, event: PointerEvent]>) => {

  if (isLoading || isCalculating.value) {
    return;
  }

  if (!e.detail || !e.detail[0]) {
    return;
  }
  const [swiper, event] = e.detail;
  emit("touchstart", { swiper, event });
};

const handleTouchEnd = (event: TouchEvent) => {

  if (isLoading || isCalculating.value) {
    return;
  }

  console.log("TextPaginator: handleTouchEnd", event);

  // CustomEvent вызывает ошибку в progressbar
  if (!event.isTrusted) {
    event.stopPropagation();
  }

  emit("touchend", event);
};


let transtionTimeout: ReturnType<typeof setTimeout> | null = null;
const isTransitioning = ref(false);

const handleSetTransition = (e: CustomEvent<[swiper: Swiper, transition: number]>) => {
  const [swiper, transition] = e.detail;

  console.log("handleSetTransition transition start", swiper, transition);
 
  if (transtionTimeout) {
    clearTimeout(transtionTimeout);
    transtionTimeout = null;
  }  

  if (transition === 0) {
    transtionTimeout = setTimeout(() => {
      isTransitioning.value = false;
      console.log("handleSetTransition transition end", swiper, transition);
    }, 0);
    return;
  } 

  isTransitioning.value = true;

  transtionTimeout = setTimeout(() => {
    transtionTimeout = null;
    isTransitioning.value = false;
    console.log("handleSetTransition transition end", swiper, transition);
  }, transition);
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

// Expose swiper instance for parent component
defineExpose({
  isCalculating: readonly(isCalculating),
  isTransitioning: readonly(isTransitioning),
  theme: readonly(theme),
  mode: readonly(mode),
  progress: readonly(currentProgress),
  pagesCount: computed(() => pages.value.length),
  headers: readonly(headers),
  goToPage: (page: number, animate: boolean = true) => {
    if (mode.value === "horizontal") {
      if (swiperRef.value?.swiper) {
        swiperRef.value.swiper.slideTo(page - 1, animate ? 300 : 0);
      }
      return;
    }

    const el = verticalContainerRef.value;
    if (!el || !pageHeightPx.value) {
      return;
    }
    markProgrammaticScrollStart();
    el.scrollTo({ top: (page - 1) * pageHeightPx.value, behavior: animate ? "smooth" : "instant" });
  },
  setProgress: (progress: number) => {
    if (mode.value === "horizontal") {
      swiperRef.value?.swiper.setProgress(progress);
      return;
    }
    scrollToProgress(progress, false);
  },
  slidePrev: () => {
    if (mode.value === "horizontal") {
      const swiper = swiperRef.value?.swiper;
      if (!swiper) {
        return;
      }
      swiper.slidePrev();
      return;
    }

    scrollByPage(-1);
  },
  slideNext: () => {
    if (mode.value === "horizontal") {
      const swiper = swiperRef.value?.swiper;
      if (!swiper) {
        return;
      }
      swiper.slideNext();
      return;
    }

    scrollByPage(1);
  },
});
</script>

<style scoped lang="less">
.text-paginator {
  position: absolute;
  top: var(--f7-safe-area-top);
  left: 0;
  bottom: 0;
  width: 100%;

  --skeleton-color: #ccc;
  --skeleton-icon-color: rgba(0, 0, 0, 0.25);

  &.theme-dark {
    --skeleton-color: #515151;
    --skeleton-icon-color: rgba(255, 255, 255, 0.25);
  }

  &.mode-vertical {
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior-y: contain;
    -webkit-overflow-scrolling: touch;
  }
}

.text-paginator-vlist {
  margin: 0;

  :deep(li) {
    overflow: hidden;
  }
}
.skeleton-text-line {
  margin-bottom: 0.3em;
}

.text-paginator-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  text-align: center;
  z-index: 1;
  padding: 16px 16px 0 16px;

  display: flex;
  justify-content: center;
  align-items: center;

  pointer-events: none !important;
}

.text-paginator-loading {
  width: 100%;
}

.text-paginator-progress {
  --f7-progressbar-bg-color: var(--content-color-black-10);
  --f7-progressbar-progress-color: var(--content-color-black-20);
  --f7-progressbar-height: 2px;

  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(var(--f7-safe-area-bottom) + var(--f7-progressbar-height) + 4px);
  z-index: 1;
  padding: 4px 16px 0 16px;

  &.theme-dark {
    --f7-progressbar-bg-color: var(--content-color-baige-10);
    --f7-progressbar-progress-color: var(--content-color-baige-10);
  }
}
</style>
