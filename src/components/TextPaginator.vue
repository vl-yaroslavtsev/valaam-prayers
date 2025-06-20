<template>
  <swiper-container class="text-paginator" ref="swiper" :virtual="{
    slides: [],
    addSlidesAfter: 1,
    addSlidesBefore: 1,
  }" :direction="mode" :freeMode="mode === 'vertical'" :speed="300"
    :effect="mode === 'horizontal' ? 'creative' : 'slide'" :creativeEffect="{
      prev: {
        shadow: true,
        translate: ['-20%', 0, -1],
      },
      next: {
        translate: ['100%', 0, 0],
      },
    }" @tap="handleTap">
  </swiper-container>
</template>
<!--    

-->

<script setup lang="ts">
import { ref, useTemplateRef, watchEffect, nextTick, onMounted } from "vue";
import type { SwiperContainer } from "swiper/element";
import type { Swiper } from "swiper";
import {
  estimatePageCount,
  paginateText,
} from "@/text-processing";

const { text, mode = "horizontal" } = defineProps<{
  mode?: "vertical" | "horizontal";
  text: string;
}>();

// Events
const emit = defineEmits<{
  tap: [type: "center" | "left" | "right" | "top" | "bottom", x: number, y: number];
}>();

const swiperRef = useTemplateRef<SwiperContainer>("swiper");
let swiperRect = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  width: 0,
  height: 0,
};

const updateSlides = (slides: string[]) => {
  const template = `<div class="text-page reading-text prayer-text theme-grey">$content</div>`;

  const swiper = swiperRef.value?.swiper;
  if (!swiper) {
    return;
  }

  swiper.virtual.slides = slides.map((slide) =>
    template.replace("$content", slide)
  );
  swiper.virtual.update(true);
};

const handleTap = (e: CustomEvent<[swiper: Swiper, event: PointerEvent]>) => {
  const [swiper, event] = e.detail;
  const clientX = event.clientX;
  const clientY = event.clientY;

  // Получаем координаты относительно контейнера
  const x = clientX - swiperRect.left;
  const y = clientY - swiperRect.top;

  // Определяем область касания в зависимости от режима
  if (mode === "horizontal") {
    // Горизонтальный режим
    const leftZone = swiperRect.width * 0.25; // 25% слева
    const rightZone = swiperRect.width * 0.75; // 75% от левого края (25% справа)
    const centerX = swiperRect.width * 0.5; // Центр по горизонтали

    // Дополнительные ограничения для центральной области по вертикали
    const topCenterZone = swiperRect.height * 0.3; // 30% сверху
    const bottomCenterZone = swiperRect.height * 0.7; // 70% от верха (20% снизу)

    if (x < leftZone) {
      // Левая область - предыдущая страница
      emit("tap", "left", x, y);
      swiper.slidePrev();
    } else if (x > rightZone) {
      // Правая область - следующая страница
      emit("tap", "right", x, y);
      swiper.slideNext();
    } else {
      // Находимся в центральной горизонтальной зоне
      if (y >= topCenterZone && y <= bottomCenterZone) {
        // Центральная область - показать меню
        emit("tap", "center", x, y);
      } else {
        // В nav top или nav bottom - определяем по половинам
        if (x < centerX) {
          // Левая половина nav области
          emit("tap", "left", x, y);
          swiper.slidePrev();
        } else {
          // Правая половина nav области
          emit("tap", "right", x, y);
          swiper.slideNext();
        }
      }
    }
  } else {
    // Вертикальный режим
    const topZone = swiperRect.height * 0.25; // 25% сверху
    const bottomZone = swiperRect.height * 0.75; // 75% от верха (25% снизу)
    const centerY = swiperRect.height * 0.5; // Центр по вертикали

    // Дополнительные ограничения для центральной области по горизонтали
    const leftCenterZone = swiperRect.width * 0.3; // 30% слева
    const rightCenterZone = swiperRect.width * 0.7; // 70% от левого края (20% справа)

    if (y < topZone) {
      // Верхняя область - предыдущая страница
      emit("tap", "top", x, y);
      // swiper.slidePrev();
      swiper.translateTo(swiper.translate + swiperRect.height, swiper.params.speed || 300);
    } else if (y > bottomZone) {
      // Нижняя область - следующая страница
      emit("tap", "bottom", x, y);
      // swiper.slideNext();
      swiper.translateTo(swiper.translate - swiperRect.height, swiper.params.speed || 300);
    } else {
      // Находимся в центральной вертикальной зоне
      if (x >= leftCenterZone && x <= rightCenterZone) {
        // Центральная область - показать меню
        emit("tap", "center", x, y);
      } else {
        // В left или right nav области - определяем по половинам
        if (y < centerY) {
          // Верхняя половина nav области
          emit("tap", "top", x, y);
          swiper.slidePrev();
        } else {
          // Нижняя половина nav области
          emit("tap", "bottom", x, y);
          swiper.slideNext();
        }
      }
    }
  }
};

watchEffect(() => {
  if (text && swiperRef.value) {
    const container = swiperRef.value;
    const cssClasses = "text-page reading-text prayer-text";

    swiperRect = container.getBoundingClientRect();
    console.log(
      "estimating pages: ",
      estimatePageCount(text, container, cssClasses)
    );
    const pages = paginateText(text, container, cssClasses);

    updateSlides(pages);
  }
});

watchEffect(() => {
  if (swiperRef.value) {
    console.log("TextPaginator swiper initialized:", swiperRef.value);
  }
});

// Expose swiper instance for parent component
defineExpose({
  swiper: swiperRef,
  goToSlide: (index: number) => {
    if (swiperRef.value?.swiper) {
      swiperRef.value.swiper.slideTo(index);
    }
  },
  getCurrentSlide: () => {
    return swiperRef.value?.swiper?.activeIndex || 0;
  },
});
</script>

<style scoped lang="less">
.text-paginator {
  position: absolute;
  top: var(--f7-safe-area-top);
  left: 0;
  bottom: var(--f7-safe-area-bottom);
  width: 100%;
}
</style>
