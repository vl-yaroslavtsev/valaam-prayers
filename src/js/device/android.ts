import { getCSSVariable, setCSSVariable } from "@/js/utils";

import type {
  AndroidCalendarEvent,
  CalendarEvent,
  CalendarEventResponse,
  Device,
} from "@/js/device/types";


const localCalendarTitle = "Календарь Валаам";

const androidHandler = window.androidJsHandler;

const calendarPermissionsGrantedCallbacks: ((
  read: boolean,
  write: boolean
) => void)[] = [];
const onAreCalendarPermissionsGranted = (read: boolean, write: boolean) => {
  console.log(
    "onAreCalendarPermissionsGranted: read = " + read + ", write = " + write
  );
  calendarPermissionsGrantedCallbacks.forEach((callback) =>
    callback(read, write)
  );
  calendarPermissionsGrantedCallbacks.length = 0;
};

interface AddedEventResponse {
  id: string;
  errorDescription?: string;
  success: boolean;
}

const eventAddedCallbacks: {
  [id: string]: (event: AddedEventResponse) => void;
} = {};
const onEventsAdded = (successEvents: string, errorEvents: string = "[]") => {
  console.log(
    "onEventsAdded: successEvents = ",
    successEvents,
    ", errorEvents = ",
    errorEvents
  );

  try {
    const successEventsArray: AddedEventResponse[] = JSON.parse(successEvents);
    const errorEventsArray: AddedEventResponse[] = JSON.parse(errorEvents);

    successEventsArray.forEach((event: AddedEventResponse) => {
      if (eventAddedCallbacks[event.id]) {
        eventAddedCallbacks[event.id](event);
        delete eventAddedCallbacks[event.id];
      }
    });

    errorEventsArray.forEach((event: AddedEventResponse) => {
      if (eventAddedCallbacks[event.id]) {
        eventAddedCallbacks[event.id](event);
        delete eventAddedCallbacks[event.id];
      }
    });
  } catch (error) {
    console.log("onEventsAdded: JSON.parse error = ", error);
  }
};

interface DeletedEventResponse {
  id: string;
  errorDescription: string;
  success: boolean;
}

const eventDeletedCallbacks: {
  [id: string]: (event: DeletedEventResponse) => void;
} = {};
const onEventsDeleted = (events: string = "[]") => {
  console.log("onEventsDeleted: events = ", events);
  try {
    const eventsArray: DeletedEventResponse[] = JSON.parse(events);
    eventsArray.forEach((event: DeletedEventResponse) => {
      if (eventDeletedCallbacks[event.id]) {
        eventDeletedCallbacks[event.id](event);
        delete eventDeletedCallbacks[event.id];
      }
    });
  } catch (error) {
    console.log("onEventsDeleted: JSON.parse error = ", error);
  }
};

// При скрытии статус бара Android сбрасывает env(safe-area-top)
// Сохраняем это значение, чтобы место под статус бар оставалось после его скрытия.
const saveStatusBarHeight = () => {
  const statusBarHeight = getCSSVariable('--f7-safe-area-top');
  setCSSVariable('--f7-safe-area-top', statusBarHeight);
  console.log("saveStatusBarHeight: statusBarHeight = ", statusBarHeight);
};

const android: Device = {
  KEYCODE_VOLUME_UP: 24,
  KEYCODE_VOLUME_DOWN: 25,

  init ()  {
    window.onEventsDeleted = onEventsDeleted;
    window.onEventsAdded = onEventsAdded;
    window.onAreCalendarPermissionsGranted = onAreCalendarPermissionsGranted;

    saveStatusBarHeight();
  },
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
    const theme = androidHandler?.getTheme();
    console.log("getTheme: theme = ", theme);
    return theme === "UI_MODE_NIGHT_YES" ? "dark" : "light";
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
   * @event event
   * @param type 'local' | 'sync' - тип календаря (локальный или синхронизируемый)
   */
  async addCalendarEvent(
    event: CalendarEvent | CalendarEvent[], 
    type: 'local' | 'sync' = 'sync'
  ): Promise<CalendarEventResponse> {
    const isGranted = await this.hasCalendarPermissions();
    if (!isGranted) {
      return {
        isSuccess: false,
        errorDescription: "Permission not granted",
        id: "",
        hasPermissions: false,
      };
    }

    if (!androidHandler) {
      return {
        isSuccess: false,
        errorDescription: "No Android handler",
        id: "",
        hasPermissions: true,
      };
    }

    const mapEventToNative = (event: CalendarEvent): AndroidCalendarEvent => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return {
        id: event.id,
        TITLE: event.title,
        DESCRIPTION:
          event.description +
            (event.url
              ? " Открыть в приложении: " + event.url.replace("https://", "") + "\n Подробнее: " + event.url
              : "") || "",
        DTSTART: event.date.getTime(),
        EVENT_TIMEZONE: timezone,
        DTEND: event.date.getTime() + 1000 * 60 * 60 * 1,
        EVENT_END_TIMEZONE: timezone,
        CUSTOM_APP_URI: event.url,
        CUSTOM_APP_PACKAGE: "ru.valaam.webapp",
        HAS_ALARM: event.alarmDates ? 1 : 0,
        reminders: (event.alarmDates || []).map((alarmDate) => ({
          MINUTES: Math.round(
            (event.date.getTime() - alarmDate.getTime()) / (1000 * 60)
          ),
          METHOD: 1, // METHOD_ALERT = 1
        })),
      };
    };

    const addEventCallback = (eventId: string, resolve: (result: CalendarEventResponse) => void) => {
      eventAddedCallbacks[eventId] = ({success, errorDescription}: AddedEventResponse) => {
        console.log("eventAddedCallbacks: event = ", eventId, {success, errorDescription});
        errorDescription = errorDescription || "";
        if (errorDescription.includes("Calendar+not+found")) {
          errorDescription = "Calendar not found";
        }
        resolve({
          isSuccess: success,
          errorDescription,
          id: eventId,
          hasPermissions: true,
        });
      };
    };

    if (Array.isArray(event)) {
      const nativeEvents = event.map(mapEventToNative);
      console.log(type === 'sync' ? "addEventsListToMainCalendar" : "addEventsListToAppCalendar", JSON.stringify(nativeEvents));
      try {
        const promises = nativeEvents.map((event: AndroidCalendarEvent) => {
          return new Promise<CalendarEventResponse>((resolve) => {
            addEventCallback(event.id, resolve);
          });
        });

        if (type === 'sync') {
          androidHandler.addEventsListToMainCalendar(JSON.stringify(nativeEvents));
        } else {
          androidHandler.addEventsListToAppCalendar(JSON.stringify(nativeEvents), localCalendarTitle);
        }

        const resArray = await Promise.all(promises);
        return resArray.reduce(
          (acc, curr) => {
            return {
              isSuccess: acc.isSuccess || curr.isSuccess,
              errorDescription: acc.errorDescription || curr.errorDescription,
              id: curr.isSuccess ? [...acc.id, curr.id as string] : acc.id,
              hasPermissions: true,
            };
          },
          {
            isSuccess: false,
            errorDescription: "",
            id: [],
            hasPermissions: true,
          }
        );

        // alert("addEventsListToUserCalendar(" + JSON.stringify(events) + ")");
      } catch (error) {
        return {
          isSuccess: false,
          errorDescription:  error instanceof Error
          ? error.message
          : "Failed to add event to calendar",
          id: "",
          hasPermissions: true,
        };
      }
    } else {
      return new Promise<CalendarEventResponse>((resolve) => {
        const nativeEvent = mapEventToNative(event);

        addEventCallback(nativeEvent.id, resolve);
        console.log(type === 'sync' ? "addEventToMainCalendar: " : "addEventToAppCalendar: ", JSON.stringify(nativeEvent));
        try {
          if (type === 'sync') {
            androidHandler.addEventToMainCalendar(JSON.stringify(nativeEvent));
          } else {
            androidHandler.addEventToAppCalendar(JSON.stringify(nativeEvent), localCalendarTitle);
          }
        } catch (error) {
          console.log(type === 'sync' ? "addEventToMainCalendar: error = " : "addEventToAppCalendar: error = ", error);
          resolve({
            isSuccess: false,
            errorDescription:
              error instanceof Error
                ? error.message
                : "Failed to add event to calendar",
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
        errorDescription: "Permission not granted",
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
            errorDescription: acc.errorDescription || curr.errorDescription,
            id: acc.isSuccess ? [...acc.id, curr.id as string] : acc.id,
            hasPermissions: true,
          };
        },
        {
          isSuccess: false,
          errorDescription: "",
          id: [],
          hasPermissions: true,
        }
      );
    }

    return new Promise<CalendarEventResponse>((resolve) => {
      console.log("deleteCalendarEvent with id = ", id);

      eventDeletedCallbacks[id] = ({success, errorDescription}: DeletedEventResponse) => {
        // resolve({isSuccess: true, error: "", id: eventId, hasPermissions: true});
        console.log("eventDeletedCallbacks: eventId = ", {success, errorDescription});
        resolve({
          isSuccess: success,
          errorDescription,
          id,
          hasPermissions: true,
        });
      };

      alert('deleteEventFromCalendar("' + id + '")');
      try {
        androidHandler?.deleteEventFromCalendar(id);
      } catch (error) {
        resolve({
          isSuccess: false,
          errorDescription:
            error instanceof Error
              ? error.message
              : "Failed to delete event from calendar",
          id,
          hasPermissions: true,
        });
      }
    });
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

  setShouldHandleLongClick(shouldHandle: boolean): void {
    androidHandler?.setShouldHandleLongClick(shouldHandle);
  },
};

export default android;
