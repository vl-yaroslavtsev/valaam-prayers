<template>
  <div class="calendar-day-view">
    <div v-if="!isReady" class="page-content">
      <div class="calendar-day-state">
        <template v-if="markersError">
          <p>Не удалось загрузить календарь</p>
          <f7-button small outline @click="calendarStore.refreshMarkers()">Повторить</f7-button>
        </template>
        <f7-preloader v-else />
      </div>
    </div>

    <swiper-container
      v-else
      ref="swiperRef"
      class="calendar-day-swiper"
      :slidesPerView="1"
      :initialSlide="initialSlideIndex"
      :spaceBetween="16"
      :speed="300"
      :threshold="5"
      :virtual="virtualParams"
      @swiperinit="onSwiperInit"
      @swiperslidechange="onSlideChange"
      @swipervirtualupdate="onVirtualUpdate"
    >
      <swiper-slide
        v-for="(code, index) in virtualData.slides"
        :key="code"
        :data-swiper-slide-index="virtualData.from + index"
        :style="{ left: `${virtualData.offset}px` }"
      >
        <div class="page-content calendar-day-scroll">
          <CalendarDayContent
            v-if="getDay(code)"
            :day="getDay(code)!"
            :has-prev="virtualData.from + index > 0"
            :has-next="virtualData.from + index < allCodes.length - 1"
            :f7router="f7router"
            @prev="swiperRef?.swiper.slidePrev()"
            @next="swiperRef?.swiper.slideNext()"
          />
          <div v-else-if="dayStates[code]?.status === 'error'" class="calendar-day-state">
            <p>Не удалось загрузить день</p>
            <f7-button small outline @click="loadDays([code], true)">Повторить</f7-button>
          </div>
          <div v-else class="calendar-day-state">
            <f7-preloader />
          </div>
        </div>
      </swiper-slide>
    </swiper-container>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowReactive,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";
import { storeToRefs } from "pinia";
import type { Router } from "framework7/types";
import type { SwiperContainer } from "swiper/element";
import type { VirtualData, VirtualOptions } from "swiper/types";
import type { CalendarDayApiElement } from "@/services/api/DaysApi";
import { useCalendarStore } from "@/stores/calendar";
import CalendarDayContent from "./CalendarDayContent.vue";
import { toDateCode } from "./calendarMarkers";

defineProps<{
  f7router: Router.Router;
}>();

/** Код показываемого дня (YYYYMMDD). Пока не задан, открывается сегодняшний день */
const currentCode = defineModel<string | null>({ default: null });

/** Минимальный запас загруженных дней по обе стороны от текущего и размер догрузки одним запросом */
const PREFETCH_MARGIN = 3;
const PREFETCH_CHUNK = 7;

type DayState =
  | { status: "loading" }
  | { status: "loaded"; day: CalendarDayApiElement }
  | { status: "error" };

const calendarStore = useCalendarStore();
const { markers, markersError } = storeToRefs(calendarStore);
const swiperRef = useTemplateRef<SwiperContainer>("swiperRef");

const allCodes = computed(() => (markers.value ? Object.keys(markers.value.days).sort() : []));
const codeToIndex = computed(() => {
  const map = new Map<string, number>();
  allCodes.value.forEach((code, index) => map.set(code, index));
  return map;
});

const clampCode = (code: string, codes: string[]): string => {
  if (code <= codes[0]) return codes[0];
  if (code >= codes[codes.length - 1]) return codes[codes.length - 1];
  if (codeToIndex.value.has(code)) return code;
  return codes.find((item) => item >= code) ?? codes[codes.length - 1];
};

const isReady = computed(() => allCodes.value.length > 0 && currentCode.value != null);
const currentIndex = computed(() =>
  currentCode.value != null ? (codeToIndex.value.get(currentCode.value) ?? -1) : -1
);

const initialSlideIndex = ref(0);
const virtualData = shallowRef<VirtualData<string>>({
  from: 0,
  to: -1,
  offset: 0,
  slides: [],
});

let virtualUpdateScheduled = false;
const syncSwiperAfterVirtualRender = () => {
  if (virtualUpdateScheduled) return;
  virtualUpdateScheduled = true;
  void nextTick(() => {
    virtualUpdateScheduled = false;
    const swiper = swiperRef.value?.swiper;
    if (!swiper || swiper.destroyed || !swiper.params.virtual?.enabled) return;
    swiper.updateSlides();
    swiper.updateProgress();
    swiper.updateSlidesClasses();
  });
};

const virtualParams: VirtualOptions<string> = {
  enabled: true,
  slides: [],
  cache: false,
  // По умолчанию Swiper держит ±1 слайд; +1 даёт 5 живых слайдов (±2 от активного)
  addSlidesBefore: 1,
  addSlidesAfter: 1,
  renderExternal(data) {
    virtualData.value = data;
    syncSwiperAfterVirtualRender();
  },
  renderExternalUpdate: false,
};

const dayStates = shallowReactive<Record<string, DayState>>({});

const getDay = (code: string) => {
  const state = dayStates[code];
  return state?.status === "loaded" ? state.day : null;
};

const loadDays = async (codes: string[], force = false) => {
  const toLoad = codes.filter((code) => force || !dayStates[code]);
  if (toLoad.length === 0) return;

  for (const code of toLoad) {
    dayStates[code] = { status: "loading" };
  }

  const days = await calendarStore.getDaysByCodes(toLoad);
  toLoad.forEach((code, index) => {
    const day = days[index];
    dayStates[code] = day ? { status: "loaded", day } : { status: "error" };
  });
};

// Заранее догружаем пачки дней по PREFETCH_CHUNK, когда до края загруженных данных остаётся <= PREFETCH_MARGIN
const prefetchAround = (index: number) => {
  const codes = allCodes.value;
  if (codes.length === 0) return;

  const start = Math.max(0, index - PREFETCH_MARGIN);
  const end = Math.min(codes.length - 1, index + PREFETCH_MARGIN);

  let lastMissingBefore = -1;
  for (let i = start; i < index; i += 1) {
    if (!dayStates[codes[i]]) lastMissingBefore = i;
  }
  let firstMissingAfter = -1;
  for (let i = index + 1; i <= end; i += 1) {
    if (!dayStates[codes[i]]) {
      firstMissingAfter = i;
      break;
    }
  }

  let from = start;
  let to = end;
  if (lastMissingBefore >= 0 && firstMissingAfter < 0) {
    from = Math.max(0, lastMissingBefore - PREFETCH_CHUNK + 1);
  } else if (firstMissingAfter >= 0 && lastMissingBefore < 0) {
    to = Math.min(codes.length - 1, firstMissingAfter + PREFETCH_CHUNK - 1);
  }

  // Разбиваем на непрерывные участки, чтобы getDaysByCodes запрашивал точный диапазон без лишних дней
  const runs: string[][] = [];
  let currentRun: string[] = [];
  for (let i = from; i <= to; i += 1) {
    const code = codes[i];
    if (!dayStates[code]) {
      currentRun.push(code);
    } else if (currentRun.length > 0) {
      runs.push(currentRun);
      currentRun = [];
    }
  }
  if (currentRun.length > 0) runs.push(currentRun);

  for (const run of runs) {
    void loadDays(run);
  }
};

const isSameRange = (a: string[] | undefined, b: string[]) =>
  a != null && a.length === b.length && a[0] === b[0] && a[a.length - 1] === b[b.length - 1];

watch(
  [allCodes, currentCode],
  ([codes, code], [prevCodes]) => {
    if (codes.length === 0) return;

    const resolved = clampCode(code ?? toDateCode(new Date()), codes);
    if (resolved !== currentCode.value) {
      currentCode.value = resolved;
    }

    const index = codeToIndex.value.get(resolved) ?? 0;
    const swiper = swiperRef.value?.swiper;

    if (!swiper) {
      virtualParams.slides = codes;
      initialSlideIndex.value = index;
    } else if (!isSameRange(prevCodes, codes)) {
      swiper.virtual.slides = codes;
      swiper.virtual.update(true, false, index);
      swiper.slideTo(index, 0, false);
      syncNavbarScroll();
    } else if (swiper.activeIndex !== index) {
      swiper.slideTo(index, 0, false);
      syncNavbarScroll();
    }

    prefetchAround(index);
  },
  { immediate: true }
);

// Уведомляем прозрачный навбар Framework7 о scrollTop активного слайда
const syncNavbarScroll = () => {
  const swiper = swiperRef.value?.swiper;
  if (!swiper || swiper.destroyed) return;
  const findScrollEl = () =>
    swiper.slidesEl.querySelector<HTMLElement>(
      `swiper-slide[data-swiper-slide-index="${swiper.activeIndex}"] .calendar-day-scroll`
    );
  const scrollEl = findScrollEl();
  if (scrollEl) {
    scrollEl.dispatchEvent(new Event("scroll"));
  } else {
    void nextTick(() => findScrollEl()?.dispatchEvent(new Event("scroll")));
  }
};

const onSlideChange = () => {
  const swiper = swiperRef.value?.swiper;
  if (!swiper) return;
  const code = allCodes.value[swiper.activeIndex];
  if (code && code !== currentCode.value) {
    currentCode.value = code;
  }
  syncNavbarScroll();
};

// При ресайзе Swiper сдвигает virtual.offset без renderExternal - синхронизируем, чтобы Vue не перетёр left
const onVirtualUpdate = () => {
  const swiper = swiperRef.value?.swiper;
  if (!swiper?.virtual) return;
  if (swiper.virtual.offset !== virtualData.value.offset) {
    virtualData.value = { ...virtualData.value, offset: swiper.virtual.offset };
  }
};

let tabEl: Element | null = null;

const onTabShow = () => {
  const swiper = swiperRef.value?.swiper;
  if (!swiper || swiper.destroyed) return;
  swiper.update();
  const index = currentIndex.value;
  if (index >= 0) swiper.slideTo(index, 0, false);
  syncNavbarScroll();
};

const onSwiperInit = () => {
  tabEl = swiperRef.value?.closest(".tab") ?? null;
  tabEl?.addEventListener("tab:show", onTabShow);
  syncNavbarScroll();
};

onBeforeUnmount(() => {
  tabEl?.removeEventListener("tab:show", onTabShow);
});
</script>

<style scoped lang="less">
.calendar-day-view {
  height: 100%;
  overflow: hidden;
}

.calendar-day-swiper {
  display: block;
  height: 100%;
}

swiper-slide {
  height: 100%;
}

.calendar-day-scroll {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.calendar-day-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 24px;
  font-family: var(--font-family);
  font-size: var(--mobile-main-text-regular-b3);
  text-align: center;
  color: var(--content-color-black-primary);

  p {
    margin: 0;
  }
}

.dark .calendar-day-state {
  color: var(--content-color-baige-90);
}
</style>
