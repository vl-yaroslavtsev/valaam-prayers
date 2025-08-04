<template>
  <swiper-container
    slidesPerView="auto"
    :spaceBetween="10"
    :freeMode="true"
    :pagination="false"
    :navigation="false"
    :class="['history-swiper', {'skeleton-text skeleton-effect-wave': isLoading}]"
    ref="swiper"
  >
    <swiper-slide v-if="items.length === 0 && !isLoading" key="empty">
      <div class="slide-main link no-ripple">
        <div class="slide-footer">
          Начните читать, и данные появятся здесь
        </div>
      </div>
    </swiper-slide>
    <swiper-slide 
      v-if="isLoading"
      v-for="item in skeletonItems" 
      :key="item.id"
    >
      <f7-link href="#" class="no-ripple">
        <div class="slide-main">
          <div class="slide-header">______________________</div>
          <div class="slide-info">
            _________________________
          </div>
        </div>
        <div class="slide-footer">
          <span>___________</span
          ><span>___________</span>
        </div>
      </f7-link>
    </swiper-slide>
    <swiper-slide 
      v-if="!isLoading"
      v-for="item in items" 
      :key="item.id" 
    >
      <f7-link :href="item.url">
        <div class="slide-main">
          <div class="slide-header">{{ item.name }}</div>
          <div class="slide-info">
            Страница {{ Math.ceil(item.progress * item.pages) || 1 }} из
              {{ item.pages }}
          </div>
        </div>
        <div class="slide-footer">
          <span>{{ formatDay(item.lastReadAt) }}</span
          ><span>{{ formatTime(item.lastReadAt) }}</span>
        </div>
      </f7-link>
    </swiper-slide>
  </swiper-container>
</template>
<script setup lang="ts">
import { watch, useTemplateRef } from "vue";
import { formatDate } from "@/js/utils";
import type { SwiperContainer } from "swiper/element";

interface HistoryItem {
  id: string;
  name: string;
  url: string;
  progress: number;
  pages: number;
  lastReadAt: Date;
}

const { items, isLoading } = defineProps<{
  items: HistoryItem[];
  isLoading: boolean;
}>();

const skeletonItems = Array.from({ length: 2 }, (_, index) => ({
  id: `loading-${index}`,
}));

const swiperRef = useTemplateRef<SwiperContainer>("swiper");


watch(
  [() => items, () => isLoading],
  () => {
    swiperRef.value?.swiper.update();
  }
);

const formatDay = (date: Date) => formatDate(date, "d MMMM yyyy");
const formatTime = (date: Date) => formatDate(date, "HH:mm");
</script>
<style lang="less" scoped>
.history-swiper {
  --history-swiper-bg-color: var(--content-color-white-100);

  --history-swiper-header-text-color: var(--content-color-black-primary);
  --history-swiper-info-text-color: var(--content-color-black-40);
  --history-swiper-footer-text-color: var(--content-color-black-60);
}

swiper-slide {
  box-sizing: border-box;
  width: 240px;
  height: 150px;
  margin-top: 20px;
  margin-bottom: 30px;
  border-radius: 10px;
 
  box-shadow: 0 4px 30px 0 rgba(0, 0, 0, 0.1);

  font-size: var(--mobile-main-text-regular-b3);
  line-height: var(--mobile-main-text-regular-b3-line-height);
  font-weight: 400;

  &:first-child {
    margin-left: 15px;
  }

  &:last-child {
    margin-right: 15px;
  }
}

.link {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;
  gap: 10px;
  border-radius: 10px;

  width: 100%;
  height: 100%;
  padding: 10px 15px 15px 15px;

  background: var(--history-swiper-bg-color);
  overflow: hidden;
}

.slide-main {
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
  gap: 12px;
}

.text-ellipsis() {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slide-header {
  --history-slider-header-lh: 27px;

  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  height: calc(var(--history-slider-header-lh) * 2);

  font-size: var(--mobile-main-text-bold-b1);
  line-height: var(--history-slider-header-lh);
  font-weight: 700;
  color: var(--history-swiper-header-text-color);
}
.slide-subheader {
  color: var(--history-swiper-header-text-color);
  .text-ellipsis();
  height: 21px;
}

.slide-info {
  color: var(--history-swiper-info-text-color);
  .text-ellipsis();
}

.slide-footer {
  display: flex;
  gap: 16px;
  color: var(--history-swiper-footer-text-color);
  width: 100%;

  span:last-child {
    .text-ellipsis();
  }
}

.dark {
  .history-swiper {
    --history-swiper-bg-color: var(--content-color-black-secondary);

    --history-swiper-header-text-color: var(--content-color-white-100);
    --history-swiper-info-text-color: var(--content-color-baige-40);
    --history-swiper-footer-text-color: var(--content-color-baige-60);
  }
}
</style>
