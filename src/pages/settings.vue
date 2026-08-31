<template>
  <f7-page name="settings">
    <f7-navbar title="Настройки" back-link></f7-navbar>

    <f7-list dividers class="settings-list">
      <f7-list-item
        title="Тема"
        smart-select
        :smart-select-params="themeSmartSelectParams"
      >
        <template #default>
          <select name="appTheme" v-model="selectedTheme">
            <option value="auto">Системная</option>
            <option value="light">Светлая</option>
            <option value="dark">Темная</option>
          </select>
        </template>
        <template #media>
          <SvgIcon icon="color-theme" :color="iconColor" :size="24" />
        </template>
      </f7-list-item>

      <f7-list-item title="Доступ без интернета" link="/settings/offline/">
        <template #media>
          <SvgIcon icon="cloud-off" :color="iconColor" :size="24" />
        </template>
      </f7-list-item>

      <f7-list-item 
        title="Не гасить экран"
        footer="Оставлять экран включенным во время чтения">
        <template #after>
          <f7-toggle small v-model:checked="keepScreenOn" />
        </template>
        <template #media>
          <SvgIcon icon="sun" :color="iconColor" :size="24" />
        </template>
      </f7-list-item>

      <f7-list-item 
        title="Анимация листания"
        footer="Показывать анимацию при листании касанием и кнопками громкости">
        <template #after>
          <f7-toggle small v-model:checked="pageTurnAnimation" />
        </template>
        <template #media>
          <SvgIcon icon="arrow-right-left" :color="iconColor" :size="24" />
        </template>
      </f7-list-item>

      <f7-list-item 
        title="Кнопки громкости"
        footer="Использовать кнопки громкости для листания страниц">
        <template #after>
          <f7-toggle small v-model:checked="volumeButtonsScroll" />
        </template>
        <template #media>
          <SvgIcon icon="arrow-up-down" :color="iconColor" :size="24" />
        </template>
      </f7-list-item>

      <f7-list-item title="Обучение" link="#">
        <template #media>
          <SvgIcon icon="question" :color="iconColor" :size="24" />
        </template>
      </f7-list-item>

      <f7-list-item
        title="Техническая информация"
        link="#"
        @click.prevent="testBrowserFeatures"
      >
        <template #media>
          <SvgIcon icon="info" :color="iconColor" :size="24" />
        </template>
      </f7-list-item>
    </f7-list>
  </f7-page>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { f7 } from "framework7-vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";
import { useSettingsStore } from "@/stores/settings";
import { testBrowser } from "@/js/device/browser-test";

type AppTheme = "light" | "dark" | "auto";

const { currentTheme, setTheme, isDarkMode } = useTheme();
const settingsStore = useSettingsStore();

const themeSmartSelectParams = {
  openIn: (typeof window !== "undefined" && window.innerWidth >= 768
    ? "popover"
    : "sheet") as "popover" | "sheet",
  closeOnSelect: true,
  cssClass: "simple-select",
  sheetBackdrop: true,
  sheetSwipeToClose: true,
  sheetCloseLinkText: "",
};

const selectedTheme = computed({
  get: () => currentTheme.value,
  set: (value: AppTheme) => {
    setTheme(value);
  },
});

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

const iconColor = computed(() => (isDarkMode.value ? "baige-60" : "black-40"));

const testBrowserFeatures = async () => {
  const msg = await testBrowser(f7.device);
  f7.dialog.alert(msg);
};
</script>

<style scoped lang="less">
.settings-list {
  --f7-list-item-padding-vertical: 12px;
  --f7-list-item-min-height: 56px;
}
</style>
