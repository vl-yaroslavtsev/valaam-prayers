<template>
  <f7-toolbar 
    ref="pageNavToolbar"
    class="page-navigation-toolbar"
    bottom
    hidden
  >
    <div class="header">
      <f7-link 
        class="reset-link" 
        icon-only 
        href="#"
        @click="handleResetProgress"
      >
        <SvgIcon icon="reset" :color="iconColor" />
      </f7-link>
      
      <div class="page-counter">
        {{ displayedPage }} из {{ totalPages }}
      </div>
    </div>
      
    <f7-range
      v-if="!isHidden"
      ref="pageRangeSlider"
      class="page-range-slider"
      :min="1"
      :max="totalPages"
      :step="1"
      :value="sliderValue"
      @range:change="handlePageSliderChange"
      @range:changed="handlePageSliderChanged"
      @pointerdown.passive="handlePageSliderStart"
      @pointerup.passive="handlePageSliderEnd"
      @pointercancel.passive="handlePageSliderEnd"
      @pointermove.passive="handleSliderTouchMove"
      @touchstart.passive="handlePageSliderStart"
      @touchend.passive="handlePageSliderEnd"
      @touchmove.passive="handleSliderTouchMove"
    />
  </f7-toolbar>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, useTemplateRef, type ComponentPublicInstance } from "vue";
import { f7 } from "framework7-vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";
import { device } from "@/js/device";

interface Props {
  currentPage: number;
  totalPages: number;
  isHidden: boolean;
  animateVisibility?: boolean;
}

interface Emits {
  (e: 'page-change', value: number): void;
  (e: 'reset-progress'): void;
  // Текст ещё не соответствует счётчику — реальный переход отложен (см. schedulePageChange)
  (e: 'scrub-move', page: number): void;
  // Текст снова соответствует счётчику — переход применён (debounce сработал или отпустили палец)
  (e: 'scrub-settle'): void;
  // Палец убрали со слайдера
  (e: 'scrub-end'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const pageNavToolbar = useTemplateRef<ComponentPublicInstance>("pageNavToolbar");
const pageRangeSlider = useTemplateRef<ComponentPublicInstance>("pageRangeSlider");

// f7-range считает своё значение по абсолютной позиции пальца на треке (см.
// handleTouchStart в node_modules/framework7/components/range/range-class.js),
// а не относительно точки, где схватили ручку. При 500+ страницах на пиксель
// трека приходится больше одной страницы, поэтому даже небольшая неточность
// касания (толщина пальца) даёт "прыжок" ручки — причём меняется и внутреннее
// состояние f7-range, так что прыжок может просочиться в range:changed при
// отпускании, даже если палец вообще не двигался. Достаём реальный экземпляр,
// чтобы откатывать такие прыжки (см. handleSliderTouchMove/handlePageSliderChange).
const getF7Range = (): { setValue: (value: number, byTouchMove?: boolean) => void } | null => {
  const el = pageRangeSlider.value?.$el as (HTMLElement & { f7Range?: { setValue: (value: number, byTouchMove?: boolean) => void } }) | undefined;
  return el?.f7Range ?? null;
};

const { isDarkMode } = useTheme();
const iconColor = computed(() => (isDarkMode.value ? "baige-60" : "black-40"));

// На Android/iOS системный жест "Назад" (свайп от края экрана) перехватывает
// касания нижнего меню у краёв. Отключаем его на всё время показа тулбара, а не
// по pointerdown: системный жест начинается раньше, чем до нас дойдёт касание.
// Область — полоса по высоте тулбара на всю ширину экрана: у панели есть
// горизонтальные отступы, но палец может уйти за них к краю. Высоту берём из
// layout (offsetHeight), а не из getBoundingClientRect: во время анимации
// показа/скрытия transform уводит элемент за экран, и visual-rect был бы меньше.
let isBackGestureDisabled = false;

const disableBackGestureForToolbar = () => {
  const el = pageNavToolbar.value?.$el as HTMLElement | undefined;
  if (!el) return;
  const height = el.offsetHeight;
  if (height <= 0) return;
  device.disableBackGestureInArea({
    x: 0,
    y: window.innerHeight - height,
    width: window.innerWidth,
    height,
  });
  isBackGestureDisabled = true;
};

const enableBackGesture = () => {
  if (!isBackGestureDisabled) return;
  device.enableBackGesture();
  isBackGestureDisabled = false;
};

const applyVisibility = (isHidden: boolean) => {
  if (!pageNavToolbar.value) return;
  const pageNavToolbarEl = pageNavToolbar.value.$el;
  const animate = props.animateVisibility !== false;
  if (isHidden) {
    enableBackGesture();
    f7.toolbar.hide(pageNavToolbarEl, animate);
  } else {
    f7.toolbar.show(pageNavToolbarEl, animate);
    disableBackGestureForToolbar();
  }
};

watch(() => props.isHidden, applyVisibility);
onMounted(() => applyVisibility(props.isHidden));

// Во время перетаскивания ползунок не должен получать :value с пагинатора —
// иначе каждый goToPage дёргает ручку назад. Счётчик берём из слайдера сразу,
// а сам переход по тексту откладываем (см. schedulePageChange ниже).
const isScrubbing = ref(false);
const sliderValue = ref(props.currentPage);
const scrubPage = ref(props.currentPage);
const displayedPage = computed(() =>
  isScrubbing.value ? scrubPage.value : props.currentPage
);

watch(
  () => props.currentPage,
  (page) => {
    if (!isScrubbing.value) {
      sliderValue.value = page;
      // scrubPage тоже должен быть свежим: это то, что покажет счётчик в момент
      // handlePageSliderStart, ещё до первого движения (иначе мелькнёт значение
      // с момента монтирования компонента, например 0, если текст ещё не был готов)
      scrubPage.value = page;
    }
  }
);

// Реальный goToPage — это не просто передвижение ручки, а пересчёт progress/
// currentPage/subtitle и переход в пагинаторе (скролл/слайд). При быстрой протяжке
// по ползунку это может вызываться десятки раз в секунду и тормозить даже сам драг.
// Поэтому пока палец двигается, откладываем реальный переход (дебаунс), а не
// вызываем его на каждый кадр — обновляется только счётчик (см. displayedPage).
const SCRUB_DEBOUNCE_MS = 100;

let pendingPage: number | null = null;
let lastSentPage: number | null = null;
let pageChangeTimer: ReturnType<typeof setTimeout> | null = null;

// true — было реальное touchmove/pointermove с начала протяжки. Пока пальцем
// не двигали, любое значение от f7-range — это шумовой "прыжок" от касания,
// а не осознанный жест (см. getF7Range выше)
let hasMoved = false;
let scrubStartPage = props.currentPage;
let isCorrectingRangeJump = false;

const sendPageChange = (page: number) => {
  if (page === lastSentPage) {
    return;
  }
  lastSentPage = page;
  pendingPage = null;
  emit("page-change", page);
  // К этому моменту goToPage уже применён синхронно — текст соответствует счётчику
  emit("scrub-settle");
};

const schedulePageChange = (page: number) => {
  pendingPage = page;
  if (pageChangeTimer) {
    clearTimeout(pageChangeTimer);
  }
  pageChangeTimer = setTimeout(() => {
    pageChangeTimer = null;
    if (pendingPage != null) {
      sendPageChange(pendingPage);
    }
  }, SCRUB_DEBOUNCE_MS);
};

const flushPageChange = () => {
  if (pageChangeTimer) {
    clearTimeout(pageChangeTimer);
    pageChangeTimer = null;
  }
  if (pendingPage != null) {
    sendPageChange(pendingPage);
  }
};

const handlePageSliderStart = () => {
  isScrubbing.value = true;
  lastSentPage = null;
  hasMoved = false;
  scrubStartPage = scrubPage.value;
  // Текст пока не прячем: до первого движения показанная страница ещё верна
};

const handleSliderTouchMove = () => {
  hasMoved = true;
};

const finishScrub = () => {
  if (!isScrubbing.value) {
    return;
  }
  flushPageChange();
  sliderValue.value = scrubPage.value;
  isScrubbing.value = false;
  emit("scrub-end");
};

const handlePageSliderEnd = () => {
  finishScrub();
  // Всегда сообщаем родителю: палец убрали, даже если finishScrub уже сработал
  // по range:changed (иначе заголовок может остаться на экране)
  emit("scrub-end");
};

const handlePageSliderChange = (value: number) => {
  if (!isScrubbing.value || isCorrectingRangeJump) {
    return;
  }
  if (!hasMoved) {
    // Пальцем ещё не двигали — это "прыжок" f7-range от касания, а не жест.
    // Откатываем ручку обратно (byTouchMove=true, чтобы не улетело в range:changed)
    isCorrectingRangeJump = true;
    getF7Range()?.setValue(scrubStartPage, true);
    isCorrectingRangeJump = false;
    return;
  }
  scrubPage.value = value;
  emit("scrub-move", value);
  schedulePageChange(value);
};

const handlePageSliderChanged = (value: number) => {
  // Палец не двигался — не даём просочиться "прыжковому" значению даже на отпускании
  const resolvedValue = hasMoved ? value : scrubStartPage;
  if (typeof resolvedValue === "number" && !Number.isNaN(resolvedValue)) {
    scrubPage.value = resolvedValue;
    pendingPage = resolvedValue;
  }
  if (isScrubbing.value) {
    finishScrub();
    return;
  }
  // pointerup мог завершить scrub раньше, чем range:changed отдал финальное значение
  sendPageChange(scrubPage.value);
  sliderValue.value = scrubPage.value;
};

onBeforeUnmount(() => {
  if (pageChangeTimer) {
    clearTimeout(pageChangeTimer);
    pageChangeTimer = null;
  }
  enableBackGesture();
});

const handleResetProgress = () => {
  emit('reset-progress');
};
</script>

<style scoped lang="less">
.page-navigation-toolbar {
  z-index: 600;
  --f7-toolbar-height: calc(70px + var(--f7-safe-area-bottom));
  --f7-link-touch-ripple-color: rgba(255, 255, 255, 0.15);
  --page-counter-color: var(--content-color-black-60);

  --f7-range-bar-bg-color: var(--content-color-black-20);
  --f7-range-bar-active-bg-color: var(--brand-color-primary-accent-50);
  --f7-range-knob-color: var(--brand-color-primary-accent-50);
  
  --f7-range-bar-size: 4px;
  --f7-range-bar-border-radius: 2px;
  --f7-range-knob-width: 16px;
  --f7-range-knob-height: 32px;

  :deep(.toolbar-inner) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    padding: 8px 16px;
    gap: 8px;
  }

  .header {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 10px;
    height: 24px;
    width: 100%;
    position: relative;
  }

  .reset-link {
    position: absolute;
    right: 0;
    left: 0;
    width: 24px;
    height: 24px;
    padding: 0;
  }
  
  .page-counter {
    font-size: 14px;
    line-height: 130%;
    letter-spacing: 0.05em;
    color: var(--page-counter-color);
    text-align: center;
  }
  
  .page-range-slider {
    width: 100%;
  }
}

:global(.dark .page-navigation-toolbar) {
  --page-counter-color: var(--content-color-baige-60);
  --f7-range-bar-bg-color: var(--content-color-baige-30);
}
</style>