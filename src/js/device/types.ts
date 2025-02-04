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

  addNotification(notification: Partial<Notification>): Promise<boolean>;
}

export interface AndroidHandler {
  setBrightness(value: number): void;
  getCurrentBrightness(): number;
  getTheme(): string;
  setStatusBarVisibility(visibility: boolean): void;
  setFullScreen(mode: boolean): void;
  setKeepScreenOn(mode: boolean): void;
  setStatusBarColor(color: string): void;
  subscribeKeyEvent(keyCode: number, subscribe: boolean): void;
  requestAreNotificationsEnabled(): void;
  addEventToCalendar(notification: string): void; // в формате JSON.stringify(AndroidNotification)
  requestNotificationsPermission(): void;
}

export interface IOSHandler {
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
  calendarHandler: {
    postMessage(notification: IOSNotification): void;
  };
}

declare global {
  interface Window {
    androidJsHandler?: AndroidHandler;
    webkit?: {
      messageHandlers: IOSHandler;
    };
    onBrightnessValue?(value: number): void;
    onThemeValue?(theme: string): void;
    onKeyDown?(keyCode: number, event: any): void;
    onBackPressed?(): boolean;
    onAreNotificationsEnabledResponse?(isEnabled: boolean): void;
    handleSwipeBack?(): void;
    onAddEvent?(status: boolean, errorDescription: string): void;
  }
}
