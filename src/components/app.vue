<template>
  <f7-app v-bind="f7params">
    <!-- Left panel with cover effect-->
    <LeftPanel :needRefresh="needRefresh" :updateSW="updateSW" />

    <!-- Views/Tabs container -->
    <f7-views tabs class="safe-areas">
      <!-- Tabbar component -->
      <BottomTabBar :activeTab="activeView" />

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

    <!-- Popup -->
    <f7-popup id="my-popup">
      <f7-view>
        <f7-page>
          <f7-navbar title="Попапчик">
            <f7-nav-right>
              <f7-link popup-close>Close</f7-link>
            </f7-nav-right>
          </f7-navbar>
          <f7-block>
            <p>Содержание попапчика</p>
          </f7-block>
        </f7-page>
      </f7-view>
    </f7-popup>
  </f7-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { f7, f7ready } from "framework7-vue";

import routes from "../js/routes";
import viewsManager from "../js/viewsManager";
import { device } from "@/js/device";
import { useTheme } from "@/composables/useTheme";
import BottomTabBar from "./layout/BottomTabBar.vue";
import LeftPanel from "./layout/LeftPanel.vue";

import { registerSW } from "virtual:pwa-register";
import type { View } from "framework7/types";

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
initTheme();

const activeView = ref<string>("home");
const onTabShow = (view: HTMLElement & { f7View: View.View }) => {
  activeView.value = view.f7View.name;
};

onMounted(() => {
  f7ready(() => {
    viewsManager();
    device.setWebViewVisible(true); 
  });
});
</script>

<style scoped></style>
