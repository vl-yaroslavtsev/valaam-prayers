<template>
  <f7-page-content class="calendar-day-view">
    <div v-if="!isReady" class="calendar-day-state">
      <template v-if="markersError">
        <p>Не удалось загрузить календарь</p>
        <f7-button small outline @click="calendarStore.refreshMarkers()">Повторить</f7-button>
      </template>
      <f7-preloader v-else />
    </div>

    <swiper-container
      v-else
      ref="swiperRef"
      class="calendar-day-swiper"
      :slidesPerView="1"
      :initialSlide="CENTER_INDEX"
      :spaceBetween="16"
      :speed="300"
      :threshold="5"
      @swiperinit="applySwipeLimits"
      @swiperslidechangetransitionend="onSlideChangeEnd"
    >
      <!-- Всегда три слайда: предыдущий день, текущий и следующий. Ключ - код дня, поэтому при
           перелистывании слайд текущего дня сохраняется, а не создаётся заново -->
      <swiper-slide v-for="slot in slots" :key="slot.key">
        <div class="calendar-day-scroll">
          <template v-if="slot.code">
            <CalendarDayContent
              v-if="getDay(slot.code)"
              :day="getDay(slot.code)!"
              :has-prev="slot.code > minCode!"
              :has-next="slot.code < maxCode!"
              :f7router="f7router"
              @prev="swiperRef?.swiper.slidePrev()"
              @next="swiperRef?.swiper.slideNext()"
            />
            <div v-else-if="dayStates[slot.code]?.status === 'error'" class="calendar-day-state">
              <p>Не удалось загрузить день</p>
              <f7-button small outline @click="loadDay(slot.code, true)">Повторить</f7-button>
            </div>
            <div v-else class="calendar-day-state">
              <f7-preloader />
            </div>
          </template>
        </div>
      </swiper-slide>
    </swiper-container>
  </f7-page-content>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowReactive, useTemplateRef, watch } from "vue";
import { storeToRefs } from "pinia";
import type { Router } from "framework7/types";
import type { SwiperContainer } from "swiper/element";
import type { CalendarDayApiElement } from "@/services/api/DaysApi";
import { useCalendarStore } from "@/stores/calendar";
import CalendarDayContent from "./CalendarDayContent.vue";
import { getDaysRange, toDateCode } from "./calendarMarkers";
import { shiftDayCode } from "./dayFormat";

defineProps<{
  f7router: Router.Router;
}>();

/** Код показываемого дня (YYYYMMDD). Пока не задан, открывается сегодняшний день */
const currentCode = defineModel<string | null>({ default: null });

const CENTER_INDEX = 1;

type DayState =
  | { status: "loading" }
  | { status: "loaded"; day: CalendarDayApiElement }
  | { status: "error" };

const calendarStore = useCalendarStore();
const { markers, markersError } = storeToRefs(calendarStore);
const swiperRef = useTemplateRef<SwiperContainer>("swiperRef");

// Границы календаря берём из снимка дней: за их пределы листать нельзя
const range = computed(() => (markers.value ? getDaysRange(markers.value.days) : null));
const minCode = computed(() => (range.value ? toDateCode(range.value.min) : null));
const maxCode = computed(() => (range.value ? toDateCode(range.value.max) : null));

const clampCode = (code: string) => {
  if (code < minCode.value!) return minCode.value!;
  if (code > maxCode.value!) return maxCode.value!;
  return code;
};

watch(
  [range, currentCode],
  () => {
    if (!range.value) return;
    const code = clampCode(currentCode.value ?? toDateCode(new Date()));
    if (code !== currentCode.value) currentCode.value = code;
  },
  { immediate: true }
);

const isReady = computed(() => !!range.value && !!currentCode.value);

// Слот без дня (null) - на границе календаря: слайд пустой, листать к нему нельзя
const slots = computed(() => {
  const code = currentCode.value;
  if (!code) return [];
  const prev = code > minCode.value! ? shiftDayCode(code, -1) : null;
  const next = code < maxCode.value! ? shiftDayCode(code, 1) : null;
  return [
    { key: prev ?? "edge-before", code: prev },
    { key: code, code },
    { key: next ?? "edge-after", code: next },
  ];
});

const dayStates = shallowReactive<Record<string, DayState>>({});

const getDay = (code: string) => {
  const state = dayStates[code];
  return state?.status === "loaded" ? state.day : null;
};

const loadDay = async (code: string, force = false) => {
  const state = dayStates[code];
  if (!force && state && state.status !== "error") return;

  dayStates[code] = { status: "loading" };
  const day = await calendarStore.getDayByCode(code);
  dayStates[code] = day ? { status: "loaded", day } : { status: "error" };
};

// Подгружаем текущий, предыдущий и следующий дни
watch(
  slots,
  (items) => {
    for (const { code } of items) {
      if (code) void loadDay(code);
    }
  },
  { immediate: true }
);

const applySwipeLimits = () => {
  const swiper = swiperRef.value?.swiper;
  if (!swiper) return;
  swiper.allowSlidePrev = slots.value[CENTER_INDEX - 1]?.code != null;
  swiper.allowSlideNext = slots.value[CENTER_INDEX + 1]?.code != null;
};

// После перелистывания делаем показанный день центральным: Vue сдвигает слайды,
// а Swiper мгновенно возвращаем на центр - пользователь этого не видит
const onSlideChangeEnd = async () => {
  const swiper = swiperRef.value?.swiper;
  const code = swiper ? slots.value[swiper.activeIndex]?.code : null;
  if (!swiper || !code || code === currentCode.value) return;

  currentCode.value = code;
  await nextTick();
  swiper.update();
  swiper.slideTo(CENTER_INDEX, 0, false);
  applySwipeLimits();
};
</script>

<style scoped lang="less">
.calendar-day-view {
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
