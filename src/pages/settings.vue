<template>
  <f7-page name="settings">
    <f7-navbar large transparent title="Настройки" back-link></f7-navbar>

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

      <f7-list-item title="Настройки чтения" link="/settings/reading/">
        <template #media>
          <SvgIcon icon="settings-2" :color="iconColor" :size="24" />
        </template>
      </f7-list-item>

      <f7-list-item
        title="Обучение на главном экране"
        footer="Показать подсказки по избранному"
        link="#"
        @click.prevent="restartHomeTutorial"
      >
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
import { useHomeTutorial } from "@/composables/useHomeTutorial";
import { testBrowser } from "@/js/device/browser-test";

type AppTheme = "light" | "dark" | "auto";

const { currentTheme, setTheme, isDarkMode } = useTheme();

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

const iconColor = computed(() => (isDarkMode.value ? "baige-60" : "black-40"));

const { resetTutorialFlag } = useHomeTutorial();

const restartHomeTutorial = () => {
  resetTutorialFlag();
  f7.views.main.router.back();
};

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
