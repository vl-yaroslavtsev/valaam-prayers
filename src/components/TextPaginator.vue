<template>
  <swiper-container 
    :key="`swiper-${mode}`"
    :class="`text-paginator mode-${mode} reading-text prayer-text lang-${lang} theme-${theme}`" 
    ref="swiper" 
    :touchStartPreventDefault="false"
    :virtual="{
      slides: [],
      addSlidesAfter: 1,
      addSlidesBefore: 1,
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
    @tap="handleTap"
    @slidechange="handleSlideChange"
    @progress="handleProgress">
  </swiper-container>
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
</template>
<script setup lang="ts">
import { useTemplateRef, watchEffect, ref, watch, computed, nextTick } from "vue";
import { useTextSelection } from "@/composables/useTextSelection";
import { useSettingsStore } from "@/stores/settings";
import { useTextSettings } from "@/composables/useTextSettings";
import type { SwiperContainer } from "swiper/element";
import type { Swiper } from "swiper";
import type { TextTheme, Language } from "@/types/common";
import {
  paginateText,
} from "@/text-processing";

const { 
  text, 
  lang = "cs-cf", 
  isLoading = false, 
  initialProgress = 0
} = defineProps<{
  text: string;
  initialProgress?: number;
  lang?: Language;
  isLoading?: boolean;
}>();

const swiperRef = useTemplateRef<SwiperContainer>("swiper");

const settingsStore = useSettingsStore();
const { } = useTextSettings(); // Инициализируем синхронизацию настроек текста глобально

const mode = computed(() => settingsStore.pageMode);

// Используем настройки из store
const theme = computed(() => settingsStore.textTheme);

// Events
const emit = defineEmits<{
  tap: [payload: { type: "center" | "left" | "right" | "top" | "bottom"; x: number; y: number }];
  progress: [payload: { progress: number, pages: number }];
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
const currentProgress = ref<number>(initialProgress);

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


const { clearSelection, isSelected } = useTextSelection();

const handleTap = (e: CustomEvent<[swiper: Swiper, event: PointerEvent]>) => {

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

  // Определяем область касания в зависимости от режима
  if (mode.value === "horizontal") {
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
      swiper.slidePrev();
    } else if (x > rightZone) {
      // Правая область - следующая страница
      emit("tap", { type: "right", x, y });
      swiper.slideNext();
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
          swiper.slidePrev();
        } else {
          // Правая половина nav области
          emit("tap", { type: "right", x, y });
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
      emit("tap", { type: "top", x, y });
      // swiper.slidePrev();
      swiper.translateTo(swiper.translate + swiperRect.height, swiper.params.speed || 300);
    } else if (y > bottomZone) {
      // Нижняя область - следующая страница
      emit("tap", { type: "bottom", x, y });
      // swiper.slideNext();
      swiper.translateTo(swiper.translate - swiperRect.height, swiper.params.speed || 300);
    } else {
      // Находимся в центральной вертикальной зоне
      if (x >= leftCenterZone && x <= rightCenterZone) {
        // Центральная область - показать меню
        emit("tap", { type: "center", x, y });
      } else {
        // В left или right nav области - определяем по половинам
        if (y < centerY) {
          // Верхняя половина nav области
          emit("tap", { type: "top", x, y });
          swiper.slidePrev();
        } else {
          // Нижняя половина nav области
          emit("tap", { type: "bottom", x, y });
          swiper.slideNext();
        }
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

const restoreProgress = () => {
  const progress = currentProgress.value;

  if (!progress || !swiperRef.value) {
    return;
  }
  
  const swiper = swiperRef.value.swiper;

  if (mode.value === "horizontal") {
    swiper.slideTo(Math.floor(progress * swiper.virtual.slides.length), 0);
  } else {
    swiper.setProgress(progress);
  }
};

const handleProgress = (e: CustomEvent<[swiper: Swiper, progress: number]>) => {
  const [swiper, progress] = e.detail;

  if (isLoading || isCalculating.value) {
    return;
  }

  currentProgress.value = progress;
  
  emit("progress", { 
    progress: progress, 
    pages: swiper.virtual.slides.length,
  });
};

let pages: string[] = [];

watch([
  () => text, 
  () => settingsStore.fontFamily, 
  () => settingsStore.fontSize, 
  () => settingsStore.lineHeight,
  () => settingsStore.isTextAlignJustified,
  () => settingsStore.isTextWordsBreak,
  () => settingsStore.isTextPagePadding,
  () => settingsStore.isTextBold,
], 
async () => {
  const container = swiperRef.value;

  console.log("TextPaginator watch", settingsStore.fontFamily, settingsStore.fontSize, settingsStore.lineHeight);

  if (text && container) {
    
    isCalculating.value = true;    
    const cssClasses = `text-page reading-text prayer-text theme-${theme.value} lang-${lang}`;
    
    pages = await paginateText(text, container, cssClasses);
    updateSlides(pages);

    restoreProgress();

    isCalculating.value = false;
  }
});

watch(mode, async (newMode) => {

  isCalculating.value = true;
  // При смене режима компонент пересоздается благодаря key
  // Нужно только дождаться пересоздания и обновить слайды
  await nextTick();
  
  const swiper = swiperRef.value?.swiper;
  if (!swiper || pages.length === 0) {
    isCalculating.value = false;
    return;
  }  
  
  // Обновляем слайды в новом swiper
  updateSlides(pages);
  
  // Восстанавливаем позицию используя сохраненный прогресс или initialProgress
  restoreProgress();
  
  isCalculating.value = false;
});

watchEffect(() => {
  if (swiperRef.value) {
    console.log("TextPaginator swiper initialized:", swiperRef.value);
  }
});

// Expose swiper instance for parent component
defineExpose({
  swiper: swiperRef,
  goToPage: (page: number) => {
    if (swiperRef.value?.swiper) {
      swiperRef.value.swiper.slideTo(page - 1);
    }
  }
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
}
.skeleton-text-line {
  margin-bottom: 0.3em;
}
</style>
