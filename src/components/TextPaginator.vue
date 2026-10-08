<template>
  <TextPagerHorizontal
    v-if="mode === 'horizontal'"
    ref="pager"
    :theme="theme"
    :lang="lang"
    :isLoading="isLoading"
    :isCalculating="isCalculating"
    @tap="emit('tap', $event)"
    @touchstart="emit('touchstart', $event)"
    @touchend="emit('touchend', $event)"
    @update:progress="currentProgress = $event"
    @update:transitioning="isTransitioning = $event"
  />
  <TextPagerVertical
    v-else
    ref="pager"
    :theme="theme"
    :lang="lang"
    :isLoading="isLoading"
    :isCalculating="isCalculating"
    :bookmarked-pages="bookmarkedPages"
    :show-bookmark-tabs="showBookmarkTabs"
    @tap="emit('tap', $event)"
    @touchstart="emit('touchstart', $event)"
    @touchend="emit('touchend', $event)"
    @update:progress="currentProgress = $event"
    @update:transitioning="isTransitioning = $event"
  />
  <div :class="`text-paginator-progress theme-${theme}`"
       v-if="!isLoading && !isCalculating && pagesCount > 0">
    <button type="button" class="text-paginator-progress-label" @click.stop="cycleProgressMode">
      {{ progressLabel }}
    </button>
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
</template>
<script setup lang="ts">
import { useTemplateRef, ref, shallowRef, watch, computed, nextTick, readonly, onUnmounted } from "vue";
import { useSettingsStore } from "@/stores/settings";
import { useTextSettings } from "@/composables/useTextSettings";
import { usePaginationCache } from "@/composables/usePaginationCache";
import { useDelayed } from "@/composables/useDelayed";

import type { PaginationCacheItemHeader } from "@/services/storage/PaginationCacheStorage";
import type { Swiper } from "swiper";
import type { Language } from "@/types/common";
import { paginateText } from "@/text-processing-v3";
import { progressToPage } from "@/composables/useBookmarks";

import TextPagerHorizontal from "./text-paginator/TextPagerHorizontal.vue";
import TextPagerVertical from "./text-paginator/TextPagerVertical.vue";

const { 
  text, 
  lang = null, 
  isLoading = false, 
  initialProgress = 0,
  itemId = 0,
  modifiedTs = 0,
  highlightTransform,
  bookmarkedPages = [],
  showBookmarkTabs = false,
} = defineProps<{
  text: string;
  initialProgress?: number;
  lang?: Language | null;
  isLoading?: boolean;
  itemId: number;
  // PHP-таймстамп последнего изменения текста; нужен, чтобы не брать устаревший кэш страниц
  modifiedTs?: number;
  // Трансформация HTML страницы перед отображением (например, подсветка поиска).
  // Вызывается для каждой страницы при applyPages, не влияет на пагинацию/кэш.
  highlightTransform?: (html: string, pageIndex: number) => string;
  bookmarkedPages?: number[];
  showBookmarkTabs?: boolean;
}>();

const settingsStore = useSettingsStore();
const { } = useTextSettings(); // Инициализируем синхронизацию настроек текста глобально
const { getCachedText, setCachedText } = usePaginationCache();

const mode = computed(() => settingsStore.pageMode);

// Используем настройки из store
const theme = computed(() => settingsStore.textTheme);

// Events
const emit = defineEmits<{
  tap: [payload: { type: "center" | "left" | "right" | "top" | "bottom" | "bookmark"; x: number; y: number; page?: number }];
  progress: [payload: { progress: number, pages: number }];
  touchstart: [payload: { swiper: Swiper | null, event: Event }];
  touchend: [event: Event];
}>();

const isCalculating = ref<boolean>(false);
const isShowCalculating = ref<boolean>(false);

// Используем композабл для отложенного отображения загрузки
const { delayed: isShowLoading } = useDelayed<boolean>(() => isLoading, false, 100);

// Прогресс и статус перехода — единый источник правды на весь жизненный цикл компонента,
// не пересоздаётся при переключении режима (в отличие от активного рендерера ниже)
const currentProgress = ref<number>(initialProgress);
const isTransitioning = ref(false);

type ReadingProgressMode = "fraction" | "page" | "percent";
const PROGRESS_MODES: ReadingProgressMode[] = ["fraction", "page", "percent"];
const PROGRESS_MODE_KEY = "valaam-prayers-reading-progress-mode";

const readProgressMode = (value: string | null): ReadingProgressMode =>
  value === "page" || value === "percent" ? value : "fraction";

const progressMode = ref<ReadingProgressMode>(readProgressMode(localStorage.getItem(PROGRESS_MODE_KEY)));

const cycleProgressMode = () => {
  const next = PROGRESS_MODES[(PROGRESS_MODES.indexOf(progressMode.value) + 1) % PROGRESS_MODES.length];
  progressMode.value = next;
  localStorage.setItem(PROGRESS_MODE_KEY, next);
};
const calculatingProgress = ref<number>(0);
let calculatingTarget = 0;
let calculatingFrame = 0;

const stopCalculatingProgress = () => {
  if (calculatingFrame) {
    cancelAnimationFrame(calculatingFrame);
    calculatingFrame = 0;
  }
};

// Цель приходит рывками (кусок текста то гуще, то реже). Полоска догоняет её
// плавно и не откатывается назад.
const tickCalculatingProgress = () => {
  const delta = calculatingTarget - calculatingProgress.value;
  if (delta <= 0.004) {
    calculatingProgress.value = calculatingTarget;
    calculatingFrame = 0;
    return;
  }
  calculatingProgress.value += delta * 0.22;
  calculatingFrame = requestAnimationFrame(tickCalculatingProgress);
};

const pushCalculatingProgress = (progress: number) => {
  calculatingTarget = Math.max(calculatingTarget, Math.min(1, progress));
  if (!calculatingFrame) {
    calculatingFrame = requestAnimationFrame(tickCalculatingProgress);
  }
};

const resetCalculatingProgress = () => {
  stopCalculatingProgress();
  calculatingTarget = 0;
  calculatingProgress.value = 0;
};

const waitCalculatingProgress = () => new Promise<void>((resolve) => {
  const started = performance.now();
  const finish = () => {
    const caughtUp = calculatingTarget - calculatingProgress.value <= 0.004;
    if (caughtUp || performance.now() - started > 800) {
      calculatingProgress.value = calculatingTarget;
      stopCalculatingProgress();
      resolve();
      return;
    }
    requestAnimationFrame(finish);
  };
  finish();
});

onUnmounted(stopCalculatingProgress);

const pages = shallowRef<string[]>([]);
const headers = shallowRef<PaginationCacheItemHeader[]>([]);
const pagesCount = computed(() => pages.value.length);
const progressLabel = computed(() => {
  const total = pagesCount.value;
  const page = progressToPage(currentProgress.value, total);
  if (progressMode.value === "page") return String(page);
  if (progressMode.value === "percent") {
    return `${total > 0 ? Math.round((page / total) * 100) : 0}%`;
  }
  return `${page} из ${total}`;
});

// Активный в данный момент рендерер (Swiper для горизонтального, VirtualList для
// вертикального) — оба реализуют один и тот же набор методов, см. defineExpose в них
type PagerInstance = InstanceType<typeof TextPagerHorizontal> | InstanceType<typeof TextPagerVertical>;
const pager = useTemplateRef<PagerInstance>("pager");

// Применяет посчитанные страницы к активному в данный момент рендереру
const applyPages = () => {
  const finalPages = highlightTransform
    ? pages.value.map((html, i) => highlightTransform(html, i))
    : pages.value;
  pager.value?.applyPages(finalPages);
};

const restoreProgress = () => {
  const progress = currentProgress.value;

  if (!progress) {
    return;
  }

  pager.value?.restoreProgress(progress);
};

watch([
  () => text,
  () => modifiedTs,
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

  const container = pager.value?.containerEl;

  if (text && container) {
    
    isCalculating.value = true;
    resetCalculatingProgress();    
    const cssClasses = `text-page reading-text ${lang ? 'prayer-text lang-' + lang : ''} theme-${theme.value}`;
    
    // Используем кэш если доступен itemId
    const cached = await getCachedText(itemId, lang, modifiedTs); 
    if (cached) {
      pages.value = cached.pages;
      headers.value = cached.headers;
    } else {
      if (text.length > 38000) {
        isShowCalculating.value = true;
      }

      const result = await paginateText(text, container, cssClasses, (progress) => {
        pushCalculatingProgress(progress);
      });
      pages.value = result.pages;
      headers.value = result.headers;
      setCachedText(itemId, lang, pages.value, headers.value, modifiedTs);
    }
    
    applyPages();

    restoreProgress();

    if (isShowCalculating.value) {
      pushCalculatingProgress(1);
      await waitCalculatingProgress();
    }

    isShowCalculating.value = false;
    isCalculating.value = false;
  }
});

watch(mode, async () => {

  isCalculating.value = true;
  // При смене режима компонент-рендерер пересоздается (v-if/v-else меняет ветку рендера)
  // Нужно только дождаться пересоздания и обновить страницы в новом рендерере
  await nextTick();

  if (pages.value.length === 0 || !pager.value) {
    isCalculating.value = false;
    return;
  }

  // Обновляем страницы в новом рендерере (Swiper или VirtualList)
  applyPages();

  // Восстанавливаем позицию используя сохраненный прогресс или initialProgress
  restoreProgress();

  isCalculating.value = false;
});

// Expose swiper instance for parent component
defineExpose({
  isCalculating: readonly(isCalculating),
  isTransitioning: readonly(isTransitioning),
  theme: readonly(theme),
  mode: readonly(mode),
  progress: readonly(currentProgress),
  pagesCount,
  headers: readonly(headers),
  pages: readonly(pages),
  refreshDisplay: () => applyPages(),
  goToPage: (page: number, animate: boolean = true) => {
    pager.value?.goToPage(page, animate);
  },
  setProgress: (progress: number) => {
    pager.value?.setProgress(progress);
  },
  slidePrev: () => {
    pager.value?.slidePrev();
  },
  slideNext: () => {
    pager.value?.slideNext();
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
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  height: calc(28px + var(--f7-safe-area-bottom));
  display: flex;
  justify-content: center;
  align-items: flex-start;
  pointer-events: none;
}

.text-paginator-progress-label {
  pointer-events: auto;
  width: auto;
  margin: 0;
  padding: 4px 12px;
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  line-height: 130%;
  letter-spacing: 0.05em;
  text-align: center;
  color: var(--content-color-black-40);
  user-select: none;

  .theme-dark & {
    color: var(--content-color-baige-40);
  }
}
</style>
