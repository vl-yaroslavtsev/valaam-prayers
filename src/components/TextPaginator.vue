<template>
  <TextPagerHorizontal
    v-if="mode === 'horizontal'"
    ref="pager"
    :theme="theme"
    :lang="displayedLang"
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
    :lang="displayedLang"
    :isLoading="isLoading"
    :isCalculating="isCalculating"
    :bookmarked-pages="bookmarkedPages"
    :show-bookmark-tabs="showBookmarkTabs"
    :pages-count="pagesCount"
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

// Класс языка на странице меняем вместе с новыми страницами. Иначе старый HTML
// на кадр рисуется уже новым шрифтом (ЦСЯ — гражданской гарнитурой).
const displayedLang = ref<Language | null>(lang);

const FROZEN_READING_VARS = [
  "--reading-text-font-family",
  "--reading-text-font-size",
  "--reading-text-line-height",
  "--reading-text-font-family-cs",
  "--reading-text-font-size-cs",
  "--reading-text-line-height-cs",
  "--reading-text-align",
  "--reading-text-hyphens",
  "--reading-text-font-weight",
] as const;

// Пока страницы не пересчитаны, держим на контейнере прежние переменные.
// useTextSettings обновляет :root позже (flush: post), поэтому снимок ещё старый.
const freezeReadingStyles = (el: HTMLElement) => {
  const root = getComputedStyle(document.documentElement);
  for (const name of FROZEN_READING_VARS) {
    const value = root.getPropertyValue(name);
    if (value) {
      el.style.setProperty(name, value);
    }
  }
  const y = root.getPropertyValue("--reading-text-page-padding-y").trim();
  const x = root.getPropertyValue("--reading-text-page-padding-x").trim();
  const bottom = root.getPropertyValue("--reading-text-page-padding-bottom").trim();
  if (y && x && bottom) {
    el.style.setProperty("--text-page-padding", `${y} ${x} ${bottom}`);
  }
};

const unfreezeReadingStyles = (el: HTMLElement) => {
  for (const name of FROZEN_READING_VARS) {
    el.style.removeProperty(name);
  }
  el.style.removeProperty("--text-page-padding");
};

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

const readingCssClasses = () =>
  `text-page reading-text ${lang ? "prayer-text lang-" + lang : ""} theme-${theme.value}`;

// Индекс вне диапазона страниц: подсветка поиска кэшируется по номеру страницы,
// куски полотна не должны занимать эти слоты.
const FLOW_HIGHLIGHT_INDEX_OFFSET = 1_000_000;

// Применяет посчитанные страницы к активному в данный момент рендереру.
// В вертикальном режиме на экран идёт исходный текст, нарезанный на куски.
const applyPages = () => {
  if (mode.value === "vertical") {
    const highlight = highlightTransform
      ? (html: string, index: number) => highlightTransform(html, FLOW_HIGHLIGHT_INDEX_OFFSET + index)
      : undefined;
    (pager.value as InstanceType<typeof TextPagerVertical> | null)?.applyText(text, readingCssClasses(), highlight);
  } else {
    const finalPages = highlightTransform
      ? pages.value.map((html, i) => highlightTransform(html, i))
      : pages.value;
    (pager.value as InstanceType<typeof TextPagerHorizontal> | null)?.applyPages(finalPages);
  }
  displayedLang.value = lang;
};

const restoreProgress = () => {
  const progress = currentProgress.value;

  if (!progress) {
    return;
  }

  pager.value?.restoreProgress(progress);
};

let loadGeneration = 0;

const loadReading = async (container: HTMLElement) => {
  const generation = ++loadGeneration;
  const pageMode = mode.value;
  isCalculating.value = true;
  resetCalculatingProgress();
  freezeReadingStyles(container);
  let stylesReleased = false;
  const releaseStyles = () => {
    if (stylesReleased) return;
    stylesReleased = true;
    unfreezeReadingStyles(container);
  };

  try {
    const cssClasses = readingCssClasses();
    const cached = await getCachedText(itemId, lang, modifiedTs, pageMode);
    if (generation !== loadGeneration) {
      return;
    }
    if (cached) {
      pages.value = cached.pages;
      headers.value = cached.headers;
    } else {
      if (text.length > 38000) {
        isShowCalculating.value = true;
      }

      const result = await paginateText(text, container, cssClasses, (progress) => {
        if (generation !== loadGeneration) {
          return;
        }
        pushCalculatingProgress(progress);
      });
      if (generation !== loadGeneration) {
        return;
      }
      pages.value = result.pages;
      headers.value = result.headers;
      setCachedText(itemId, lang, pages.value, headers.value, modifiedTs, pageMode);
    }

    // Новые страницы, класс языка и живые CSS-переменные — в одном кадре.
    // Стили снимаем до отрисовки: вертикальные куски меряют высоту по ним.
    releaseStyles();
    applyPages();
    restoreProgress();

    if (isShowCalculating.value) {
      pushCalculatingProgress(1);
      await waitCalculatingProgress();
    }
  } finally {
    releaseStyles();
    if (generation === loadGeneration) {
      isShowCalculating.value = false;
      isCalculating.value = false;
    }
  }
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
    await loadReading(container);
  }
});

watch(mode, async () => {
  // Смена режима пересоздаёт рендерер. Инвалидируем текущий расчёт и читаем кэш нового режима.
  const generationAtSwitch = ++loadGeneration;
  isCalculating.value = true;
  await nextTick();
  if (generationAtSwitch !== loadGeneration) {
    return;
  }

  const container = pager.value?.containerEl;
  if (!text || !container) {
    isCalculating.value = false;
    isShowCalculating.value = false;
    return;
  }

  await loadReading(container);
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
