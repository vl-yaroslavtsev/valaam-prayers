<template>
  <f7-page
    name="apiTest"
    :page-content="false"
    @page:tabshow="onTabShow"
    @page:tabhide="onTabHide"
  >
    <f7-navbar title="Настройки" back-link="Back"></f7-navbar>
    <f7-page-content ref="сontentRef">
      <f7-list strong-ios dividers-ios outline-ios>
        <f7-list-item title="Тема приложения">
          <template #after>
            <f7-segmented>
              <f7-button
                :class="{ 'button-active': currentTheme === 'light' }"
                @click="setTheme('light')"
                small
              >
                Светлая
              </f7-button>
              <f7-button
                :class="{ 'button-active': currentTheme === 'dark' }"
                @click="setTheme('dark')"
                small
              >
                Темная
              </f7-button>
              <f7-button
                :class="{ 'button-active': currentTheme === 'auto' }"
                @click="setTheme('auto')"
                small
              >
                Авто
              </f7-button>
            </f7-segmented>
          </template>
        </f7-list-item>
      </f7-list>

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
            <f7-range
              :min="0"
              :max="100"
              :step="1"
              v-model:value="currentBrightness"
              :label="true"
              @range:change="onBrightnessChange"
              color="orange"
            />
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
        <f7-list-input
          label="Цвет статусбара"
          type="text"
          placeholder="#000000"
          v-model:value="statusBarColor"
        ></f7-list-input>
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
        События календаря разрешены: {{ isEventsEnabled }}
      </f7-block>

      <f7-block strong-ios outline-ios>
        <f7-button fill @click="addEvent('sync')"
          >Добавить событие в синх. календарь</f7-button
        >
      </f7-block>

      <!--
      <f7-block strong-ios outline-ios>
        <f7-button fill @click="addEventsArray">Добавить много событий</f7-button>
      </f7-block>
      -->

      <f7-block strong-ios outline-ios>
        <f7-button fill @click="add2Events('sync')"
          >Добавить 2 события в синх. календарь</f7-button
        >
      </f7-block>

      <f7-block strong-ios outline-ios>
        <f7-button fill @click="addEvent('local')"
          >Добавить событие в локал. календарь</f7-button
        >
      </f7-block>

      <!--
      <f7-block strong-ios outline-ios>
        <f7-button fill @click="addEventsArray">Добавить много событий</f7-button>
      </f7-block>
      -->

      <f7-block strong-ios outline-ios>
        <f7-button fill @click="add2Events('local')"
          >Добавить 2 события в локал. календарь</f7-button
        >
      </f7-block>

      <f7-block strong-ios outline-ios>
        <f7-button fill @click="deleteEvent" :disabled="!eventId"
          >Удалить событие {{ eventId }}</f7-button
        >
      </f7-block>

      <f7-block strong-ios outline-ios>
        <f7-button fill @click="deleteEventsArray" :disabled="!eventsArrayId"
          >Удалить 2 события</f7-button
        >
      </f7-block>

      <!--
      <f7-block strong-ios outline-ios>
        <f7-button fill @click="deleteEventsArray" :disabled="!eventsArrayId">Удалить много
          событий</f7-button>
      </f7-block>
      -->

      <f7-block strong-ios outline-ios>
        <f7-button fill @click="requestCalendarPermissions"
          >Запросить права на календарь</f7-button
        >
      </f7-block>

      <f7-block strong-ios outline-ios>
        <f7-button fill @click="openCalendarSettings"
          >Открыть настройки календаря</f7-button
        >
      </f7-block>

      <f7-block strong-ios outline-ios>
        <f7-button fill @click="openNotificationsSettings"
          >Открыть настройки уведомлений</f7-button
        >
      </f7-block>

      <f7-block strong-ios outline-ios>
        <a class="link external" href="https://valaam.ru"
          >Внешняя ссылка valaam.ru</a
        >
      </f7-block>

      <f7-block strong-ios outline-ios>
        <a
          class="link external"
          href="https://vuejs.org/guide/introduction.html"
          >Внешняя ссылка vue</a
        >
      </f7-block>

      <f7-block-title>Кэш пагинации</f7-block-title>
      <f7-list strong-ios dividers-ios outline-ios>
        <f7-list-item title="Размер кэша">
          <template #after>
            <span>{{ cacheStats.totalItems }} / {{ cacheStats.maxSize }}</span>
          </template>
        </f7-list-item>
        <f7-list-item 
          v-if="cacheStats.oldestAccess"
          title="Самый старый доступ">
          <template #after>
            <span>{{ formatCacheDate(cacheStats.oldestAccess) }}</span>
          </template>
        </f7-list-item>
        <f7-list-item 
          v-if="cacheStats.newestAccess"
          title="Последний доступ">
          <template #after>
            <span>{{ formatCacheDate(cacheStats.newestAccess) }}</span>
          </template>
        </f7-list-item>
      </f7-list>

      <f7-block strong-ios outline-ios class="grid grid-cols-2 grid-gap">
        <f7-button fill @click="refreshCacheStats">Обновить статистику</f7-button>
        <f7-button fill color="red" @click="clearPaginationCache">Очистить кэш</f7-button>
      </f7-block>
    </f7-page-content>
  </f7-page>
</template>
<script setup lang="ts">
import { add, format, addMinutes } from "date-fns";
import { ref, watch, onMounted } from "vue";
import { f7, f7ready } from "framework7-vue";
import { Dom7 as $ } from "framework7";
import { f7PageContent } from "framework7-vue";
import { device } from "@/js/device";
import type { CalendarEvent } from "@/js/device/types";
import { testBrowser } from "../js/device/browser-test";
import { useTheme } from "@/composables/useTheme";
import { useSettingsStore } from "@/stores/settings";
import { usePaginationCache } from "@/composables/usePaginationCache";

const { currentTheme, setTheme } = useTheme();
const settingsStore = useSettingsStore();
const { getCacheStats, clearAllCache } = usePaginationCache();

const currentBrightness = ref(settingsStore.readingBrightness);

// Инициализация яркости при загрузке
device
  .getBrightness()
  .then((brightness) => {
    if (settingsStore.readingBrightness === 50) {
      // Если значение по умолчанию, используем системную яркость
      currentBrightness.value = brightness;
      settingsStore.setReadingBrightness(brightness);
    }
  });

const onBrightnessChange = (newVal: number) => {
  console.log("onBrightnessChange = ", newVal);
  device.setBrightness(newVal);
  settingsStore.setReadingBrightness(newVal);
};

const resetBrightness = () => {
  device.resetBrightness();

  setTimeout(async () => {
    const brightness = await device.getBrightness();
    currentBrightness.value = brightness;
    settingsStore.setReadingBrightness(brightness);
  }, 0);
};

const showThemeAlert = async () => {
  const theme = await device.getTheme();
  f7.dialog.alert(`Тема устройства: ${theme}`);
};

const isStatusBarShown = ref(settingsStore.settings.isStatusBarVisible);
watch(isStatusBarShown, (newVal) => {
  //device.showStatusBar(newVal);
  settingsStore.setIsStatusBarVisible(newVal);
  console.log("isStatusBarShown", newVal);
});

const isFullscreen = ref(false);
watch(isFullscreen, (newVal) => {
  device.setFullScreen(newVal);
  console.log("isFullscreen", newVal);
});

const isKeepScreenOn = ref(settingsStore.settings.keepScreenOn);
watch(isKeepScreenOn, (newVal) => {
  // device.keepScreenOn(newVal);
  settingsStore.setKeepScreenOn(newVal);
  console.log("isKeepScreenOn", newVal);
});

const statusBarColor = ref("#000000");
const setStatusBarColor = () => {
  device.setStatusBarColor(statusBarColor.value);
  console.log(statusBarColor.value);
};

const сontentRef = ref<typeof f7PageContent | null>(null);
const isVolumeButtonsScroll = ref(settingsStore.settings.isVolumeButtonsScrollEnabled);

watch(isVolumeButtonsScroll, (newVal) => {
  //console.log("watch: pageContentRef", сontentRef.value);
  if (!сontentRef.value) return;

  console.log(сontentRef.value.$el);
  const $сontent = $(сontentRef.value.$el);
  
  settingsStore.setIsVolumeButtonsScrollEnabled(newVal, (keyCode, event) => {
      switch (keyCode) {
        case device.KEYCODE_VOLUME_UP:
          $сontent.scrollTop($сontent.scrollTop() - 50, 200);
          break;

        case device.KEYCODE_VOLUME_DOWN:
          $сontent.scrollTop($сontent.scrollTop() + 50, 200);
          break;
      }
    });
});

const getUID = () => {
  return window.crypto
    .getRandomValues(new Uint16Array(4))
    .reduce((acc, el) => (acc += el.toString(16).padStart(4, "0")), "");
};

const eventId = ref(localStorage.getItem("eventId") || "");

const addEvent = async (type: "local" | "sync" = "sync") => {
  const eventDate = add(new Date(), { minutes: 2 });
  const event = {
    id: getUID(),
    title: "Благовещение Пресвятой Богородицы",
    description: "7 апреля. Не забудьте сходить в храм",
    date: eventDate,
    url: "https://molitvoslov.valaam.ru/app/#view-calendar:/days/20250407",
    alarmDates: [add(eventDate, { minutes: -1 }), add(eventDate, { days: -1 })],
  };

  const { isSuccess, hasPermissions, errorDescription } =
    await device.addCalendarEvent(event, type);

  if (!hasPermissions) {
    f7.dialog.alert("Нет прав на календарь");
    return;
  }

  if (!isSuccess) {
    f7.dialog.alert("Ошибка при добавлении события: " + errorDescription);
    return;
  }

  eventId.value = event.id;
  localStorage.setItem("eventId", event.id);

  f7.dialog.alert("Событие добавлено!");
};

const addLocalEvent = async () => {
  return await addEvent("local");
};

const addSyncEvent = async () => {
  return await addEvent("sync");
};

const eventsArrayId = ref(
  JSON.parse(localStorage.getItem("eventsArrayId") || "[]")
);

// Create notifications for every day of the current year
const addEventsArray = async () => {
  const preloader = f7.dialog.preloader("Добавляем события...");

  const currentYear = new Date().getFullYear();
  const events: CalendarEvent[] = [];

  // Get the first day of the year
  const startDate = new Date(currentYear, 0, 1);
  // Get the last day of the year
  const endDate = new Date(currentYear, 11, 31);

  // Loop through each day of the year
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const formattedDate = format(currentDate, "yyyyMMdd");
    const dayMonth = format(currentDate, "dd.MM");

    // Morning notification (9:00)
    const morningDate = new Date(currentDate);
    morningDate.setHours(9, 0, 0, 0);

    // Evening notification (22:00)
    const eveningDate = new Date(currentDate);
    eveningDate.setHours(22, 0, 0, 0);

    // Create morning notification with two alarms
    const morningNotification = {
      id: getUID(),
      title: `Утреннее правило (${dayMonth})`,
      description: "Время утренней молитвы",
      date: morningDate,
      url: `https://molitvoslov.valaam.ru/app/#view-calendar:/days/${formattedDate}`,
      alarmDates: [
        addMinutes(morningDate, -10), // 10 minutes before
        morningDate, // At the event time
      ],
    };

    // Create evening notification with two alarms
    const eveningNotification = {
      id: getUID(),
      title: `Вечернее правило (${dayMonth})`,
      description: "Время вечерней молитвы",
      date: eveningDate,
      url: `https://molitvoslov.valaam.ru/app/#view-calendar:/days/${formattedDate}`,
      alarmDates: [
        addMinutes(eveningDate, -10), // 10 minutes before
        eveningDate, // At the event time
      ],
    };

    events.push(morningNotification, eveningNotification);

    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // We might need to send notifications in batches to avoid overwhelming the system
  const batchSize = 50;

  let lastError = null;
  const addedIds: string[] = [];

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);

    const { isSuccess, hasPermissions, errorDescription, id } =
      await device.addCalendarEvent(batch, "sync");
    if (!hasPermissions) {
      preloader.close();
      f7.dialog.alert("Нет прав на календарь");
      return;
    }

    if (!isSuccess) {
      lastError = errorDescription;
    } else {
      addedIds.push(...id);
    }
  }

  preloader.close();
  isEventsEnabled.value = true;

  eventsArrayId.value = addedIds;
  localStorage.setItem("eventsArrayId", JSON.stringify(eventsArrayId.value));

  if (lastError) {
    f7.dialog.alert("Ошибка при добавлении событий: " + lastError);
  } else {
    f7.dialog.alert("Добавлено " + eventsArrayId.value.length + " событий");
  }
};

const add2Events = async (type: "local" | "sync" = "sync") => {
  const event1 = {
    id: getUID(),
    title: "Утреннее правило",
    description: "Делу время, молитве час",
    date: add(new Date(), { minutes: 20 }),
    url: "https://molitvoslov.valaam.ru/app/#view-calendar:/days/20241001",
    alarmDates: [
      add(new Date(), { minutes: 20 }),
      add(new Date(), { minutes: 15 }),
    ],
  };
  const event2 = {
    id: getUID(),
    title: "Вечернее правило",
    description: "Делу время, молитве час",
    date: add(new Date(), { minutes: 40 }),
    url: "https://molitvoslov.valaam.ru/app/#view-calendar:/days/20241005",
    alarmDates: [
      add(new Date(), { minutes: 39 }),
      add(new Date(), { minutes: 35 }),
    ],
  };

  const { isSuccess, hasPermissions, errorDescription, id } =
    await device.addCalendarEvent([event1, event2], type);

  if (!hasPermissions) {
    f7.dialog.alert("Нет прав на календарь");
    return;
  }

  if (!isSuccess) {
    f7.dialog.alert("Ошибка при добавлении событий: " + errorDescription);
    return;
  }

  eventsArrayId.value = [event1.id, event2.id];
  localStorage.setItem("eventsArrayId", JSON.stringify(eventsArrayId.value));
  isEventsEnabled.value = isSuccess;

  f7.dialog.alert("События добавлены!");
};

const deleteEvent = async () => {
  // alert("deleteNotification");
  if (!eventId.value) return;

  // alert("deleteNotification:" + notificationId.value);
  const { isSuccess, hasPermissions, errorDescription } =
    await device.deleteCalendarEvent(eventId.value);
  if (!hasPermissions) {
    f7.dialog.alert("Нет прав на календарь");
    return;
  }

  if (!isSuccess) {
    f7.dialog.alert("Ошибка при удалении события: " + errorDescription);
    return;
  }

  f7.dialog.alert("Событие удалено!");
};

const deleteEventsArray = async () => {
  if (!eventsArrayId.value) return;

  const preloader = f7.dialog.preloader("Удаляем события...");

  let lastError = null;

  // Разбиваем массив на пакеты по 50 уведомлений
  const batchSize = 50;
  const deletedIds: string[] = [];

  for (let i = 0; i < eventsArrayId.value.length; i += batchSize) {
    const batch = eventsArrayId.value.slice(i, i + batchSize);
    const { isSuccess, hasPermissions, errorDescription, id } =
      await device.deleteCalendarEvent(batch);
    if (!hasPermissions) {
      preloader.close();
      f7.dialog.alert("Нет прав на календарь");
      return;
    }

    if (!isSuccess) {
      lastError = errorDescription;
    } else {
      deletedIds.push(...id);
    }
  }

  preloader.close();

  if (deletedIds.length > 0) {
    f7.dialog.alert("Удалено " + deletedIds.length + " событий");
  }

  if (lastError) {
    f7.dialog.alert("Ошибка при удалении событий: " + lastError);
  } else {
    f7.dialog.alert("Удалено " + eventsArrayId.value.length + " событий");
  }
};

const isEventsEnabled = ref(false);

const checkCalendarEventsEnabled = async () => {
  const isEnabled = await device.hasCalendarPermissions();
  isEventsEnabled.value = isEnabled;
};

const onVisibilityChange = () => {
  if (!document.hidden) {
    console.log("visibilitychange");
    checkCalendarEventsEnabled();
  }
};

const onTabShow = () => {
  checkCalendarEventsEnabled();

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

const requestCalendarPermissions = async () => {
  const isGranted = await device.requestCalendarPermissions();
  isEventsEnabled.value = isGranted;
  f7.dialog.alert(
    isGranted ? "Права на календарь получены" : "Нет прав на календарь!"
  );
};

const openNotificationsSettings = () => {
  device.openNotificationsSettings();
};

const openCalendarSettings = () => {
  device.openCalendarSettings();
};

// Кэш пагинации
const cacheStats = ref({
  totalItems: 0,
  maxSize: 0,
  oldestAccess: null as Date | null,
  newestAccess: null as Date | null,
});

const refreshCacheStats = async () => {
  const stats = await getCacheStats();
  cacheStats.value = stats;
};

const clearPaginationCache = async () => {
  await clearAllCache();
  await refreshCacheStats();
  f7.dialog.alert('Кэш пагинации очищен');
};

const formatCacheDate = (date: Date) => {
  return date.toLocaleString('ru-RU', { 
    day: '2-digit', 
    month: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Загружаем статистику кэша при монтировании
onMounted(() => {
  refreshCacheStats();
});

console.log(f7);
</script>
