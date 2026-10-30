import type { IOSHandler, Device, ScreenRect } from "@/js/device/types";

const iosHandler = window.webkit?.messageHandlers as IOSHandler;

let themeValueCallbacks: ((theme: 'light' | 'dark') => void)[] = [];
const onThemeValue = (theme: 'light' | 'dark') => {
  themeValueCallbacks.forEach((callback) => callback(theme));
  themeValueCallbacks = [];
};

let brightnessValueCallbacks: ((value: number) => void)[] = [];
const onBrightnessValue = (value: number) => {
  brightnessValueCallbacks.forEach((callback) => callback(value));
  brightnessValueCallbacks = [];
};

const ios: Device = {
  KEYCODE_VOLUME_UP: 0,
  KEYCODE_VOLUME_DOWN: 0,

  init() {
    window.onBrightnessValue = onBrightnessValue;
    window.onThemeValue = onThemeValue;
  },

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

  openNotificationsSettings(): void {
    // iOS не поддерживает
  },

  setShouldHandleLongClick(shouldHandle: boolean): void {
    // iOS не поддерживает
  },

  /**
   * Отключает системный жест "Назад" (свайп от края экрана) в указанной
   * области экрана. Полезно, когда элемент управления (например, слайдер)
   * расположен близко к краю экрана и системный жест мешает работе с ним.
   * Действует до вызова enableBackGesture().
   * @param rect - область экрана в CSS-пикселях (как из getBoundingClientRect())
   */
  disableBackGestureInArea(rect: ScreenRect): void {
    iosHandler?.backGestureHandler.postMessage({ action: "disable", ...rect });
  },

  /**
   * Возвращает системный жест "Назад" в исходное состояние,
   * отменяя действие disableBackGestureInArea()
   */
  enableBackGesture(): void {
    iosHandler?.backGestureHandler.postMessage({ action: "enable" });
  },
};

export default ios;