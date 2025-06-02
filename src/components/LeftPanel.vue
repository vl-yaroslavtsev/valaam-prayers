<template>
  <f7-panel left cover :dark="isDarkMode">
    <f7-view>
      <f7-page :page-content="false">
        <f7-page-content class="page-left-panel">
          <f7-list class="list-panel">
            <f7-list-item title="О МОНАСТЫРЕ" link="#">
              <template #media>
                <AboutIcon :color="iconColor" />
              </template>
            </f7-list-item>
            <f7-list-item title="ПОМЯННИК" link="#">
              <template #media>
                <PrayIcon :color="iconColor" />
              </template>
            </f7-list-item>
            <f7-list-item title="МОИ ЗАПИСКИ" link="#">
              <template #media>
                <NotesIcon :color="iconColor" />
              </template>
            </f7-list-item>
            <f7-list-item title="НАПОМИНАНИЯ" link="#">
              <template #media>
                <AlarmIcon :color="iconColor" />
              </template>
            </f7-list-item>
            <f7-list-item title="НАСТРОЙКИ" link="#">
              <template #media>
                <SettingsIcon :color="iconColor" />
              </template>
            </f7-list-item>
            <f7-list-item title="О ПРИЛОЖЕНИИ" link="#">
              <template #media>
                <InfoIcon :color="iconColor" />
              </template>
            </f7-list-item>
            <f7-list-item title="ПОИСК" link="#">
              <template #media>
                <SearchIcon :color="iconColor" />
              </template>
            </f7-list-item>
          </f7-list>
          <SeparatorLine :color="isDarkMode ? 'baige-100' : 'black-100'" />
          <div class="logo">
            <ValaamLogo :color="isDarkMode ? 'white' : 'black-primary'" />
          </div>

          <f7-block class="app-version">
            <f7-button v-if="props.needRefresh" outline @click="updateApp">
              Обновить приложение
            </f7-button>
            <p v-else>Версия {{ store.state.version }}</p>
          </f7-block>
        </f7-page-content>
      </f7-page>
    </f7-view>
  </f7-panel>
</template>

<script setup lang="ts">
import AboutIcon from "./icons/AboutIcon.vue";
import AlarmIcon from "./icons/AlarmIcon.vue";
import InfoIcon from "./icons/InfoIcon.vue";
import NotesIcon from "./icons/NotesIcon.vue";
import PrayIcon from "./icons/PrayIcon.vue";
import SettingsIcon from "./icons/SettingsIcon.vue";
import SearchIcon from "./icons/SearchIcon.vue";
import SeparatorLine from "./icons/SeparatorLine.vue";
import ValaamLogo from "./icons/ValaamLogo.vue";

import { f7 } from "framework7-vue";
import { computed } from "vue";
import store from "../js/store";
import { useTheme } from "@/composables/useTheme";

const props = defineProps<{
  needRefresh: boolean;
  updateSW: () => void;
}>();

const updateApp = (): void => {
  f7.dialog.preloader("Обновляем приложение...");
  props.updateSW();
};

const { isDarkMode } = useTheme();
const iconColor = computed(() => {
  return isDarkMode.value ? "baige-900" : "black-600";
});
</script>

<style scoped lang="less">
.page-left-panel {
  --list-panel-padding-top: 30px;

  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.list-panel {
  --f7-list-font-size: 14px;

  margin: 0;
  padding: var(--list-panel-padding-top) 0 0 0;

  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.logo {
  display: flex;
  justify-content: center;
  align-items: center ;
  /* padding-top: 40px; */
  flex: 2 0 auto;
}

.app-version {
  text-align: center;
  font-size: 12px;
  margin-bottom: calc(
    var(--f7-block-padding-horizontal) + var(--f7-safe-area-left)
  );

  color: var(--content-color-black-600);
}

:global(.dark .app-version) {
  color: var(--content-color-baige-600);
}
</style>
