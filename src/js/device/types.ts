export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  url?: string;
  alarmDates?: Date[];
}

export interface CalendarEventResponse {
  isSuccess: boolean;
  errorDescription: string;
  id: string | string[];
  hasPermissions: boolean;
}

/**
 * Тип события для Android
 * @see https://developer.android.com/reference/android/provider/CalendarContract.Events
 */
export interface AndroidCalendarEvent {
  id: string; //'ваш api id',
  TITLE: string; //'Рождество Христово',
  DESCRIPTION?: string; // "Описание праздника",
  ORGANIZER?: string; //email для контакта, опционально
  EVENT_LOCATION?: string; //где мероприятие
  DTSTART: number; //Время начала события в миллисекундах по UTC
  DTEND?: number; //Время конца события в миллисекундах по UTC
  EVENT_TIMEZONE: string;
  EVENT_END_TIMEZONE?: string;
  DURATION?: string ; //Продолжительность события в формате RFC5545 для повторяющихся событий
  ALL_DAY?: number;
  RRULE?: string; // Правило повторения для формата события. Например, "FREQ=WEEKLY;COUNT=10;WKST=SU"
  RDATE?: string; // для повторяющихся событий
  AVAILABILITY?: number;
  GUESTS_CAN_INVITE_OTHERS?: number;
  HAS_ALARM?: number;
  CUSTOM_APP_URI?: string; // ссылка на приложение для просмотра события
  CUSTOM_APP_PACKAGE?: string; // имя пакета приложения для просмотра события
  reminders?: {
    MINUTES?: number; // время напоминания в минутах
    METHOD?: number; // метод напоминания
  }[];
}

export interface IOSCalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // yyyy-MM-ddTHH:mm:ss
  url: string;
  alarmDates?: string[]; // массив дат в формате yyyy-MM-ddTHH:mm:ss
}

export interface DeviceAPI {
  KEYCODE_VOLUME_DOWN: number;
  KEYCODE_VOLUME_UP: number;

  setBrightness(value: number): void;
  getBrightness(): Promise<number>;
  resetBrightness(): void;

  getTheme(): Promise<"light" | "dark">;

  showStatusBar(visibility: boolean): void;

  setFullScreen(mode: boolean): void;
  keepScreenOn(mode: boolean): void;
  setStatusBarColor(color: string): void;

  onBackKey(handler: () => boolean): void;

  onVolumeKey(handler: (keyCode: number, event: any) => void): void;
  offVolumeKey(): void;

  addCalendarEvent(event: CalendarEvent | CalendarEvent[], type: 'local' | 'sync'): Promise<CalendarEventResponse>;

  deleteCalendarEvent(id: string | string[]): Promise<CalendarEventResponse>;

  hasCalendarPermissions(): Promise<boolean>;

  requestCalendarPermissions(): Promise<boolean>;

  setWebViewVisible(visible: boolean): void;

  setStatusBarTextColor(color: "light" | "dark"): void;

  setNavigationBarColor(color: string): void;

  openNotificationsSettings(): void;

  openCalendarSettings(): void;
}

export interface AndroidHandler {
  setBrightness(value: number): void;
  getCurrentBrightness(): number;

  getTheme(): string;

  setFullScreen(mode: boolean): void;
  setKeepScreenOn(mode: boolean): void;

  setStatusBarVisibility(visibility: boolean): void;
  setStatusBarColor(color: string): void;
  setLightStatusBars(isLightStatusBars: boolean): void; // отвечает за черные/светлые буквы в статусбаре
  setNavigationBarColor(color: string): void; //для задавания цвета самой полоски (светлая/темная) и фона этой полоски – только для Αndroid. #00ff00

  subscribeKeyEvent(keyCode: number, subscribe: boolean): void;

  addEventToMainCalendar(json: string): void; // Добавление события в синхронизируемый  календарь в формате JSON.stringify(AndroidCalendarEvent)
  addEventToAppCalendar(json: string, title: string): void; // Добавление события в локальный календарь в формате JSON.stringify(AndroidCalendarEvent)  
  addEventsListToMainCalendar(json: string): void; // Добавление списка событий в синхронизируемый календарь в формате JSON.stringify(AndroidCalendarEvent[])
  addEventsListToAppCalendar(json: string, title: string): void; // Добавление списка событий в локальный календарь в формате JSON.stringify(AndroidCalendarEvent[])

  deleteEventFromCalendar(id: string): void; // Удаление события из календаря по id

  requestCalendarPermissions(): void; // запрос на права Календаря (показ диалога с пользователем)
  requestCalendarPermissionsStatus(): Promise<boolean>; // запрос проверки прав на Календарь

  setWebViewVisible(visible: boolean): void;

  openSettings(type: "notifications" | "settings"): void;
}

export interface IOSHandler {
  hideLaunchScreen: {
    postMessage(visible: boolean): void;
  };
  brightnessHandler: {
    postMessage(data: { action: string; value?: number }): void;
  };
  themeHandler: {
    postMessage(data: { action: string }): void;
  };
  statusBarHandler: {
    postMessage(data: { action: string }): void;
  };
  idleTimerHandler: {
    postMessage(data: { action: string }): void;
  };
  statusBarColorHandler: {
    postMessage(data: { action: string; color: string }): void;
  };
  statusBarTextColorHandler: {
    postMessage(data: { color: "light" | "dark" }): void;
  };
  calendarHandler: {
    postMessage(event: IOSCalendarEvent): void;
  };

  askForEventPermissionHandler: {
    postMessage(data: { action: "get" }): void;
  };

  // deleteEventHandler: {
  //   postMessage( id: string ): void;
  // };
  deleteEventHandler: {
    postMessage(data: { id: string }): void;
  };
}

declare global {
  interface Window {
    androidJsHandler?: AndroidHandler;

    onBrightnessValue?(value: number): void;
    onThemeValue?(theme: "light" | "dark"): void;
    onKeyDown?(keyCode: number, event: any): void;
    onBackPressed?(): boolean;
    handleSwipeBack?(): void;

    onAreCalendarPermissionsGranted?(read: boolean, write: boolean): void; 
    onCalendarNotFound?(errorDescription: string): void;
    stacktrace(message: string): void;

    onEventsAdded(eventId: string, param2: string): void;
    onEventsDeleted(eventId: string, param2: string): void;

    webkit?: {
      messageHandlers: IOSHandler;
    };
    /**
     * Примеры ошибок:
     * window.onAddEvent(false, 'Permission not granted for calendar access.')
     * window.onEvent(false, 'Invalid date format. Should be: yyyy-MM-ddTHH:mm')
     * window.onAddEvent(false, 'Failed to save event: \(error.localizedDescription)')
     *
     * @param status - true, если событие добавлено, false - в противном случае
     * @param errorDescription - описание ошибки
     * @param id - id уведомления
     */
    onAddEvent?(status: boolean, errorDescription: string, id: string): void;
    onDeleteEvent?(status: boolean, errorDescription: string, id: string): void;
    onAskForEventPermission?(granted: boolean, comment: string): void;
  }
}
