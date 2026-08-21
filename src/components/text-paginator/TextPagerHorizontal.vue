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
    @tap="handleTap"
    @slidechange="handleSlideChange"
    @touchstart.passive="handleTouchStart"
    @touchend.passive="handleTouchEnd"
    @progress="handleProgress"
    @settransition="handleSetTransition" >
  </swiper-container>
</template>
<script setup lang="ts">
import { useTemplateRef, computed, watchEffect } from "vue";
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

let swiperRect = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  width: 0,
  height: 0,
};

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

const handleTap = (e: CustomEvent<[swiper: Swiper, event: PointerEvent]>) => {

  if (isLoading || isCalculating) {
    return;
  }

  if (isSelected.value) {
    clearSelection();
    return;
  }

  if (swiperRef.value) {
    swiperRect = swiperRef.value.getBoundingClientRect();
  }

  const [, event] = e.detail;
  const x = event.clientX - swiperRect.left;
  const y = event.clientY - swiperRect.top;

  const type = detectTapZone(x, y, swiperRect.width, swiperRect.height, "horizontal");
  emit("tap", { type, x, y });
};

const handleSlideChange = () => {
  if (isSelected.value) {
    clearSelection();
  }
};

const handleTouchStart = (e: CustomEvent<[swiper: Swiper, event: PointerEvent]>) => {

  if (isLoading || isCalculating) {
    return;
  }

  if (!e.detail || !e.detail[0]) {
    return;
  }
  const [swiper, event] = e.detail;
  emit("touchstart", { swiper, event });
};

const handleTouchEnd = (event: TouchEvent) => {

  if (isLoading || isCalculating) {
    return;
  }

  // CustomEvent вызывает ошибку в progressbar
  if (!event.isTrusted) {
    event.stopPropagation();
  }

  emit("touchend", event);
};

const handleProgress = (e: CustomEvent<[swiper: Swiper, progress: number]>) => {
  if (isLoading || isCalculating) {
    return;
  }

  const [, progress] = e.detail;

  emit("update:progress", progress);
};

let transitionTimeout: ReturnType<typeof setTimeout> | null = null;

const handleSetTransition = (e: CustomEvent<[swiper: Swiper, transition: number]>) => {
  const [swiper, transition] = e.detail;

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
    swiperRef.value?.swiper?.slideTo(page - 1, animate ? 300 : 0);
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
