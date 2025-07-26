<template>
  <!-- :touchStartPreventDefault="false" -->
  <swiper-container 
    :key="`swiper-${mode}`"
    :class="`text-paginator mode-${mode} reading-text ${lang ? 'prayer-text lang-' + lang : ''} theme-${theme}`" 
    ref="swiper"     
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
    :touchRatio="1"
    :threshold="3"
    @tap="handleTap"
    @slidechange="handleSlideChange"
    @touchstart="handleTouchStart"
    @progress="handleProgress"
    @settransition="handleSetTransition" >
  </swiper-container>
  <div :class="`text-paginator-progress reading-text theme-${theme}`"
       v-if="!isLoading && !isCalculating" >
    <f7-progressbar 
      :progress="Math.round(currentProgress * 10000) / 100"       
    />
  </div>  
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
import { useTemplateRef, watchEffect, ref, shallowRef, watch, computed, nextTick, readonly } from "vue";
import { useTextSelection } from "@/composables/useTextSelection";
import { useSettingsStore } from "@/stores/settings";
import { useTextSettings } from "@/composables/useTextSettings";
import { usePaginationCache } from "@/composables/usePaginationCache";
import type { SwiperContainer } from "swiper/element";
import type { Swiper } from "swiper";
import type { TextTheme, Language } from "@/types/common";
import {
  paginateText,
} from "@/text-processing";

const { 
  text, 
  lang = null, 
  isLoading = false, 
  initialProgress = 0,
  itemId = null
} = defineProps<{
  text: string;
  initialProgress?: number;
  lang?: Language | null;
  isLoading?: boolean;
  itemId?: string | null;
}>();

const swiperRef = useTemplateRef<SwiperContainer>("swiper");

const settingsStore = useSettingsStore();
const { } = useTextSettings(); // Инициализируем синхронизацию настроек текста глобально
const { getPaginatedText } = usePaginationCache();

const mode = computed(() => settingsStore.pageMode);

// Используем настройки из store
const theme = computed(() => settingsStore.textTheme);

// Events
const emit = defineEmits<{
  tap: [payload: { type: "center" | "left" | "right" | "top" | "bottom"; x: number; y: number }];
  progress: [payload: { progress: number, pages: number }];
  touchstart: [payload: { swiper: Swiper, event: PointerEvent }];
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
      // swiper.translateTo(swiper.translate + swiperRect.height, swiper.params.speed || 300);
    } else if (y > bottomZone) {
      // Нижняя область - следующая страница
      emit("tap", { type: "bottom", x, y });
      // swiper.slideNext();
      // swiper.translateTo(swiper.translate - swiperRect.height, swiper.params.speed || 300);
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
        } else {
          // Нижняя половина nav области
          emit("tap", { type: "bottom", x, y });
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

  console.log("handleProgress progress = ", progress);

  currentProgress.value = progress;
};

const pages = shallowRef<string[]>([]);

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

  const container = swiperRef.value;


  if (text && container) {
    
    isCalculating.value = true;    
    const cssClasses = `text-page reading-text ${lang ? 'prayer-text lang-' + lang : ''} theme-${theme.value}`;
    
    // Используем кэш если доступен itemId
    if (itemId) {
      pages.value = await getPaginatedText(itemId, lang, text, container, cssClasses);
    } else {
      // Fallback к прямой пагинации
      pages.value = await paginateText(text, container, cssClasses);
    }
    
    updateSlides(pages.value);

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
  if (!swiper || pages.value.length === 0) {
    isCalculating.value = false;
    return;
  }  
  
  // Обновляем слайды в новом swiper
  updateSlides(pages.value);
  
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
  if (!e.detail || !e.detail[0]) {
    return;
  }
  const [swiper, event] = e.detail;
  emit("touchstart", { swiper, event });
};

let transtionTimeout: ReturnType<typeof setTimeout> | null = null;
const isTransitioning = ref(false);

const handleSetTransition = (e: CustomEvent<[swiper: Swiper, transition: number]>) => {
  const [swiper, transition] = e.detail;
 
  if (transtionTimeout) {
    clearTimeout(transtionTimeout);
    transtionTimeout = null;
  }

  if (transition === 0) {
    setTimeout(() => {
      isTransitioning.value = false;
      console.log("handleSetTransition transition end", swiper, transition);
    }, 0);
    return;
  } 

  console.log("handleSetTransition transition start", swiper, transition);
  

  isTransitioning.value = true;
  transtionTimeout = setTimeout(() => {
    transtionTimeout = null;
    isTransitioning.value = false;
    console.log("handleSetTransition transition end", swiper, transition);
  }, transition);
};


let lastTranslatePosition = 0;
let lastTranslatePositionTimeout: ReturnType<typeof setTimeout> | null = null;

// Expose swiper instance for parent component
defineExpose({
  isCalculating: readonly(isCalculating),
  isTransitioning: readonly(isTransitioning),
  mode: readonly(mode),
  progress: readonly(currentProgress),
  pagesCount: computed(() => pages.value.length),
  goToPage: (page: number, animate: boolean = true) => {
    if (swiperRef.value?.swiper) {
      swiperRef.value.swiper.slideTo(page - 1, animate ? 300 : 0);
    }
  },
  setProgress: (progress: number) => swiperRef.value?.swiper.setProgress(progress),
  slidePrev: () => {
    const swiper = swiperRef.value?.swiper;
    if (!swiper) {
      return;
    }
    if (mode.value === "horizontal") {
      swiper.slidePrev();
    } else {

      const speed = swiper.params.speed || 300;

      if (lastTranslatePosition === 0) {
        lastTranslatePosition = swiper.translate + swiperRect.height;
        
      } else {
        lastTranslatePosition = lastTranslatePosition + swiperRect.height;
      }

      if (lastTranslatePositionTimeout) {
        clearTimeout(lastTranslatePositionTimeout);
        lastTranslatePositionTimeout = null;
      }

      lastTranslatePositionTimeout = setTimeout(() => {
        lastTranslatePosition = 0;
        lastTranslatePositionTimeout = null;
      }, speed);

      swiper.translateTo(lastTranslatePosition, speed);
    }
  },
  slideNext: () => {
    const swiper = swiperRef.value?.swiper;
    if (!swiper) {
      return;
    }

    if (mode.value === "horizontal") {
      swiper.slideNext();
    } else {

      const speed = swiper.params.speed || 300;
      if (lastTranslatePosition === 0) {
        lastTranslatePosition = swiper.translate - swiperRect.height;
        
      } else {
        lastTranslatePosition = lastTranslatePosition - swiperRect.height;
      }

      if (lastTranslatePositionTimeout) {
        clearTimeout(lastTranslatePositionTimeout);
        lastTranslatePositionTimeout = null;
      }

      lastTranslatePositionTimeout = setTimeout(() => {
        lastTranslatePosition = 0;
        lastTranslatePositionTimeout = null;
      }, speed);

      swiper.translateTo(lastTranslatePosition, speed);
    }
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
}
.skeleton-text-line {
  margin-bottom: 0.3em;
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
