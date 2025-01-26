import { format } from "date-fns";
import type { Notification, IOSHandler, DeviceAPI } from "./types";

const iosHandler = window.webkit?.messageHandlers;

const iosAPI: DeviceAPI = {
  KEYCODE_VOLUME_UP: 0,
  KEYCODE_VOLUME_DOWN: 0,

  setBrightness(value: number): void {
    const newValue = value / 100;
    iosHandler?.brightnessHandler.postMessage({
      action: "set",
      value: newValue,
    });
  },

  resetBrightness(): void {},

  async getBrightness(): Promise<number> {
    return new Promise((resolve) => {
      window.onBrightnessValue = (value) => {
        resolve(Math.round(value * 100));
      };

      iosHandler?.brightnessHandler.postMessage({
        action: "get",
      });
    });
  },

  async getTheme(): Promise<string> {
    return new Promise((resolve) => {
      window.onThemeValue = (theme) => resolve(theme);
      iosHandler?.themeHandler.postMessage({
        action: "get",
      });
    });
  },

  showStatusBar(visibility: boolean): void {
    iosHandler?.statusBarHandler.postMessage({
      action: visibility ? "show" : "hide",
    });
  },

  setFullScreen(mode: boolean): void {
    // iOS всегда в полноэкранном режиме
  },

  keepScreenOn(mode: boolean): void {
    iosHandler?.idleTimerHandler.postMessage({
      action: mode ? "disable" : "enable",
    });
  },

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

  async addNotification(param: Partial<Notification>): Promise<boolean> {
    return new Promise((resolve) => {
      const notification = {
        id: "123",
        title: param.title || "",
        description: param.description || "",
        date:
          format(param.date || new Date(), "yyyy-MM-dd") +
          "T" +
          format(param.date || new Date(), "HH:mm:ss"),
        url: param.url || "",
      };

      window.onAddEvent = (status) => resolve(status);
      iosHandler?.calendarHandler.postMessage(notification);
    });
  },
};

export default iosAPI;
