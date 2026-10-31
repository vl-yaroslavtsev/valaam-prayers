// Типы для устройств и нативного API

/**
 * Область экрана в CSS-пикселях (как у DOMRect / getBoundingClientRect())
 */
export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Device {
  KEYCODE_VOLUME_DOWN: number;
  KEYCODE_VOLUME_UP: number;

  init(): void;

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

  setWebViewVisible(visible: boolean): void;

  setStatusBarTextColor(color: "light" | "dark"): void;

  setNavigationBarColor(color: string): void;

  openNotificationsSettings(): void;

  openSettings(type?: "notifications" | "settings"): void;

  setShouldHandleLongClick(shouldHandle: boolean): void;

  /**
   * Отключает системный жест "Назад" (свайп от края экрана на Android,
   * Predictive Back и т.п.) в указанной области экрана.
   * Полезно, когда элемент управления (например, слайдер) расположен близко
   * к краю экрана и системный жест мешает работе с ним.
   * Действует до вызова enableBackGesture().
   * @param rect - область экрана в CSS-пикселях (как из getBoundingClientRect())
   */
  disableBackGestureInArea(rect: ScreenRect): void;

  /**
   * Возвращает системный жест "Назад" в исходное состояние,
   * отменяя действие disableBackGestureInArea()
   */
  enableBackGesture(): void;
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

  setWebViewVisible(visible: boolean): void;

  openSettings(type: "notifications" | "settings"): void;

  setShouldHandleLongClick(shouldHandle: boolean): void;

  disableBackGestureInArea(x: number, y: number, width: number, height: number): void; // Отключает системный жест "Назад" в области экрана (координаты в CSS px)
  enableBackGesture(): void; // Возвращает системный жест "Назад" в исходное состояние

  /**
   * RPC для WebView младше версии 82, где нет valaamNativeRpcPort.
   * Запрос JSON-строкой, ответ приходит в window.__nativeRpc.onMessage.
   * На WebView с портом нативка этот вызов игнорирует: origin он не проверяет.
   */
  rpc?(requestJson: string): void;
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

  backGestureHandler: {
    postMessage(
      data:
        | { action: "disable"; x: number; y: number; width: number; height: number }
        | { action: "enable" }
    ): void;
  };

  /** RPC нативного моста (docs/native-bridge-protocol.md): ответ приходит JSON-строкой */
  nativeRpc?: {
    postMessage(requestJson: string): Promise<unknown>;
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

    stacktrace(message: string): void;

    webkit?: {
      messageHandlers: IOSHandler;
    };
  }
}

export {}; // Делает файл модулем 