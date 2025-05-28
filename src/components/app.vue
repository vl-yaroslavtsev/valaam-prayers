<template>
  <f7-app v-bind="f7params">
    <!-- Left panel with cover effect-->
    <f7-panel left cover dark>
      <f7-view>
        <f7-page>
          <!-- <f7-navbar title="Левая панель"></f7-navbar> -->
          <f7-list>
            <f7-list-item title="О МОНАСТЫРЕ" link="#" />
            <f7-list-item title="ПОМЯННИК" link="#" />
            <f7-list-item title="МОИ ЗАПИСКИ" link="#" />
            <f7-list-item title="НАПОМИНАНИЯ" link="#" />
            <f7-list-item title="НАСТРОЙКИ" link="#" />
            <f7-list-item title="О ПРИЛОЖЕНИИ" link="#" />
            <f7-list-item title="ПОИСК" link="#" />
          </f7-list>

          <f7-block class="position-bottom">
            <!--  -->
            <f7-button v-if="needRefresh" fill @click="updateApp"
              >Обновить приложение</f7-button
            >
            <p>Версия {{ store.state.version }}</p>
          </f7-block>
          <f7-block></f7-block>
        </f7-page>
      </f7-view>
    </f7-panel>

    <!-- Views/Tabs container -->
    <f7-views tabs class="safe-areas">
      <!-- Tabbar for switching views-tabs -->
      <f7-toolbar tabbar icons bottom>
        <f7-link
          tab-link="#view-main"
          tab-link-active
          icon-md="material:home"
          text="Главная"
        ></f7-link>
        <f7-link
          tab-link="#view-prayers"
          icon-md="material:menu_book"
          text="Молитвослов"
        ></f7-link>
        <f7-link
          tab-link="#view-calendar"
          icon-md="material:date_range"
          text="Календарь"
        ></f7-link>
        <f7-link
          tab-link="#view-books"
          icon-md="material:book"
          text="API"
        ></f7-link>
        <f7-link
          tab-link="#view-rites"
          icon-md="material:whatshot"
          text="Поминовения"
        ></f7-link>
      </f7-toolbar>

      <!-- Your main view/tab, should have "view-main" class. It also has "tab-active" class -->
      <f7-view id="view-main" main tab tab-active url="/"></f7-view>

      <!-- Catalog View -->
      <f7-view id="view-prayers" name="prayers" tab url="/catalog/"></f7-view>

      <!-- Settings View -->
      <f7-view
        id="view-calendar"
        name="calendar"
        tab
        url="/calendar/"
      ></f7-view>

      <!-- Settings View -->
      <f7-view id="view-books" name="books" tab url="/api-test/"></f7-view>

      <!-- Settings View -->
      <f7-view id="view-rites" name="rites" tab url="/rites/"></f7-view>
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
<style scoped>
.position-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  margin-bottom: calc(
    var(--f7-block-padding-horizontal) + var(--f7-safe-area-left)
  );
}
</style>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { f7, f7ready } from "framework7-vue";

import routes from "../js/routes";
import store from "../js/store";
import viewsManager from "../js/views-manager";
import deviceAPI from "../js/device/device-api";

import { registerSW } from "virtual:pwa-register";

const needRefresh = ref(false);
const updateSW = registerSW({
  onNeedRefresh() {
    needRefresh.value = true;
  },
  onOfflineReady() {},
});

const updateApp = (): void => {
  f7.dialog.preloader("Обновляем приложение...");
  updateSW();
};

// Framework7 Parameters
const f7params = {
  name: "Валаамский календарь и молитвослов", // App name
  theme: "md",

  // App store
  store: store,
  // App routes
  routes: routes,

  // Register service worker (only on production build)
  // serviceWorker: process.env.NODE_ENV ==='production' ? {
  //   path: '/service-worker.js',
  // } : {},
} as const;

onMounted(() => {
  f7ready(() => {
    viewsManager();
    deviceAPI.setWebViewVisible(true);

    // Call F7 APIs here
  });
});
</script>
