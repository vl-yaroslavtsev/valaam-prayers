import { format } from "date-fns";
import type {
  AndroidCalendarEvent,
  CalendarEvent,
  CalendarEventResponse,
  DeviceAPI,
} from "./types";

const androidHandler = window.androidJsHandler;

const calendarPermissionsGrantedCallbacks: ((
  read: boolean,
  write: boolean
) => void)[] = [];
window.onAreCalendarPermissionsGranted = (read, write) => {
  console.log(
    "onAreCalendarPermissionsGranted: read = " + read + ", write = " + write
  );
  calendarPermissionsGrantedCallbacks.forEach((callback) =>
    callback(read, write)
  );
  calendarPermissionsGrantedCallbacks.length = 0;
};

const eventAddedCallbacks: ((eventId: string) => void)[] = [];
window.onEventsAdded = (param1, param2) => {
  console.log("onEventsAdded: param1 = ", param1, ", param2 = ", param2);

  let msg = "onEventsAdded: param1 = " + param1 + ", param2 = " + param2;
  try {
    const res = JSON.parse(param2);
    console.log("onEventsAdded: JSON.parse param2 = ", res);
    msg += "\n\n JSON.parse(param2) success!";
  } catch (error) {
    console.log("onEventsAdded: JSON.parse error = ", error);
    msg += "\n\n JSON.parse(param2) error: " + error;
  }

  eventAddedCallbacks.forEach((callback) => callback(param1));
  eventAddedCallbacks.length = 0;

  alert(msg);
};

const eventDeletedCallbacks: ((eventId: string) => void)[] = [];
window.onEventsDeleted = (param1, param2) => {
  console.log("onEventsDeleted: param1 = ", param1, ", param2 = ", param2);
  let msg = "onEventsDeleted: param1 = " + param1 + ", param2 = " + param2;
  try {
    const res = JSON.parse(param2);
    console.log("onEventsDeleted: JSON.parse param2 = ", res);
    msg += "\n\n JSON.parse(param2) success!";
  } catch (error) {
    console.log("onEventsDeleted: JSON.parse error = ", error);
    msg += "\n\n JSON.parse(param2) error: " + error;
  }
  eventDeletedCallbacks.forEach((callback) => callback(param1));
  eventDeletedCallbacks.length = 0;

  alert(msg);
};

const calendarNotFoundCallbacks: ((errorDescription: string) => void)[] = [];
window.onCalendarNotFound = (errorDescription) => {
  console.log("onCalendarNotFound: errorDescription = " + errorDescription);
  alert("onCalendarNotFound: errorDescription = " + errorDescription);
  calendarNotFoundCallbacks.forEach((callback) => callback(errorDescription));
  calendarNotFoundCallbacks.length = 0;
};

const stacktraceCallbacks: ((message: string) => void)[] = [];
window.stacktrace = (message: string) => {
  console.log("stacktrace: " + message);
  alert("stacktrace: " + message);
  stacktraceCallbacks.forEach((callback) => callback(message));
  stacktraceCallbacks.length = 0;
};

const androidAPI: DeviceAPI = {
  KEYCODE_VOLUME_UP: 24,
  KEYCODE_VOLUME_DOWN: 25,
  /**
   * Устанавливаем яркость от 0 до 100
   */
  setBrightness(value: number): void {
    // 0 <= newBrighness <= 255;
    const newValue = Math.round((value * 255) / 100);
    androidHandler?.setBrightness(newValue);
    console.log("handler.setBrightness(newValue);", newValue);
  },

  /**
   * Сбрасываем яркость до значения по умолчанию
   */
  resetBrightness(): void {
    androidHandler?.setBrightness(-1);
  },

  /**
   * Получаем яркость экрана от 0 до 100
   */
  async getBrightness(): Promise<number> {
    const value = androidHandler?.getCurrentBrightness() || 0;
    return Math.round((value * 100) / 255);
  },

  /**
   * Theme (day/night/unknown)
   */
  async getTheme(): Promise<"light" | "dark"> {
    return androidHandler?.getTheme() === "UI_THEME_DARK" ? "dark" : "light";
  },

  /**
   * Show and hide status bars
   */
  showStatusBar(visibility: boolean): void {
    androidHandler?.setStatusBarVisibility(visibility);
  },

  setFullScreen(mode: boolean): void {
    androidHandler?.setFullScreen(mode);
  },

  /**
   * Keep Screen On
   */
  keepScreenOn(mode: boolean): void {
    androidHandler?.setKeepScreenOn(mode);
  },

  /**
   * StatusBarColor
   * @param color Цвет в формате #00ff00
   */
  setStatusBarColor(color: string): void {
    androidHandler?.setStatusBarColor(color);
  },

  /**
   * Handling Back button
   * Handler must return true, if action handled, false - otherwize
   * @param handler
   */
  onBackKey(handler: () => boolean): void {
    window.onBackPressed = handler;
  },

  /**
   * Подписываемся на обработку
   * клавиш звука KEYCODE_VOLUME_DOWN и KEYCODE_VOLUME_UP
   * handler в первом параметре получает код клавиши
   * @param handler
   */
  onVolumeKey(handler: (keyCode: number, event: any) => void): void {
    if (!handler || typeof handler !== "function") return;

    androidHandler?.subscribeKeyEvent(this.KEYCODE_VOLUME_UP, true);
    androidHandler?.subscribeKeyEvent(this.KEYCODE_VOLUME_DOWN, true);
    window.onKeyDown = handler;
  },

  /**
   * Отписываемся от обработки
   * клавиш звука KEYCODE_VOLUME_DOWN и KEYCODE_VOLUME_UP
   */
  offVolumeKey(): void {
    androidHandler?.subscribeKeyEvent(this.KEYCODE_VOLUME_UP, false);
    androidHandler?.subscribeKeyEvent(this.KEYCODE_VOLUME_DOWN, false);
    window.onKeyDown = undefined;
  },

  /**
   * Добавляем уведомление установленного образца
   * @param param
   */
  async addCalendarEvent(
    param: CalendarEvent | CalendarEvent[]
  ): Promise<CalendarEventResponse> {
    const isGranted = await this.hasCalendarPermissions();
    if (!isGranted) {
      return {
        isSuccess: false,
        error: "Permission not granted",
        id: param instanceof Array ? [] : "",
        hasPermissions: false,
      };
    }

    if (!androidHandler) {
      return {
        isSuccess: false,
        error: "No Android handler",
        id: param instanceof Array ? [] : "",
        hasPermissions: true,
      };
    }

    const mapParam = (param: CalendarEvent): AndroidCalendarEvent => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return {
        id: param.id,
        TITLE: param.title,
        DESCRIPTION:
          param.description +
            (param.url
              ? " Открыть в приложении: " + param.url.replace("https://", "")
              : "") || "",
        DTSTART: param.date.getTime(),
        EVENT_TIMEZONE: timezone,
        DTEND: param.date.getTime() + 1000 * 60 * 60 * 1,
        EVENT_END_TIMEZONE: timezone,
        CUSTOM_APP_URI: param.url,
        CUSTOM_APP_PACKAGE: "ru.valaam.webapp",
        HAS_ALARM: param.alarmDates ? 1 : 0,
        reminder_MINUTES: param.alarmDates?.[0]
          ? Math.round(
              (param.date.getTime() - param.alarmDates[0].getTime()) /
                (1000 * 60)
            )
          : undefined,
        reminder_METHOD: 1, // METHOD_ALERT = 1
      };
    };

    if (Array.isArray(param)) {
      const events = param.map(mapParam);
      console.log("addEventsListToUserCalendar", JSON.stringify(events));
      try {
        androidHandler.addEventsListToUserCalendar(JSON.stringify(events));
        alert("addEventsListToUserCalendar(" + JSON.stringify(events) + ")");
        return { isSuccess: true, error: "", id: "", hasPermissions: true };
      } catch (error) {
        return {
          isSuccess: false,
          error: "Failed to add events list to calendar",
          id: param instanceof Array ? [] : "",
          hasPermissions: true,
        };
      }
    } else {
      return new Promise<CalendarEventResponse>((resolve) => {
        const event = mapParam(param);

        eventAddedCallbacks.push((eventId) => {
          // resolve({isSuccess: true, error: "", id: eventId, hasPermissions: true});
          console.log("eventAddedCallbacks: eventId = " + eventId);
        });

        console.log("addEventToUserCalendar: ", JSON.stringify(event));
        try {
          androidHandler.addEventToUserCalendar(JSON.stringify(event));
          alert("addEventToUserCalendar(" + JSON.stringify(event) + ")");
          resolve({
            isSuccess: true,
            error: "",
            id: param.id,
            hasPermissions: true,
          });
        } catch (error) {
          resolve({
            isSuccess: false,
            error: "Failed to add event to calendar",
            id: "",
            hasPermissions: true,
          });
        }
      });
    }
  },

  async deleteCalendarEvent(
    id: string | string[]
  ): Promise<CalendarEventResponse> {
    const isGranted = await this.hasCalendarPermissions();
    if (!isGranted) {
      return {
        isSuccess: false,
        error: "Permission not granted",
        id: id instanceof Array ? [] : "",
        hasPermissions: false,
      };
    }

    if (Array.isArray(id)) {
      const resArray = await Promise.all(
        id.map((item) => this.deleteCalendarEvent(item))
      );
      return resArray.reduce(
        (acc, curr) => {
          return {
            isSuccess: acc.isSuccess && curr.isSuccess,
            error: acc.error || curr.error,
            id: [...acc.id, curr.id as string],
            hasPermissions: acc.hasPermissions && curr.hasPermissions,
          };
        },
        { isSuccess: false, error: "", id: [], hasPermissions: false }
      );
    }
    console.log("deleteCalendarEvent with id = " + id);

    eventDeletedCallbacks.push((eventId) => {
      // resolve({isSuccess: true, error: "", id: eventId, hasPermissions: true});
      console.log("eventDeletedCallbacks: eventId = " + eventId);
    });
    androidHandler?.deleteEventFromCalendar(id);
    alert('deleteEventFromCalendar("' + id + '")');
    return { isSuccess: true, error: "", id, hasPermissions: true };
  },

  hasCalendarPermissions(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      console.log("hasCalendarPermissions call");
      calendarPermissionsGrantedCallbacks.push((read, write) =>
        resolve(read && write)
      );
      androidHandler?.requestCalendarPermissionsStatus();
    });
  },

  async requestCalendarPermissions(): Promise<boolean> {
    const isGranted = await this.hasCalendarPermissions();
    if (isGranted) {
      return true;
    }
    return new Promise<boolean>((resolve) => {
      console.log("requestCalendarPermissions call");
      calendarPermissionsGrantedCallbacks.push((read, write) =>
        resolve(read && write)
      );
      androidHandler?.requestCalendarPermissions();
    });
  },

  /**
   * Устанавливаем видимость WebView, скрывая SplashScreen
   * @param visible
   */
  setWebViewVisible(visible: boolean): void {
    androidHandler?.setWebViewVisible(visible);
  },

  /**
   * Устанавливаем цвет текста в статусбаре
   * @param color 'light' | 'dark'
   */
  setStatusBarTextColor(color: "light" | "dark"): void {
    const isLightStatusBars = color === "dark";
    androidHandler?.setLightStatusBars(isLightStatusBars);
  },

  /**
   * Устанавливаем цвет полоски в статусбаре
   * @param color Цвет в формате #00ff00
   */
  setNavigationBarColor(color: string): void {
    androidHandler?.setNavigationBarColor(color);
  },

  /**
   * Открываем настройки уведомлений
   * @param type 'notifications' | 'brightness'
   */
  openNotificationsSettings(): void {
    androidHandler?.openSettings("notifications");
  },

  /**
   * Открываем настройки уведомлений
   * @param type 'notifications' | 'brightness'
   */
  openCalendarSettings(): void {
    androidHandler?.openSettings("settings");
  },
};

export default androidAPI;
