<template>
  <f7-panel left cover>
    <f7-page :page-content="false">
      <f7-page-content class="page-left-panel">
        <f7-list class="list-panel">
          <f7-list-item title="О МОНАСТЫРЕ" link="#">
            <template #media>
              <SvgIcon icon="about" :color="iconColor" />
            </template>
          </f7-list-item>
          <f7-list-item title="ПОМЯННИК" link="#">
            <template #media>
              <SvgIcon icon="pray" :color="iconColor" />
            </template>
          </f7-list-item>
          <f7-list-item title="МОИ ЗАПИСКИ" link="#">
            <template #media>
              <SvgIcon icon="notes" :color="iconColor" />
            </template>
          </f7-list-item>
          <f7-list-item title="НАПОМИНАНИЯ" link="#">
            <template #media>
              <SvgIcon icon="alarm" :color="iconColor" />
            </template>
          </f7-list-item>
          <f7-list-item title="НАСТРОЙКИ" link="/settings/" view="current" panel-close>
            <template #media>
              <SvgIcon icon="settings" :color="iconColor" />
            </template>
          </f7-list-item>
          <f7-list-item title="О ПРИЛОЖЕНИИ" link="/about/" view="current" panel-close>
            <template #media>
              <SvgIcon icon="info" :color="iconColor" />
            </template>
          </f7-list-item>
          <f7-list-item title="ПОИСК" link="#">
            <template #media>
              <SvgIcon icon="search" :color="iconColor" />
            </template>
          </f7-list-item>
        </f7-list>
        <SeparatorLine :color="isDarkMode ? 'baige-100' : 'black-100'" />
        <!--<SeparatorLine :color="'baige-100'" />-->
        <div class="logo">
          <SvgIcon icon="valaam-logo" :size="42" :color="iconColor" />
        </div>

        <f7-block class="app-version">
          <f7-button v-if="props.needRefresh" outline @click="updateApp">
            Обновить приложение
          </f7-button>
          <p v-else>Версия {{ version }}</p>
        </f7-block>
      </f7-page-content>
    </f7-page>
  </f7-panel>
</template>

<script setup lang="ts">
import SvgIcon from "@/components/SvgIcon.vue";
import SeparatorLine from "../SeparatorLine.vue";

import { f7 } from "framework7-vue";
import { computed } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useSettingsStore } from "@/stores/settings";

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
  // return "baige-900";
  return isDarkMode.value ? "baige-900" : "black-600";
});

const { version } = useSettingsStore();
</script>

<style scoped lang="less">
.page-left-panel {
  --list-panel-padding-top: 30px;
  --f7-list-item-title-text-color: var(--content-color-black-primary);

  // padding-top: var(--f7-safe-area-top);
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
  align-items: center;
  /* padding-top: 40px; */
  flex: 2 0 auto;
}

.app-version {
  text-align: center;
  font-size: 12px;
  margin-bottom: 8px;

  color: var(--content-color-black-600);
}

.dark {
  .app-version {
    color: var(--content-color-baige-600);
  }

  .page-left-panel {
    --f7-list-item-title-text-color: var(--content-color-baige-900);
  }
}
</style>
