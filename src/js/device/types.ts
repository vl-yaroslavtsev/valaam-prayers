export interface Notification {
  id: string;
  title: string;
  description: string;
  date: Date;
  url: string;
}

export interface AndroidNotification {
  id: string;
  title: string;
  description: string;
  date: string; // yyyyMMdd HH:mm:ss
  url: string;
}

export interface IOSNotification {
  id: string;
  title: string;
  description: string;
  date: string; // yyyy-MM-ddTHH:mm:ss
  url: string;
}

export interface DeviceAPI {
  KEYCODE_VOLUME_DOWN: number;
  KEYCODE_VOLUME_UP: number;

  setBrightness(value: number): void;
  getBrightness(): Promise<number>;
  resetBrightness(): void;

  getTheme(): Promise<string>;

  showStatusBar(visibility: boolean): void;

  setFullScreen(mode: boolean): void;
  keepScreenOn(mode: boolean): void;
  setStatusBarColor(color: string): void;

  onBackKey(handler: () => boolean): void;

  onVolumeKey(handler: (keyCode: number, event: any) => void): void;
  offVolumeKey(): void;

  addNotification(notification: Partial<Notification> | Partial<Notification>[]): Promise<boolean>;
  
  deleteNotification(id: string): void;

  isNotificationsEnabled(): Promise<boolean>;

  getNotificationStatus(id: string): Promise<string>;

  setWebViewVisible(visible: boolean): void;

  setStatusBarTextColor(color: 'light' | 'dark'): void;

  setNavigationBarColor(color: string): void; 

  openNotificationsSettings(): void;
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

  addEventToCalendar(notification: string): void; // в формате JSON.stringify(AndroidNotification)
  addSeveralEventsToCalendar(notifications: string): void; // в формате JSON.stringify(AndroidNotification[])
  cancelNotification(id: string): void; // отменяет уведомление по id  

  requestAreNotificationsEnabled(): void;
  requestNotificationsPermission(): void;
  requestNotificationStatus(id: string): Promise<string>;
  
  setWebViewVisible(visible: boolean): void;

  openSettings(type: 'notifications' | 'brightness'): void;
}

export interface IOSHandler {
  hideLaunchScreen:{
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
    postMessage(data: { color: string } ): void;
  };
  calendarHandler: {
    postMessage(notification: IOSNotification): void;
  };
}

declare global {
  interface Window {
    androidJsHandler?: AndroidHandler;
    onBrightnessValue?(value: number): void;
    onThemeValue?(theme: string): void;
    onKeyDown?(keyCode: number, event: any): void;
    onBackPressed?(): boolean;
    onAreNotificationsEnabledResponse?(isEnabled: boolean): void;
    handleSwipeBack?(): void;
    onNotificationStatus?(id: string, status: string): void;

    webkit?: {
      messageHandlers: IOSHandler;
    };
    onAddEvent?(status: boolean, errorDescription: string): void;
  }
}
