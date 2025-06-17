<template>
  <swiper-container
    class="text-paginator"
    ref="swiper"
    :virtual="{
      slides: slides,
      renderExternal,
    }"
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
    <swiper-slide
      class="text-paginator-slide"
      v-for="slide in swData.slides"
      :key="slide.id"
      :style="mode === 'horizontal' ? `left: ${swData.offset}px;` : `top: ${swData.offset}px;`"
    >
      <div class="text-page reading-text prayer-text theme-grey">
        <div v-html="slide.content"></div>
      </div>
    </swiper-slide>
  </swiper-container>
</template>

<script setup lang="ts">
import { ref, useTemplateRef, watchEffect, nextTick } from "vue";
import type { SwiperContainer } from "swiper/element";
import { estimatePageCount, paginateText, type Slide } from "@/utils/textPagination";

interface SwiperData {
  slides: Slide[];
  offset: number;
}

const { text, mode = 'horizontal' } = defineProps<{
  mode?: 'vertical' | 'horizontal';
  text: string;
}>();

const swData = ref<SwiperData>({
  slides: [],
  offset: 0,
});

const renderExternal = (data: SwiperData) => {
  swData.value = data;
};

// Создаем слайды из текста
const slides = ref<Slide[]>([]);

const swiper = useTemplateRef<SwiperContainer>("swiper");

watchEffect(() => {
  if (text) {
    const container = document.querySelector('.text-paginator') as HTMLElement;
    const cssClasses = 'text-page reading-text prayer-text';
    console.log('estimating pages: ', estimatePageCount(text, container, cssClasses));
    console.time('paginateText');
    const paginatedSlides = paginateText(text, container, cssClasses);
    slides.value = paginatedSlides;
    console.timeEnd('paginateText');

    console.log('paginatedSlides', paginatedSlides);
    
    // Обновляем swiper с новыми слайдами
    nextTick(() => {
      if (swiper.value?.swiper) {
        swiper.value.swiper.virtual.slides = paginatedSlides;
        swiper.value.swiper.virtual.update(true);
      }
    });
  }
});

watchEffect(() => {
  if (swiper.value) {
    console.log('TextPaginator swiper initialized:', swiper.value);
  }
});

// Expose swiper instance for parent component
defineExpose({
  swiper,
  goToSlide: (index: number) => {
    if (swiper.value?.swiper) {
      swiper.value.swiper.slideTo(index);
    }
  },
  getCurrentSlide: () => {
    return swiper.value?.swiper?.activeIndex || 0;
  },
  getTotalSlides: () => {
    return slides.value.length;
  }
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

.text-paginator-slide {
  transition-duration: 0.3s;
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