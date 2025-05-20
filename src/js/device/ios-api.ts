import { format } from "date-fns";
import type { CalendarEvent, CalendarEventResponse, IOSHandler, DeviceAPI } from "./types";

const iosHandler = window.webkit?.messageHandlers as IOSHandler;

let askForEventPermissionCallbacks: ((granted: boolean) => void)[] = [];
window.onAskForEventPermission = (granted, comment) => {
  askForEventPermissionCallbacks.forEach((callback) => callback(granted));
  askForEventPermissionCallbacks = [];
};

let themeValueCallbacks: ((theme: 'light' | 'dark') => void)[] = [];
window.onThemeValue = (theme) => {
  themeValueCallbacks.forEach((callback) => callback(theme));
  themeValueCallbacks = [];
};

let brightnessValueCallbacks: ((value: number) => void)[] = [];
window.onBrightnessValue = (value) => {
  brightnessValueCallbacks.forEach((callback) => callback(value));
  brightnessValueCallbacks = [];
};

const addEventCallbacks: { [key: string]: ((status: boolean, errorDescription: string, id: string) => void) } = {};
window.onAddEvent = (status, errorDescription, id) => {
  if (!addEventCallbacks[id]) {
    return;
  }
  addEventCallbacks[id](status, errorDescription, id);
  delete addEventCallbacks[id];
};

const deleteEventCallbacks: { [key: string]: ((status: boolean, errorDescription: string, id: string) => void) } = {};
window.onDeleteEvent = (status, errorDescription, id) => {
  // if (errorDescription.includes("not granted")) {
    // alert("onDeleteEvent id: " + id + ", status: " + status + ", errorDescription: " + errorDescription);
  // }

  if (!deleteEventCallbacks[id]) {
    return;
  }
  deleteEventCallbacks[id](status, errorDescription, id);
  delete deleteEventCallbacks[id];
};


const iosAPI: DeviceAPI = {
  KEYCODE_VOLUME_UP: 0,
  KEYCODE_VOLUME_DOWN: 0,

  /**
   * Устанавливает яркость устройства
   * @param value - Значение яркости (0-100)
   */
  setBrightness(value: number): void {
    const newValue = value / 100;
    iosHandler?.brightnessHandler.postMessage({
      action: "set",
      value: newValue,
    });
  },

  /**
   * Сбрасывает яркость устройства
   */
  resetBrightness(): void {},

  /**
   * Получает текущую яркость устройства
   * @returns Promise<number> - текущая яркость (0-100)
   */
  async getBrightness(): Promise<number> {
    return new Promise((resolve) => {
      brightnessValueCallbacks.push((value) => resolve(Math.round(value * 100)));
      iosHandler?.brightnessHandler.postMessage({
        action: "get",
      });
    });
  },

  /**
   * Получает тему устройства
   * @returns Promise<string> - тема устройства
   */
  async getTheme(): Promise<'light' | 'dark'> {
    return new Promise((resolve) => {
      themeValueCallbacks.push((theme) => resolve(theme));
      iosHandler?.themeHandler.postMessage({
        action: "get",
      });
    });
  },

  /**
   * Отображает или скрывает статус-бар
   * @param visibility - true, если статус-бар должен быть видим, false - в противном случае
   */
  showStatusBar(visibility: boolean): void {
    iosHandler?.statusBarHandler.postMessage({
      action: visibility ? "show" : "hide",
    });
  },

  /**
   * Устанавливает режим полноэкранного отображения
   * @param mode - true, если экран должен быть в полноэкранном режиме, false - в противном случае
   */
  setFullScreen(mode: boolean): void {
    // iOS всегда в полноэкранном режиме
  },

  /**
   * Устанавливает режим продолжения работы экрана
   * @param mode - true, если экран должен оставаться включенным, false - в противном случае
   */
  keepScreenOn(mode: boolean): void {
    iosHandler?.idleTimerHandler.postMessage({
      action: mode ? "disable" : "enable",
    });
  },

  /**
   * Устанавливает цвет статус-бара
   * @param color - Цвет статус-бара
   */
  setStatusBarColor(color: string): void {
    iosHandler?.statusBarColorHandler.postMessage({
      action: "set",
      color,
    });
  },

  onBackKey(handler: () => boolean): void {
    window.handleSwipeBack = handler;
  },

  onVolumeKey(handler: (keyCode: number, event: any) => void): void {
    // iOS не поддерживает
  },

  offVolumeKey(): void {
    // iOS не поддерживает
  },

  // TODO: возвращать id добавленного события или false, если ошибка
  /**
   * Добавляет событие в календарь
   * @event event - Событие или массив событий
   * @param type - тип календаря (локальный или синхронизируемый). Пока только синхронизируемый...
   * @returns Promise<CalendarEventResponse> - status: true, если уведомление успешно добавлено, false - если нет
   * id - id добавленного события или массив id добавленных событий
   */
  async addCalendarEvent(event: CalendarEvent | CalendarEvent[], type: 'local' | 'sync' = 'sync'): Promise<CalendarEventResponse> {
    const formatDate = (date: Date) => {
      return format(date, "yyyy-MM-dd") + "T" + format(date, "HH:mm:ss");
    };

    if (Array.isArray(event)) {
      const resArray = await Promise.all(event.map((item) => this.addCalendarEvent(item, type)));
      return resArray.reduce((acc, curr) => {
        return {
          isSuccess: acc.isSuccess || curr.isSuccess,
          errorDescription: acc.errorDescription || curr.errorDescription,
          id: curr.isSuccess ? [...acc.id, curr.id as string] : acc.id,
          hasPermissions: acc.hasPermissions && curr.hasPermissions,
        };
      }, {isSuccess: false, errorDescription: "", id: [], hasPermissions: true});
    }

    return new Promise((resolve, reject) => {
      const nativeEvent = {
        id: event.id,
        title: event.title,
        description: event.description || "",
        date: formatDate(event.date),
        url: event.url || "",
        alarmDates: event.alarmDates?.map((date) => formatDate(date)) || [formatDate(event.date)],
      };

      addEventCallbacks[event.id] = (status, errorDescription, id) => {
        if (status) {
          resolve({isSuccess: true, errorDescription: "", id, hasPermissions: true});

        } else if (errorDescription.includes("not granted")) {
          resolve({isSuccess: false, errorDescription, id: "", hasPermissions: false});

        } else {
          resolve({isSuccess: false, errorDescription, id: "", hasPermissions: true});
        }
      };

      try {
        iosHandler?.calendarHandler.postMessage(nativeEvent);
      } catch (error) {
        console.error("calendarHandler error ", error);
        resolve({isSuccess: false, errorDescription: error instanceof Error ? error.message : "unknown error", id: "", hasPermissions: true});
      }
    });
  },

  /**
   * Устанавливает видимость WebView
   * @param visible - true, если WebView должен быть видим, false - в противном случае
   */
  setWebViewVisible(visible: boolean): void {
    // alert(" window.webkit.messageHandlers.hideLaunchScreen.postMessage(" + visible + ")");
    iosHandler?.hideLaunchScreen.postMessage(visible);
  },

  setStatusBarTextColor(color: 'light' | 'dark'): void {
    // alert("window.webkit.messageHandlers.statusBarTextColorHandler.postMessage({ color: \"" + (isLightText ? "light" : "dark") + "\" })");
    iosHandler?.statusBarTextColorHandler.postMessage({
      color, //или light или dark
    });
  },

  /**
   * Устанавливает цвет навигационной панели
   * @param color - Цвет навигационной панели
   */
  setNavigationBarColor(color: string): void {
    // iOS не поддерживает
  },

  /**
   * Удаляет уведомление из календаря
   * @param id - Идентификатор уведомления
   * @returns Promise<CalendarEventResponse> - success: true, если уведомление успешно удалено, false - если нет
   */
  async deleteCalendarEvent(id: string | string[]): Promise<CalendarEventResponse> {
    const isGranted = await this.hasCalendarPermissions();
    if (!isGranted) {
      return {isSuccess: false, errorDescription: "Permission not granted", id: typeof id === "string" ? "" : [], hasPermissions: false};
    }

    if (Array.isArray(id)) {
      const resArray = await Promise.all(id.map((item) => this.deleteCalendarEvent(item)));
      return resArray.reduce((acc, curr) => {
        return {
          isSuccess: acc.isSuccess && curr.isSuccess,
          errorDescription: acc.errorDescription || curr.errorDescription,
          id: [...acc.id, curr.id as string],
          hasPermissions: acc.hasPermissions && curr.hasPermissions,
        };
      }, {isSuccess: false, errorDescription: "", id: [], hasPermissions: true});
    }

    return new Promise((resolve, reject) => {
      deleteEventCallbacks[id] = (status, errorDescription, id) => {
        // alert("call deleteEventCallbacks[id] id: " + id + ", status: " + status + ", errorDescription: " + errorDescription);
        if (status) {
          resolve({isSuccess: true, errorDescription: "", id, hasPermissions: true});

        } else if (errorDescription.includes("not granted")) {
          resolve({isSuccess: false, errorDescription, id, hasPermissions: false});

        } else {
          resolve({isSuccess: false, errorDescription, id, hasPermissions: true});
        }
      };

      try {
        // alert("call deleteEventHandler id " + id);
        iosHandler?.deleteEventHandler.postMessage({ id });
      } catch (error) {
        // alert("call deleteEventHandler error " + error);
        console.error("deleteEventHandler error ", error);
        resolve({isSuccess: false, errorDescription: error instanceof Error ? error.message : "unknown error", id, hasPermissions: true});
      }
    });
  },

  /**
   * Проверяет, есть ли права на доступ к календарю
   * @returns Promise<boolean> - true, если права есть, false - в противном случае
   */
  hasCalendarPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      askForEventPermissionCallbacks.push((granted) => resolve(granted));
      try {
        iosHandler?.askForEventPermissionHandler.postMessage({
          action: "get"
        });
      } catch (error) {
        console.error("askForEventPermissionHandler error ", error);
      }
    });
  },

  /**
   * Запрашивает права на доступ к календарю
   * @returns Promise<boolean> - true, если права есть, false - в противном случае
   */
  requestCalendarPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      askForEventPermissionCallbacks.push((granted) => resolve(granted));
      iosHandler?.askForEventPermissionHandler.postMessage({
        action: "get"
      });
    });
  },
  /**
   * Открывает настройки уведомлений
   */
  openNotificationsSettings(): void {
    // iOS не поддерживает
  },

  /**
   * Открывает настройки календаря
   */
  openCalendarSettings(): void {
    // iOS не поддерживает
  },
};

export default iosAPI;

/*
- при создении событий в календаре, надо формировать сообщение в метод window.webkit.messageHandlers.calendarHandler.postMessage(notification) и теперь помимо старых свойст в объекте есть и alarmDates - это массив дат
формат дат аналогичен полю date

в alarmDates можно передать множество дат в которые произойдёт напоминание для события
я решил не делать формат типа {days: 1, hours: 2, minutes: 10} так как изначально дата передаётся с приложения и хорошо когда и все остальные даты тоже передаются, чтоб исключить недопонимания в реализации и чтоб приложение однозначно контроллировало это всё время
если же всё-таки нужно сделать формат {days, hours, etc) - дайте знать, но я всё-таки бы оставил датами - это чётко и понятно и нет разночтений никаких точно

- для изменения цвета букв статус бара (светлые/темные)
тут в ios автоматически выбирается в зависимости от того какая тема на девайсе
это можно менять вручную, но значения всё равно только два - тёмное или светлое: .lightContent, .darkContent

- также для добавления события теперь должен передаваться идентификатор там же где и title, в виде строки: id: "some-id"

- чтоб удалить событие по ID надо вызвать 
deleteEventHandler и передать в него id: "some-id"

- сделал чтоб была оплата через приложение банка если оно установлено, добавил идентификаторы банков, проверил на нескольких
сбербанк и яндекс - точно работают для ios, оплату тестовую сделал - всё успешно, пруфы ниже

*/