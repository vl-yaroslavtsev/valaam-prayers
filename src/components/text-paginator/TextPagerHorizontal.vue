<template>
  <swiper-container
    ref="swiperRef"
    :class="`text-paginator mode-horizontal reading-text ${lang ? 'prayer-text lang-' + lang : ''} theme-${theme}`"
    :virtual="{
      slides: [],
      addSlidesAfter: 1,
      addSlidesBefore: 1,
    }"
    direction="horizontal"
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
    @pointerdown.passive="handlePointerDown"
    @pointerup.passive="handlePointerUp"
    @pointercancel.passive="handlePointerCancel"
    @swipertap="handleSwiperTap"
    @swiperslidechange="handleSlideChange"
    @swiperprogress="handleProgress"
    @swipersettransition="handleSetTransition"
  >
  </swiper-container>
</template>
<script setup lang="ts">
import { useTemplateRef, computed } from "vue";
import { useTextSelection } from "@/composables/useTextSelection";
import type { SwiperContainer } from "swiper/element";
import type { Swiper } from "swiper";
import type { TextTheme, Language } from "@/types/common";
import { detectTapZone } from "./tapZone";

const { isLoading = false, isCalculating = false } = defineProps<{
  theme: TextTheme;
  lang?: Language | null;
  isLoading?: boolean;
  isCalculating?: boolean;
}>();

const emit = defineEmits<{
  tap: [payload: { type: "center" | "left" | "right" | "top" | "bottom"; x: number; y: number }];
  touchstart: [payload: { swiper: Swiper; event: Event }];
  touchend: [event: Event];
  "update:progress": [progress: number];
  "update:transitioning": [value: boolean];
}>();

const swiperRef = useTemplateRef<SwiperContainer>("swiperRef");
const { clearSelection, isSelected } = useTextSelection();

const TAP_MOVE_THRESHOLD = 10;
const TAP_DEBOUNCE_MS = 50;
let pointerStart: { x: number; y: number; id: number } | null = null;
let lastTapAt = 0;

const updateSlides = (slides: string[]) => {
  const template = `<div class="text-page">$content</div>`;

  const swiper = swiperRef.value?.swiper;
  if (!swiper?.virtual) {
    return;
  }

  // removeAllSlides() вызывает slideTo(0) и сбрасывает текущую страницу.
  // Кеш virtual нужно очистить, иначе renderSlide вернёт старый DOM без новой подсветки.
  const activeIndex = swiper.activeIndex;
  swiper.virtual.slides = slides.map((slide) =>
    template.replace("$content", slide)
  );
  swiper.virtual.cache = {};
  swiper.virtual.update(true);
  // Creative-эффект держит соседние слайды со сдвигом translate.
  // После force-update без slideTo активный слайд может остаться за экраном
  // («пустая страница»). next/prev это скрывали повторным goToPage.
  swiper.slideTo(activeIndex, 0);
};

const emitTapFromClientPoint = (clientX: number, clientY: number) => {
  if (isLoading || isCalculating) {
    return;
  }

  const now = performance.now();
  if (now - lastTapAt < TAP_DEBOUNCE_MS) {
    return;
  }
  lastTapAt = now;

  if (isSelected.value) {
    clearSelection();
    return;
  }

  const el = swiperRef.value;
  if (!el) {
    return;
  }

  const rect = el.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const type = detectTapZone(x, y, rect.width, rect.height, "horizontal");
  emit("tap", { type, x, y });
};

const handleSwiperTap = (e: CustomEvent<[swiper: Swiper, event: PointerEvent]>) => {
  const pointer = e.detail?.[1];
  if (!pointer || typeof pointer.clientX !== "number") {
    return;
  }
  emitTapFromClientPoint(pointer.clientX, pointer.clientY);
};

const handleSlideChange = () => {
  if (isSelected.value) {
    clearSelection();
  }
};

const handlePointerDown = (event: PointerEvent) => {
  if (isLoading || isCalculating) {
    return;
  }

  if (!event.isPrimary || event.button !== 0) {
    return;
  }

  pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };

  const swiper = swiperRef.value?.swiper;
  if (!swiper) {
    return;
  }
  emit("touchstart", { swiper, event });
};

const handlePointerUp = (event: PointerEvent) => {
  if (isLoading || isCalculating) {
    return;
  }

  if (!event.isPrimary) {
    return;
  }

  const start = pointerStart;
  pointerStart = null;

  if (start && start.id === event.pointerId) {
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) <= TAP_MOVE_THRESHOLD) {
      emitTapFromClientPoint(event.clientX, event.clientY);
    }
  }

  emit("touchend", event);
};

const handlePointerCancel = (event: PointerEvent) => {
  pointerStart = null;
  emit("touchend", event);
};

const handleProgress = (e: CustomEvent<[swiper: Swiper, progress: number]>) => {
  if (isLoading || isCalculating) {
    return;
  }

  if (!Array.isArray(e.detail)) {
    return;
  }

  const progress = e.detail[1];
  if (typeof progress !== "number") {
    return;
  }

  emit("update:progress", progress);
};

let transitionTimeout: ReturnType<typeof setTimeout> | null = null;

const handleSetTransition = (e: CustomEvent<[swiper: Swiper, transition: number]>) => {
  if (!Array.isArray(e.detail)) {
    return;
  }

  const transition = e.detail[1];
  if (typeof transition !== "number") {
    return;
  }

  if (transitionTimeout) {
    clearTimeout(transitionTimeout);
    transitionTimeout = null;
  }

  if (transition === 0) {
    transitionTimeout = setTimeout(() => {
      emit("update:transitioning", false);
    }, 0);
    return;
  }

  emit("update:transitioning", true);

  transitionTimeout = setTimeout(() => {
    transitionTimeout = null;
    emit("update:transitioning", false);
  }, transition);
};

defineExpose({
  containerEl: computed(() => swiperRef.value ?? undefined),
  applyPages: (pages: string[]) => updateSlides(pages),
  restoreProgress: (progress: number) => {
    const swiper = swiperRef.value?.swiper;
    if (!swiper) {
      return;
    }
    swiper.slideTo(Math.floor(progress * swiper.virtual.slides.length), 0);
  },
  goToPage: (page: number, animate: boolean = true) => {
    const swiper = swiperRef.value?.swiper;
    if (!swiper) {
      return;
    }
    const index = page - 1;
    if (swiper.activeIndex === index) {
      return;
    }
    swiper.slideTo(index, animate ? 300 : 0);
  },
  setProgress: (progress: number) => {
    swiperRef.value?.swiper?.setProgress(progress);
  },
  slidePrev: () => {
    swiperRef.value?.swiper?.slidePrev();
  },
  slideNext: () => {
    swiperRef.value?.swiper?.slideNext();
  },
});
</script>
