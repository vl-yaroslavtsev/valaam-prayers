<template>
  <f7-page name="apiTest" :page-content="false" @page:tabshow="onTabShow" @page:tabhide="onTabHide">
    <f7-page-content ref="сontentRef">
      <f7-navbar title="Тест JS API"></f7-navbar>

      <f7-block-title>Браузерное API</f7-block-title>
      <f7-block strong-ios outline-ios class="grid grid-cols-2 grid-gap">
        <f7-button fill @click="testBrowserFitures">Проверить API</f7-button>
      </f7-block>

      <f7-block-title>Яркость экрана</f7-block-title>
      <f7-list simple-list outline-ios strong-ios>
        <f7-list-item>
          <div>
            <f7-icon ios="f7:sun_min" md="material:brightness_low" />
          </div>
          <div style="width: 100%; margin: 0 16px">
            <f7-range :min="0" :max="100" :step="1" v-model:value="currentBrightness" :label="true"
              @range:change="onBrightnessChange" color="orange" />
          </div>
          <div>
            <f7-icon ios="f7:sun_max_fill" md="material:brightness_high" />
          </div>
        </f7-list-item>
        <f7-list-item>
          <f7-button fill @click="resetBrightness">Cбросить яркость</f7-button>
        </f7-list-item>
      </f7-list>

      <f7-block strong-ios outline-ios class="grid grid-cols-2 grid-gap">
        <f7-button fill @click="showThemeAlert">Тема устройства</f7-button>
      </f7-block>

      <f7-list strong-ios dividers-ios outline-ios>
        <f7-list-item title="Показывать статус бар">
          <template #after>
            <f7-toggle v-model:checked="isStatusBarShown" />
          </template>
        </f7-list-item>
      </f7-list>

      <f7-list strong-ios dividers-ios outline-ios>
        <f7-list-item title="Полный экран">
          <template #after>
            <f7-toggle v-model:checked="isFullscreen" />
          </template>
        </f7-list-item>
      </f7-list>

      <f7-list strong-ios dividers-ios outline-ios>
        <f7-list-item title="Не гасить экран">
          <template #after>
            <f7-toggle v-model:checked="isKeepScreenOn" />
          </template>
        </f7-list-item>
      </f7-list>

      <f7-list strong-ios outline-ios>
        <f7-list-input label="Цвет статусбара" type="text" placeholder="#000000"
          v-model:value="statusBarColor"></f7-list-input>
        <f7-list-item>
          <f7-button fill @click="setStatusBarColor">Установить</f7-button>
        </f7-list-item>
      </f7-list>

      <f7-list strong-ios dividers-ios outline-ios>
        <f7-list-item title="Прокручивание с помощью кнопок громкости">
          <template #after>
            <f7-toggle v-model:checked="isVolumeButtonsScroll" />
          </template>
        </f7-list-item>
      </f7-list>

      <f7-block strong-ios outline-ios>
        Уведомления разрешены: {{ isNotificationsEnabled }}
      </f7-block>
      

      <f7-block strong-ios outline-ios class="grid grid-cols-2 grid-gap">
        <f7-button fill @click="addNotification">Добавить уведомление</f7-button>
        <f7-button fill @click="addTwoNotifications">Добавить 2 уведомления</f7-button>
      </f7-block>

      <f7-block strong-ios outline-ios>
        <f7-button fill @click="getNotificationStatus" :disabled="!notificationId">Статус уведомления</f7-button>
      </f7-block>

      <f7-block strong-ios outline-ios v-if="notificationId">
        Статус уведомления {{ notificationId }}: {{ notificationStatus }}
      </f7-block>

      <f7-block strong-ios outline-ios>
        <f7-button fill @click="deleteNotification" :disabled="!notificationId">Удалить уведомление {{ notificationId }}</f7-button>
      </f7-block>    

      <f7-block strong-ios outline-ios>
        <f7-button fill @click="openNotificationsSettings">Открыть настройки уведомлений</f7-button>
      </f7-block>    

      <f7-block strong-ios outline-ios>
        <a class="link external" href="https://valaam.ru" >Внешняя ссылка valaam.ru</a>
      </f7-block>    


      <f7-block strong-ios outline-ios>
        <a class="link external" href="https://vuejs.org/guide/introduction.html" >Внешняя ссылка vue</a>
      </f7-block>

    </f7-page-content>
  </f7-page>
</template>
<script setup lang="ts">
import { add } from "date-fns";
import { ref, watch, onMounted } from "vue";
import { f7, f7ready } from "framework7-vue";
import { Dom7 as $ } from "framework7";
import { f7PageContent } from "framework7-vue";
import deviceAPI from "../js/device/device-api";
import { testBrowser } from "../js/device/browser-test";

const currentBrightness = ref(0);

deviceAPI
  .getBrightness()
  .then((brightness) => (currentBrightness.value = brightness));

const onBrightnessChange = (newVal: number) => {
  console.log("onBrightnessChange = ", newVal);
  deviceAPI.setBrightness(newVal);
};

const resetBrightness = () => {
  deviceAPI.resetBrightness();

  setTimeout(async () => {
    currentBrightness.value = await deviceAPI.getBrightness();
  }, 0);
};

const showThemeAlert = async () => {
  const theme = await deviceAPI.getTheme();
  f7.dialog.alert(`Тема устройства: ${theme}`);
};

const isStatusBarShown = ref(true);
watch(isStatusBarShown, (newVal) => {
  deviceAPI.showStatusBar(newVal);
  console.log("isStatusBarShown", newVal);
});

const isFullscreen = ref(false);
watch(isFullscreen, (newVal) => {
  deviceAPI.setFullScreen(newVal);
  console.log("isFullscreen", newVal);
});

const isKeepScreenOn = ref(false);
watch(isKeepScreenOn, (newVal) => {
  deviceAPI.keepScreenOn(newVal);
  console.log("isKeepScreenOn", newVal);
});

const statusBarColor = ref("#000000");
const setStatusBarColor = () => {
  deviceAPI.setStatusBarColor(statusBarColor.value);
  console.log(statusBarColor.value);
};

const сontentRef = ref<typeof f7PageContent | null>(null);
const isVolumeButtonsScroll = ref(false);

watch(isVolumeButtonsScroll, (newVal) => {
  //console.log("watch: pageContentRef", сontentRef.value);
  if (!сontentRef.value) return;

  console.log(сontentRef.value.$el);
  const $сontent = $(сontentRef.value.$el);
  if (newVal) {
    deviceAPI.onVolumeKey((keyCode, event) => {
      switch (keyCode) {
        case deviceAPI.KEYCODE_VOLUME_UP:
          $сontent.scrollTop($сontent.scrollTop() - 50, 200);
          break;

        case deviceAPI.KEYCODE_VOLUME_DOWN:
          $сontent.scrollTop($сontent.scrollTop() + 50, 200);
          break;
      }
    });
  } else {
    deviceAPI.offVolumeKey();
  }
});

const getUID = () => {
  return window.crypto
    .getRandomValues(new Uint16Array(4))
    .reduce((acc, el) => (acc += el.toString(16).padStart(4, '0')), "");
};

const notificationId = ref('');

const addNotification = () => {
  const notification = {
    id: getUID(),
    title: "Завтра Рождество Пресвятой Богородицы",
    description: "Не забудьте сходить в храм",
    date: add(new Date(), { seconds: 20 }),
    url: "https://molitvoslov.valaam.ru/app/#view-calendar:/days/20241001",
  };

  deviceAPI.addNotification(notification).then((isGranted) => {
    f7.dialog.alert(isGranted ? "Уведомление отправлено!" : "Нет прав на уведомления");
    isNotificationsEnabled.value = isGranted;
    if (isGranted) {
      notificationId.value = notification.id;
      setTimeout(() => {
        getNotificationStatus();
      }, 0);
    }
    console.log("addNotification", notification);
  });
};

const addTwoNotifications = () => {
  const notification1 = {
    id: getUID(),
    title: "Завтра Рождество Пресвятой Богородицы",
    description: "Не забудьте сходить в храм",
    date: add(new Date(), { seconds: 20 }),
    url: "https://molitvoslov.valaam.ru/app/#view-calendar:/days/20241001",
  };
  const notification2 = {
    id: getUID(),
    title: "Утреннее правило",
    description: "Делу время, молитве час",
    date: add(new Date(), { seconds: 80 }),
    url: "https://molitvoslov.valaam.ru/app/#view-calendar:/days/20241005",
  };

  deviceAPI.addNotification([notification1, notification2]).then((isGranted) => {
    f7.dialog.alert(isGranted ? "2 уведомления отправлены!" : "Нет прав на уведомления");
    console.log("addTwoNotifications", [notification1, notification2]);
    isNotificationsEnabled.value = isGranted;
    if (isGranted) {
      notificationId.value = notification1.id;
      setTimeout(() => {
        getNotificationStatus();
      }, 0);
    }
  });
};

const deleteNotification = () => {
  if (!notificationId.value) return;

  deviceAPI.deleteNotification(notificationId.value);
  f7.dialog.alert("Кажется, уведомление было удалено. По крайней мере я попытался... Что ж, статус покажет, удалилось ли");
};

const notificationStatus = ref('UNKNOWN');

const getNotificationStatus = () => {
  console.log("getNotificationStatus, id = ", notificationId.value);
  if (!notificationId.value) return;

  deviceAPI.getNotificationStatus(notificationId.value).then((status) => {
    notificationStatus.value = status;
  });
};

const isNotificationsEnabled = ref(false);

const checkNotificationsEnabled = () => {
  deviceAPI.isNotificationsEnabled().then((isEnabled) => {
    isNotificationsEnabled.value = isEnabled;
  });
};

const onVisibilityChange = () => {
  if (!document.hidden) {
    console.log("visibilitychange");
    checkNotificationsEnabled();
  }
};

const onTabShow = () => {
  checkNotificationsEnabled();

  document.addEventListener("visibilitychange", onVisibilityChange);
};

const onTabHide = () => {
  document.removeEventListener("visibilitychange", onVisibilityChange);
};

/**
 * Тестируем фичи клиента.
 */
const testBrowserFitures = async () => {
  const msg = await testBrowser(f7.device);
  f7.dialog.alert(msg);
};

const openNotificationsSettings = () => {
  deviceAPI.openNotificationsSettings();
};

console.log(f7);
</script>
