import { format } from "date-fns";
const iosHandler = window.webkit?.messageHandlers;
const iosAPI = {
  KEYCODE_VOLUME_UP: 0,
  KEYCODE_VOLUME_DOWN: 0,
  setBrightness(value) {
    const newValue = value / 100;
    iosHandler?.brightnessHandler.postMessage({
      action: "set",
      value: newValue,
    });
  },
  resetBrightness() {},
  async getBrightness() {
    return new Promise((resolve) => {
      window.onBrightnessValue = (value) => {
        resolve(Math.round(value * 100));
      };
      iosHandler?.brightnessHandler.postMessage({
        action: "get",
      });
    });
  },
  async getTheme() {
    return new Promise((resolve) => {
      window.onThemeValue = (theme) => resolve(theme);
      iosHandler?.themeHandler.postMessage({
        action: "get",
      });
    });
  },
  showStatusBar(visibility) {
    iosHandler?.statusBarHandler.postMessage({
      action: visibility ? "show" : "hide",
    });
  },
  setFullScreen(mode) {
    // iOS всегда в полноэкранном режиме
  },
  keepScreenOn(mode) {
    iosHandler?.idleTimerHandler.postMessage({
      action: mode ? "disable" : "enable",
    });
  },
  setStatusBarColor(color) {
    iosHandler?.statusBarColorHandler.postMessage({
      action: "set",
      color,
    });
  },
  onBackKey(handler) {
    window.handleSwipeBack = handler;
  },
  onVolumeKey(handler) {
    // iOS не поддерживает
  },
  offVolumeKey() {
    // iOS не поддерживает
  },
  async addNotification(param) {
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
