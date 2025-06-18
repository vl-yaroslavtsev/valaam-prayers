<template>
  <swiper-container
    class="text-paginator"
    ref="swiper"
    :virtual="{
      slides: [],
    }"
    height="100%"
    :direction="mode"
    :freeMode="mode === 'vertical'"
    :speed="300"
    :effect="mode === 'horizontal' ? 'creative' : 'slide'"
    :creativeEffect="{
      prev: {
        shadow: true,
        translate: ['-20%', 0, -1],
      },
      next: {
        translate: ['100%', 0, 0],
      },
    }"
  >
  </swiper-container>
</template>

<script setup lang="ts">
import { ref, useTemplateRef, watchEffect, nextTick, onMounted } from "vue";
import type { SwiperContainer } from "swiper/element";
import {
  estimatePageCount,
  paginateText,
  type Slide,
} from "@/text-processing";

const { text, mode = "horizontal" } = defineProps<{
  mode?: "vertical" | "horizontal";
  text: string;
}>();

const swiperRef = useTemplateRef<SwiperContainer>("swiper");

const updateSlides = (slides: Slide[]) => {
  const template = `<div class="text-page reading-text prayer-text theme-grey">$content</div>`;

  const swiper = swiperRef.value?.swiper;
  if (!swiper) {
    return;
  }

  swiper.virtual.slides = slides.map((slide) =>
    template.replace("$content", slide.content)
  );
  swiper.virtual.update(true);
};

watchEffect(() => {
  if (text) {
    const container = document.querySelector(".text-paginator") as HTMLElement;
    const cssClasses = "text-page reading-text prayer-text";
    console.log(
      "estimating pages: ",
      estimatePageCount(text, container, cssClasses)
    );
    console.time("paginateText");
    const paginatedSlides = paginateText(text, container, cssClasses);
    console.timeEnd("paginateText");

    updateSlides(paginatedSlides);
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
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
}

:global(.text-page) {
  --page-border-color: var(--content-color-black-100);

  padding: 16px 24px 24px 24px;
  height: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid var(--page-border-color);
}

.dark {
  .text-page {
    --page-border-color: var(--content-color-baige-100);
  }
}
</style>
