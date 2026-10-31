import { getCSSVariable, setCSSVariable } from "@/js/utils";

import type { Device, ScreenRect } from "@/js/device/types";

const androidHandler = window.androidJsHandler;

/**
 * Android обнуляет env(safe-area-inset-*), когда прячет панель.
 * На это время записываем уже посчитанные px, чтобы вёрстка не прыгала.
 * Снимаем инлайн только после того, как env() снова ненулевой: иначе на один кадр
 * отступ схлопывается в 0 и лист дёргается. Пока панель видна, переменная живая
 * и при повороте экрана обновляется сама.
 */
type InsetEdge = "top" | "bottom";

const INSET_VARIABLE = {
  top: "--f7-safe-area-top",
  bottom: "--f7-safe-area-bottom",
} as const;

const insetGeneration: Record<InsetEdge, number> = { top: 0, bottom: 0 };

const measureEnvInset = (edge: InsetEdge): number => {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;";
  const padding = edge === "top" ? "paddingTop" : "paddingBottom";
  probe.style[padding] = `env(safe-area-inset-${edge}, 0px)`;
  document.documentElement.appendChild(probe);
  const value = parseFloat(getComputedStyle(probe)[padding]) || 0;
  probe.remove();
  return value;
};

const pinSafeAreaInset = (edge: InsetEdge) => {
  insetGeneration[edge] += 1;
  const value = getCSSVariable(INSET_VARIABLE[edge]);
  if (!value) return;
  setCSSVariable(INSET_VARIABLE[edge], value);
};

const unpinSafeAreaInset = (edge: InsetEdge) => {
  const generation = insetGeneration[edge];
  const started = performance.now();
  const tick = () => {
    if (insetGeneration[edge] !== generation) return;
    const restored = measureEnvInset(edge) > 0;
    if (!restored && performance.now() - started < 600) {
      requestAnimationFrame(tick);
      return;
    }
    if (insetGeneration[edge] !== generation) return;
    document.documentElement.style.removeProperty(INSET_VARIABLE[edge]);
  };
  requestAnimationFrame(tick);
};

const android: Device = {
  KEYCODE_VOLUME_UP: 24,
  KEYCODE_VOLUME_DOWN: 25,

  init() {},
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
    if (!visibility) pinSafeAreaInset("top");
    androidHandler?.setStatusBarVisibility(visibility);
    if (visibility) unpinSafeAreaInset("top");
  },

  setFullScreen(mode: boolean): void {
    if (mode) pinSafeAreaInset("bottom");
    androidHandler?.setFullScreen(mode);
    if (!mode) unpinSafeAreaInset("bottom");
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

  openSettings(type: "notifications" | "settings" = "settings"): void {
    (window.androidJsHandler ?? androidHandler)?.openSettings(type);
  },

  setShouldHandleLongClick(shouldHandle: boolean): void {
    androidHandler?.setShouldHandleLongClick(shouldHandle);
  },

  /**
   * Отключает системный жест "Назад" (свайп от края экрана) в указанной
   * области экрана. Полезно, когда элемент управления (например, слайдер)
   * расположен близко к краю экрана и системный жест мешает работе с ним.
   * Действует до вызова enableBackGesture().
   * @param rect - область экрана в CSS-пикселях (как из getBoundingClientRect())
   */
  disableBackGestureInArea(rect: ScreenRect): void {
    androidHandler?.disableBackGestureInArea(rect.x, rect.y, rect.width, rect.height);
  },

  /**
   * Возвращает системный жест "Назад" в исходное состояние,
   * отменяя действие disableBackGestureInArea()
   */
  enableBackGesture(): void {
    androidHandler?.enableBackGesture();
  },
};

export default android;
