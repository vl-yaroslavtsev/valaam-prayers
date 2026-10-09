<template>
  <f7-page name="settings-reading">
    <f7-navbar large transparent title="Настройки чтения" back-link></f7-navbar>

    <f7-list dividers class="settings-list">
      <f7-list-item
        title="Не гасить экран"
        footer="Оставлять экран включенным во время чтения"
      >
        <template #after>
          <f7-toggle small v-model:checked="keepScreenOn" />
        </template>
        <template #media>
          <SvgIcon icon="sun" :color="iconColor" :size="24" />
        </template>
      </f7-list-item>

      <f7-list-item
        title="Анимация листания"
        footer="Показывать анимацию при листании касанием и кнопками громкости"
      >
        <template #after>
          <f7-toggle small v-model:checked="pageTurnAnimation" />
        </template>
        <template #media>
          <SvgIcon icon="arrow-right-left" :color="iconColor" :size="24" />
        </template>
      </f7-list-item>

      <f7-list-item
        title="Кнопки громкости"
        footer="Использовать кнопки громкости для листания страниц"
      >
        <template #after>
          <f7-toggle small v-model:checked="volumeButtonsScroll" />
        </template>
        <template #media>
          <SvgIcon icon="arrow-up-down" :color="iconColor" :size="24" />
        </template>
      </f7-list-item>

      <f7-list-item
        title="Листание по главам"
        footer="Показывать нижнее меню при переходе к главе из содержания"
      >
        <template #after>
          <f7-toggle small v-model:checked="chapterNavToolbar" />
        </template>
        <template #media>
          <SvgIcon icon="menu" :color="iconColor" :size="24" />
        </template>
      </f7-list-item>

      <f7-list-item
        title="Листание по закладкам"
        footer="Показывать нижнее меню при переходе к закладке"
      >
        <template #after>
          <f7-toggle small v-model:checked="bookmarkNavToolbar" />
        </template>
        <template #media>
          <SvgIcon icon="bookmark" :color="iconColor" :size="24" />
        </template>
      </f7-list-item>
    </f7-list>
  </f7-page>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";
import { useSettingsStore } from "@/stores/settings";

const { isDarkMode } = useTheme();
const settingsStore = useSettingsStore();

const keepScreenOn = computed({
  get: () => settingsStore.keepScreenOn,
  set: (value: boolean) => settingsStore.setKeepScreenOn(value),
});

const pageTurnAnimation = computed({
  get: () => settingsStore.isPageTurnAnimationEnabled,
  set: (value: boolean) => settingsStore.setIsPageTurnAnimationEnabled(value),
});

const volumeButtonsScroll = computed({
  get: () => settingsStore.isVolumeButtonsScrollEnabled,
  set: (value: boolean) => settingsStore.setIsVolumeButtonsScrollEnabled(value),
});

const chapterNavToolbar = computed({
  get: () => settingsStore.isChapterNavToolbarEnabled,
  set: (value: boolean) => settingsStore.setIsChapterNavToolbarEnabled(value),
});

const bookmarkNavToolbar = computed({
  get: () => settingsStore.isBookmarkNavToolbarEnabled,
  set: (value: boolean) => settingsStore.setIsBookmarkNavToolbarEnabled(value),
});

const iconColor = computed(() => (isDarkMode.value ? "baige-60" : "black-40"));
</script>

<style scoped lang="less">
.settings-list {
  --f7-list-item-padding-vertical: 12px;
  --f7-list-item-min-height: 56px;
}
</style>
