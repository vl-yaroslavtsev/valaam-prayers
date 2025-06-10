<template>
  <swiper-container
    slidesPerView="auto"
    :spaceBetween="10"
    :freeMode="true"
    :pagination="false"
    :navigation="false"
    class="history-swiper"
  >
    <swiper-slide>
      <div class="slide-main">
        <div class="slide-header">Новый Завет</div>
        <div class="slide-info">Прочитано 6 из 20 страниц</div>
      </div>
      <div class="slide-footer">2 марта 2021 15:43</div>
    </swiper-slide>
    <swiper-slide>
      <div class="slide-main">
        <div class="slide-header">Молитвы на сон грядущим</div>
        <div class="slide-info">Прочитано 12 из 25 страниц</div>
      </div>
      <div class="slide-footer">1 марта 2021 15:43</div>
    </swiper-slide>
    <swiper-slide>
      <div class="slide-main">
        <div class="slide-header">Правило от осквернения</div>
        <div class="slide-info">Прочитано 1 из 15 страниц</div>
      </div>
      <div class="slide-footer">28 февраля 2021 15:43</div>
    </swiper-slide>
    <swiper-slide>Slide 4</swiper-slide>
    <swiper-slide>Slide 5</swiper-slide>
    <swiper-slide>Slide 6</swiper-slide>
    <swiper-slide>Slide 7</swiper-slide>
    <swiper-slide>Slide 8</swiper-slide>
    <swiper-slide>Slide 9</swiper-slide>
  </swiper-container>
</template>
<script setup lang="ts">
const { width = 300, color = "white" } = defineProps({
  color: String,
  width: Number,
});
</script>
<style lang="less" scoped>
.history-swiper {
  --history-swiper-bg-color: var(--content-color-white-100);
}

swiper-slide {
  box-sizing: border-box;
  width: 240px;
  height: 150px;
  border-radius: 10px;
  margin-top: 20px;
  margin-bottom: 20px;
  padding: 10px 15px 15px 15px;
  box-shadow: 0 4px 30px 0 rgba(0, 0, 0, 0.1);
  background: var(--history-swiper-bg-color);

  font-size: var(--mobile-main-text-regular-b3);
  line-height: var(--mobile-main-text-regular-b3-line-height);
  font-weight: 400;

  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;
  gap: 10px;

  &:first-child {
    margin-left: 15px;
  }

  &:last-child {
    margin-right: 15px;
  }
}

.slide-main {
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
  gap: 6px;
}

.text-ellipsis() {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slide-header {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  white-space: normal;
  overflow: hidden;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 60px;

  font-size: var(--mobile-main-text-bold-b1);
  line-height: 27px; //var(--mobile-main-text-bold-b1-line-height);
  font-weight: 700;
  color: var(--content-color-white-100);
}
.slide-subheader {
  color: var(--content-color-white-100);
  .text-ellipsis();
  height: 21px;
}

.slide-info {
  color: var(--content-color-baige-400);
  .text-ellipsis();
}

.slide-footer {
  color: var(--content-color-baige-600);
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark {
  .history-swiper {
    --history-swiper-bg-color: var(--content-color-black-secondary);
  }
}
</style>
