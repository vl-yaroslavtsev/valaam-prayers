<template>
  <!--:effect="'creative'"
    :creativeEffect="{
      prev: {
        shadow: true,
        translate: ['-20%', 0, -1],
      },
      next: {
        translate: ['100%', 0, 0],
      },
    }"-->
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
    :speed="SWIPE_SPEED"
    :spaceBetween="20"
    :touchRatio="1"
    :threshold="5"
    :edgeSwipeDetection="true"
    :edgeSwipeThreshold="SCREEN_EDGE_WIDTH"
    @pointerdown.passive="handlePointerDown"
    @pointerup.passive="handlePointerUp"
    @pointercancel.passive="handlePointerCancel"
    @click="handleTextClick"
    @swiperslidechange="handleSlideChange"
    @swiperprogress="handleProgress"
    @swipersettransition="handleSetTransition"
  >
  </swiper-container>
</template>
<script setup lang="ts">
import { useTemplateRef, computed, ref } from "vue";
import { useTextSelection } from "@/composables/useTextSelection";
import { SCREEN_EDGE_WIDTH } from "@/composables/useSwipeout";
import { useSettingsStore } from "@/stores/settings";
import type { SwiperContainer } from "swiper/element";
import type { Swiper } from "swiper";
import type { TextTheme, Language } from "@/types/common";
import { detectTapZone } from "./tapZone";
import { useTextTap } from "./useTextTap";
import type { TextAction } from "@/text-processing-v3/readingAnnotations";

const { isLoading = false, isCalculating = false } = defineProps<{
  theme: TextTheme;
  lang?: Language | null;
  isLoading?: boolean;
  isCalculating?: boolean;
}>();

const settingsStore = useSettingsStore();
// Свайп всегда с анимацией. Настройка отключает её только у касания и кнопок громкости.
const SWIPE_SPEED = 300;
const programmaticTurnSpeed = computed(() =>
  settingsStore.isPageTurnAnimationEnabled ? SWIPE_SPEED : 0
);

const emit = defineEmits<{
  tap: [payload: { type: "center" | "left" | "right" | "top" | "bottom" | "bookmark"; x: number; y: number; page?: number }];
  action: [action: TextAction];
  touchstart: [payload: { swiper: Swiper; event: Event }];
  touchend: [event: Event];
  "update:progress": [progress: number];
  "update:transitioning": [value: boolean];
}>();

const swiperRef = useTemplateRef<SwiperContainer>("swiperRef");
const { clearSelection, isSelected } = useTextSelection();

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
  syncPage();
};

const emitTap = (clientX: number, clientY: number) => {
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

const { handlePointerDown: handleTextPointerDown, handleClick: handleTextClick } = useTextTap({
  isBlocked: () => isLoading || isCalculating,
  clearSelection,
  onAction: (action) => emit("action", action),
  onTap: emitTap,
});

// Номер страницы — активный слайд, а не swiper.progress. Прогресс на границе
// слайда из‑за округления translate чуть меньше целого шага, и progressToPage
// отдаёт одну и ту же страницу двум соседним слайдам.
const page = ref(1);

const syncPage = () => {
  const swiper = swiperRef.value?.swiper;
  if (!swiper || swiper.destroyed) return;
  const count = swiper.virtual?.slides?.length || swiper.slides?.length || 0;
  const maxIndex = Math.max(count - 1, 0);
  const index = Math.min(Math.max(swiper.activeIndex ?? 0, 0), maxIndex);
  page.value = index + 1;
};

const handleSlideChange = () => {
  syncPage();
  if (isSelected.value) {
    clearSelection();
  }
};

const handlePointerDown = (event: PointerEvent) => {
  handleTextPointerDown(event);

  if (isLoading || isCalculating) {
    return;
  }

  if (!event.isPrimary || event.button !== 0) {
    return;
  }

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

  emit("touchend", event);
};

const handlePointerCancel = (event: PointerEvent) => {
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
  syncPage();
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
    syncPage();
  },
  goToPage: (page: number, animate: boolean = true) => {
    const swiper = swiperRef.value?.swiper;
    if (!swiper) {
      return;
    }
    const index = page - 1;
    if (swiper.activeIndex === index) {
      syncPage();
      return;
    }
    swiper.slideTo(index, animate ? programmaticTurnSpeed.value : 0);
    syncPage();
  },
  setProgress: (progress: number) => {
    swiperRef.value?.swiper?.setProgress(progress);
    syncPage();
  },
  slidePrev: () => {
    swiperRef.value?.swiper?.slidePrev(programmaticTurnSpeed.value);
    syncPage();
  },
  slideNext: () => {
    swiperRef.value?.swiper?.slideNext(programmaticTurnSpeed.value);
    syncPage();
  },
  page,
});
</script>
