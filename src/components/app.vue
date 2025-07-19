<template>
  <f7-app v-bind="f7params">
    <!-- Left panel with cover effect-->
    <LeftPanel :needRefresh="needRefresh" :updateSW="updateSW" />

    <!-- Views/Tabs container -->
    <f7-views tabs class="safe-areas">
      <!-- Tabbar component -->
      <BottomTabBar ref="bottomTabBar" :activeTab="activeView" />

      <!-- Your main view/tab, should have "view-main" class. It also has "tab-active" class -->
      <f7-view
        id="view-home"
        name="home"
        main
        tab
        tab-active
        url="/"
        @tab:show="onTabShow"
      ></f7-view>

      <!-- Catalog View -->
      <f7-view
        id="view-prayers"
        name="prayers"
        tab
        init-router-on-tab-show
        url="/prayers/842"
        @tab:show="onTabShow"
      ></f7-view>

      <!-- Settings View -->
      <f7-view
        id="view-calendar"
        name="calendar"
        tab
        init-router-on-tab-show
        url="/calendar/"
        @tab:show="onTabShow"
      ></f7-view>

      <!-- Settings View -->
      <f7-view
        id="view-books"
        name="books"
        tab
        init-router-on-tab-show
        url="/prayers/1983"
        @tab:show="onTabShow"
      ></f7-view>

      <!-- Settings View -->
      <f7-view
        id="view-rites"
        name="rites"
        tab
        init-router-on-tab-show
        url="/rites/"
        @tab:show="onTabShow"
      ></f7-view>
    </f7-views>
    <div class="text-settings-sheet-backdrop sheet-backdrop"></div>
    <SharePopover ref="sharePopover" />
  </f7-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { f7, f7ready } from "framework7-vue";

import routes from "../js/routes";
import viewsManager from "../js/viewsManager";
import { initStorageError } from "@/services/storage";
import { device } from "@/js/device";
import { useTheme } from "@/composables/useTheme";
import { useTextSettings } from "@/composables/useTextSettings";
import SharePopover from "./SharePopover.vue";
import BottomTabBar from "./layout/BottomTabBar.vue";
import LeftPanel from "./layout/LeftPanel.vue";

import { registerSW } from "virtual:pwa-register";
import type { View } from "framework7/types";
import { waitForFontsLoaded } from "@/js/utils";
import { useComponentsStore } from "@/stores/components";
const { registerComponent } = useComponentsStore();

const sharePopover = ref<InstanceType<typeof SharePopover> | null>(null);
const bottomTabBar = ref<InstanceType<typeof BottomTabBar> | null>(null);

const needRefresh = ref(false);
const updateSW = registerSW({
  onNeedRefresh() {
    needRefresh.value = true;
  },
  onOfflineReady() {},
});

// Framework7 Parameters
const f7params = {
  name: "Валаамский календарь и молитвослов", // App name
  theme: "md",

  // App routes
  routes: routes,

  touch: {
    tapHold: false,
  },
} as const;

const { initTheme } = useTheme();

const activeView = ref<string>("home");
const onTabShow = (view: HTMLElement & { f7View: View.View }) => {
  activeView.value = view.f7View.name;
};

onMounted(() => {
  f7ready(async () => {

    initTheme();

    registerComponent('sharePopover', sharePopover.value);
    registerComponent('bottomTabBar', bottomTabBar.value);  

    if (initStorageError) {
      f7.toast.show({
        text: "Ошибка при инициализации базы данных. Пожалуйста, перезагрузите приложение.\n" + initStorageError,
        position: "bottom",
        cssClass: "toast-error",
      });
      console.error("failed to init db!", initStorageError);
    }

    viewsManager();
    await waitForFontsLoaded();
    device.setWebViewVisible(true);
  });
});
</script>

<style scoped></style>
