<template>
  <f7-page
    name="settings-test"
    :page-content="false"
    @page:tabshow="onTabShow"
    @page:tabhide="onTabHide"
  >
    <f7-navbar title="Настройки тест" back-link="Back"></f7-navbar>
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

      <f7-block-title>Скорость календаря за год</f7-block-title>
      <f7-block strong-ios outline-ios>
        <f7-button fill :disabled="dayBenchRunning || microBenchRunning" @click="runDayBench">
          Тест дней за {{ benchYear }}
        </f7-button>
        <div v-if="dayBenchLines.length" style="margin-top: 12px">
          <div v-for="(line, index) in dayBenchLines" :key="index">{{ line }}</div>
        </div>
      </f7-block>

      <f7-block-title>Микротест чтения</f7-block-title>
      <f7-block strong-ios outline-ios>
        <f7-button fill :disabled="dayBenchRunning || microBenchRunning" @click="runMicroBench">
          100 дней get, окно 30, prayers_index getAll
        </f7-button>
        <div v-if="microBenchLines.length" style="margin-top: 12px">
          <div v-for="(line, index) in microBenchLines" :key="index">{{ line }}</div>
        </div>
      </f7-block>

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
        <f7-button fill @click="addEvent"
          >Добавить событие в календарь</f7-button
        >
      </f7-block>

      <!--
      <f7-block strong-ios outline-ios>
        <f7-button fill @click="addEventsArray">Добавить много событий</f7-button>
      </f7-block>
      -->

      <f7-block strong-ios outline-ios>
        <f7-button fill @click="add2Events"
          >Добавить 2 события в календарь</f7-button
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
import { ensureNativeCalendar, nativeCalendar } from "@/services/native/calendar";
import { CALENDAR_RESULT_MESSAGE, type CalendarRpcEvent, type CalendarRpcItemResult } from "@/services/native/protocol";
import { testBrowser } from "../js/device/browser-test";
import { useTheme } from "@/composables/useTheme";
import { useSettingsStore } from "@/stores/settings";
import { usePaginationCache } from "@/composables/usePaginationCache";
import { daysApi, type CalendarDayApiElement } from "@/services/api/DaysApi";
import { isNativeBridgeAvailable } from "@/services/native/nativeRpc";
import { CalendarDaysStorage } from "@/services/storage/CalendarDaysStorage";
import type { ValaamDB } from "@/services/storage/indexedDB";
import { NativeTableStorage } from "@/services/storage/native/NativeTableStorage";
import { PrayersIndexStorage } from "@/services/storage/PrayersIndexStorage";

const BENCH_PAGE_SIZE = 100;
const MICRO_GETS = 100;
const MICRO_WINDOW = 30;

const benchYear = new Date().getFullYear();
const dayBenchRunning = ref(false);
const dayBenchLines = ref<string[]>([]);
const microBenchRunning = ref(false);
const microBenchLines = ref<string[]>([]);

const formatBenchMs = (ms: number) => `${ms.toFixed(1)} мс`;

const measureBench = async (action: () => Promise<unknown>): Promise<number> => {
  const start = performance.now();
  await action();
  return performance.now() - start;
};

const benchError = (err: unknown) => (err instanceof Error ? err.message : String(err));

const yieldBenchPaint = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Все дни текущего года: /days/list с 1 января по 31 декабря */
const downloadBenchYear = async (): Promise<CalendarDayApiElement[]> => {
  const fromDate = `${benchYear}0101`;
  const toDate = `${benchYear}1231`;
  const days: CalendarDayApiElement[] = [];

  let page = 1;
  let pageCount = 1;
  while (page <= pageCount) {
    const pageLabel = page === 1 && pageCount === 1 ? `${page}` : `${page} из ${pageCount}`;
    dayBenchLines.value = [`Скачиваю ${benchYear}, страница ${pageLabel}…`];
    const { items, nav } = await daysApi.getDaysPage(fromDate, toDate, page, BENCH_PAGE_SIZE);
    days.push(...items);
    pageCount = nav?.page_count ?? page;
    page += 1;
  }

  return days;
};

/** Скачивает дни года, пишет их в IndexedDB и нативку, затем читает тот же набор из обеих баз */
const runDayBench = async () => {
  dayBenchRunning.value = true;
  dayBenchLines.value = ["Скачиваю…"];

  try {
    const days = await downloadBenchYear();
    const codes = days.map((day) => day.code);
    const idb = new CalendarDaysStorage();
    const hasNative = isNativeBridgeAvailable();
    const native = hasNative ? new NativeTableStorage<string, CalendarDayApiElement>("calendar-days") : null;
    const lines: string[] = [`Дней: ${days.length}`];

    dayBenchLines.value = [...lines, "Запись в IDB…"];
    await yieldBenchPaint();
    try {
      const elapsed = await measureBench(() => idb.putAll(days));
      lines.push(`Запись, IDB: ${formatBenchMs(elapsed)}`);
    } catch (err) {
      lines.push(`Запись, IDB: ${benchError(err)}`);
    }

    if (native) {
      dayBenchLines.value = [...lines, "Запись в нативку…"];
      await yieldBenchPaint();
      try {
        const elapsed = await measureBench(() => native.putAll(days));
        lines.push(`Запись, нативка: ${formatBenchMs(elapsed)}`);
      } catch (err) {
        lines.push(`Запись, нативка: ${benchError(err)}`);
      }
    }

    dayBenchLines.value = [...lines, "Чтение из IDB…"];
    await yieldBenchPaint();
    try {
      let found = 0;
      const elapsed = await measureBench(async () => {
        const read = await idb.getMany(codes);
        found = read.filter((day) => day?.code).length;
      });
      lines.push(`Чтение, IDB: ${formatBenchMs(elapsed)} (${found})`);
    } catch (err) {
      lines.push(`Чтение, IDB: ${benchError(err)}`);
    }

    if (native) {
      dayBenchLines.value = [...lines, "Чтение из нативки…"];
      await yieldBenchPaint();
      try {
        let found = 0;
        const elapsed = await measureBench(async () => {
          const read = await native.getMany(codes);
          found = read.filter((day) => day?.code).length;
        });
        lines.push(`Чтение, нативка: ${formatBenchMs(elapsed)} (${found})`);
      } catch (err) {
        lines.push(`Чтение, нативка: ${benchError(err)}`);
      }
    } else {
      lines.push("Нативка: мост недоступен");
    }

    dayBenchLines.value = lines;
  } catch (err) {
    dayBenchLines.value = [benchError(err)];
  } finally {
    dayBenchRunning.value = false;
  }
};

/** Коды всех дней года: YYYYMMDD, как ключ calendar-days */
const benchDayCodes = (): string[] => {
  const codes: string[] = [];
  const date = new Date(benchYear, 0, 1);
  while (date.getFullYear() === benchYear) {
    codes.push(format(date, "yyyyMMdd"));
    date.setDate(date.getDate() + 1);
  }
  return codes;
};

const appendMicroLine = async (lines: string[], label: string, run: () => Promise<string>) => {
  microBenchLines.value = [...lines, `${label}…`];
  await yieldBenchPaint();
  try {
    lines.push(`${label}: ${await run()}`);
  } catch (err) {
    lines.push(`${label}: ${benchError(err)}`);
  }
};

/**
 * Чтения, близкие к экранам: 100 одиночных get, окно в 30 других дней, весь индекс молитв.
 * Дни должны уже лежать в базе (тест за год). Без моста замеряется только IndexedDB.
 */
const runMicroBench = async () => {
  microBenchRunning.value = true;
  microBenchLines.value = ["Проверяю дни…"];

  try {
    const codes = benchDayCodes();
    const singleCodes = codes.slice(0, MICRO_GETS);
    const windowCodes = codes.slice(MICRO_GETS, MICRO_GETS + MICRO_WINDOW);
    const hasNative = isNativeBridgeAvailable();
    const idb = new CalendarDaysStorage();
    const native = hasNative ? new NativeTableStorage<string, CalendarDayApiElement>("calendar-days") : null;
    const idbPrayers = new PrayersIndexStorage();
    const nativePrayers = hasNative
      ? new NativeTableStorage<number, ValaamDB["prayers-index"]["value"]>("prayers-index")
      : null;

    const idbProbe = await idb.get(codes[0]);
    const nativeProbe = native ? await native.get(codes[0]) : undefined;
    if (!idbProbe?.code && !nativeProbe?.code) {
      microBenchLines.value = [
        hasNative
          ? "Дней в обеих базах нет. Сначала запустите тест дней за год."
          : "Дней в IDB нет. Сначала запустите тест дней за год.",
      ];
      return;
    }

    const lines: string[] = [];
    let idbPrayerCount = 0;
    let nativePrayerCount = 0;

    await appendMicroLine(lines, `100 дней календаря get по одному, IDB`, async () => {
      let found = 0;
      const elapsed = await measureBench(async () => {
        for (const code of singleCodes) {
          const day = await idb.get(code);
          if (day?.code) found += 1;
        }
      });
      return `${formatBenchMs(elapsed)} (${formatBenchMs(elapsed / singleCodes.length)}/шт, ${found})`;
    });

    if (native) {
      await appendMicroLine(lines, `100 дней календаря get по одному, нативка`, async () => {
        let found = 0;
        const elapsed = await measureBench(async () => {
          for (const code of singleCodes) {
            const day = await native.get(code);
            if (day?.code) found += 1;
          }
        });
        return `${formatBenchMs(elapsed)} (${formatBenchMs(elapsed / singleCodes.length)}/шт, ${found})`;
      });
    }

    await appendMicroLine(lines, `Окно 30 дней сразу, IDB`, async () => {
      let found = 0;
      const elapsed = await measureBench(async () => {
        const read = await idb.getMany(windowCodes);
        found = read.filter((day) => day?.code).length;
      });
      return `${formatBenchMs(elapsed)} (${found})`;
    });

    if (native) {
      await appendMicroLine(lines, `Окно 30 дней сразу, нативка`, async () => {
        let found = 0;
        const elapsed = await measureBench(async () => {
          const read = await native.getMany(windowCodes);
          found = read.filter((day) => day?.code).length;
        });
        return `${formatBenchMs(elapsed)} (${found})`;
      });
    }

    await appendMicroLine(lines, `Индекс prayers_index getAll, IDB`, async () => {
      let count = 0;
      const elapsed = await measureBench(async () => {
        count = (await idbPrayers.getAll()).length;
      });
      idbPrayerCount = count;
      return `${formatBenchMs(elapsed)} (${count})`;
    });

    if (nativePrayers) {
      await appendMicroLine(lines, `Индекс prayers_index getAll, нативка`, async () => {
        let count = 0;
        const elapsed = await measureBench(async () => {
          count = (await nativePrayers.getAll()).length;
        });
        nativePrayerCount = count;
        return `${formatBenchMs(elapsed)} (${count})`;
      });
    } else {
      lines.push("Нативка: мост недоступен");
    }

    if (idbPrayerCount === 0 && nativePrayerCount > 0) {
      lines.push("Индекс в IDB пуст: на устройстве он хранится в нативке");
    }

    microBenchLines.value = lines;
  } catch (err) {
    microBenchLines.value = [benchError(err)];
  } finally {
    microBenchRunning.value = false;
  }
};

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

const isStatusBarShown = ref(settingsStore.settings.readingSystemBars === "normal");
watch(isStatusBarShown, (newVal) => {
  device.showStatusBar(newVal);
  settingsStore.setReadingSystemBars(newVal ? "normal" : "fullscreen");
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
  settingsStore.setIsVolumeButtonsScrollEnabled(newVal);

  if (!newVal) {
    device.offVolumeKey();
    return;
  }

  if (!сontentRef.value) return;

  const $сontent = $(сontentRef.value.$el);

  device.onVolumeKey((keyCode) => {
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

const APP_CALENDAR_TITLE = "Календарь Валаам";

const calendarStamp = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");

const toCalendarEvent = (event: {
  id: string;
  title: string;
  description?: string;
  date: Date;
  url?: string;
  alarmDates?: Date[];
}): CalendarRpcEvent => ({
  id: event.id,
  title: event.title,
  description: event.description ?? "",
  date: calendarStamp(event.date),
  url: event.url ?? "",
  ...(event.alarmDates ? { alarmDates: event.alarmDates.map(calendarStamp) } : {}),
});

/** Нет моста — диалог и false. Иначе results. Отказ в доступе тоже диалог и false. */
const takeCalendarResults = async (
  run: () => Promise<CalendarRpcItemResult[]>
): Promise<CalendarRpcItemResult[] | false> => {
  if (!(await ensureNativeCalendar())) {
    f7.dialog.alert("Календарь доступен в приложении");
    return false;
  }
  try {
    const results = await run();
    if (results.some((item) => item.message === CALENDAR_RESULT_MESSAGE.PERMISSION_DENIED)) {
      f7.dialog.alert("Нет прав на календарь");
      return false;
    }
    return results;
  } catch (err) {
    f7.dialog.alert(err instanceof Error ? err.message : "Ошибка календаря");
    return false;
  }
};

const eventId = ref(localStorage.getItem("eventId") || "");

const addEvent = async () => {
  const eventDate = add(new Date(), { minutes: 2 });
  const event = toCalendarEvent({
    id: getUID(),
    title: "Благовещение Пресвятой Богородицы",
    description: "7 апреля. Не забудьте сходить в храм",
    date: eventDate,
    url: "https://app.valaam.ru/webview/#calendar:/days/20250407",
    alarmDates: [add(eventDate, { minutes: -1 }), add(eventDate, { days: -1 })],
  });

  const results = await takeCalendarResults(() =>
    nativeCalendar
      .addEvents({
        events: [event],
      })
      .then((response) => response.results)
  );
  if (!results) return;

  const failed = results.find((item) => !item.success);
  if (failed) {
    f7.dialog.alert("Ошибка при добавлении события: " + (failed.message ?? ""));
    return;
  }

  eventId.value = event.id;
  localStorage.setItem("eventId", event.id);

  f7.dialog.alert("Событие добавлено!");
};



const eventsArrayId = ref(
  JSON.parse(localStorage.getItem("eventsArrayId") || "[]")
);

// Create notifications for every day of the current year
const addEventsArray = async () => {
  const preloader = f7.dialog.preloader("Добавляем события...");

  const currentYear = new Date().getFullYear();
  const events: CalendarRpcEvent[] = [];

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
    const morningNotification = toCalendarEvent({
      id: getUID(),
      title: `Утреннее правило (${dayMonth})`,
      description: "Время утренней молитвы",
      date: morningDate,
      url: `https://app.valaam.ru/webview/#calendar:/days/${formattedDate}`,
      alarmDates: [addMinutes(morningDate, -10), morningDate],
    });

    const eveningNotification = toCalendarEvent({
      id: getUID(),
      title: `Вечернее правило (${dayMonth})`,
      description: "Время вечерней молитвы",
      date: eveningDate,
      url: `https://app.valaam.ru/webview/#calendar:/days/${formattedDate}`,
      alarmDates: [addMinutes(eveningDate, -10), eveningDate],
    });

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

    const results = await takeCalendarResults(() =>
      nativeCalendar.addEvents({ events: batch }).then((response) => response.results)
    );
    if (!results) {
      preloader.close();
      return;
    }

    const failed = results.find((item) => !item.success);
    if (failed) lastError = failed.message ?? "";
    addedIds.push(...results.filter((item) => item.success).map((item) => item.id));
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

const add2Events = async () => {
  const event1 = toCalendarEvent({
    id: getUID(),
    title: "Утреннее правило",
    description: "Делу время, молитве час",
    date: add(new Date(), { minutes: 20 }),
    url: "https://app.valaam.ru/webview/#calendar:/days/20241001",
    alarmDates: [add(new Date(), { minutes: 20 }), add(new Date(), { minutes: 15 })],
  });
  const event2 = toCalendarEvent({
    id: getUID(),
    title: "Вечернее правило",
    description: "Делу время, молитве час",
    date: add(new Date(), { minutes: 40 }),
    url: "https://app.valaam.ru/webview/#calendar:/days/20241005",
    alarmDates: [add(new Date(), { minutes: 39 }), add(new Date(), { minutes: 35 })],
  });

  const results = await takeCalendarResults(() =>
    nativeCalendar
      .addEvents({
        events: [event1, event2],
      })
      .then((response) => response.results)
  );
  if (!results) return;

  const failed = results.find((item) => !item.success);
  if (failed) {
    f7.dialog.alert("Ошибка при добавлении событий: " + (failed.message ?? ""));
    return;
  }

  eventsArrayId.value = [event1.id, event2.id];
  localStorage.setItem("eventsArrayId", JSON.stringify(eventsArrayId.value));
  isEventsEnabled.value = true;

  f7.dialog.alert("События добавлены!");
};

const deleteEvent = async () => {
  // alert("deleteNotification");
  if (!eventId.value) return;

  // alert("deleteNotification:" + notificationId.value);
  const results = await takeCalendarResults(() =>
    nativeCalendar.deleteEvents({ ids: [eventId.value] }).then((response) => response.results)
  );
  if (!results) return;

  const failed = results.find((item) => !item.success);
  if (failed) {
    f7.dialog.alert("Ошибка при удалении события: " + (failed.message ?? ""));
    return;
  }

  eventId.value = "";
  localStorage.removeItem("eventId");

  f7.dialog.alert("Событие удалено!");
};

const deleteEventsArray = async () => {
  if (!eventsArrayId.value || eventsArrayId.value.length === 0) return;

  const preloader = f7.dialog.preloader("Удаляем события...");

  let lastError: string | null = null;

  // Разбиваем массив на пакеты по 50 уведомлений
  const batchSize = 50;
  const deletedIds: string[] = [];

  for (let i = 0; i < eventsArrayId.value.length; i += batchSize) {
    const batch = eventsArrayId.value.slice(i, i + batchSize);
    const results = await takeCalendarResults(() =>
      nativeCalendar.deleteEvents({ ids: batch }).then((response) => response.results)
    );
    if (!results) {
      preloader.close();
      return;
    }

    const failed = results.find((item) => !item.success);
    if (failed) lastError = failed.message ?? "";
    deletedIds.push(...results.filter((item) => item.success).map((item) => item.id));
  }

  preloader.close();

  if (deletedIds.length > 0) {
    const deletedSet = new Set(deletedIds);
    eventsArrayId.value = eventsArrayId.value.filter((id: string) => !deletedSet.has(id));
    if (eventsArrayId.value.length === 0) {
      localStorage.removeItem("eventsArrayId");
    } else {
      localStorage.setItem("eventsArrayId", JSON.stringify(eventsArrayId.value));
    }
  }

  if (lastError) {
    f7.dialog.alert(
      deletedIds.length > 0
        ? `Удалено ${deletedIds.length} событий, ошибка: ${lastError}`
        : `Ошибка при удалении событий: ${lastError}`
    );
  } else {
    f7.dialog.alert(`Удалено ${deletedIds.length} событий`);
  }
};

const isEventsEnabled = ref(false);

const checkCalendarEventsEnabled = async () => {
  if (!(await ensureNativeCalendar())) {
    isEventsEnabled.value = false;
    return;
  }
  isEventsEnabled.value = (await nativeCalendar.hasPermissions()).granted;
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
  if (!(await ensureNativeCalendar())) {
    f7.dialog.alert("Календарь доступен в приложении");
    return;
  }
  const isGranted = (await nativeCalendar.requestPermissions()).granted;
  isEventsEnabled.value = isGranted;
  f7.dialog.alert(
    isGranted ? "Права на календарь получены" : "Нет прав на календарь!"
  );
};

const openNotificationsSettings = () => {
  device.openNotificationsSettings();
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
