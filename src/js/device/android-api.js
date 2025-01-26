import { format } from "date-fns";
const androidHandler = window.androidJsHandler;
const androidAPI = {
  KEYCODE_VOLUME_UP: 24,
  KEYCODE_VOLUME_DOWN: 25,
  /**
   * Устанавливаем яркость от 0 до 100
   */
  setBrightness(value) {
    // 0 <= newBrighness <= 255;
    const newValue = Math.round((value * 255) / 100);
    androidHandler?.setBrightness(newValue);
    console.log("handler.setBrightness(newValue);", newValue);
  },
  /**
   * Сбрасываем яркость до значения по умолчанию
   */
  resetBrightness() {
    androidHandler?.setBrightness(-1);
  },
  /**
   * Получаем яркость экрана от 0 до 100
   */
  async getBrightness() {
    const value = androidHandler?.getCurrentBrightness() || 0;
    return Math.round((value * 100) / 255);
  },
  /**
   * Theme (day/night/unknown)
   */
  async getTheme() {
    return androidHandler?.getTheme() || "unknown";
  },
  /**
   * Show and hide status bars
   */
  showStatusBar(visibility) {
    androidHandler?.setStatusBarVisibility(visibility);
  },
  setFullScreen(mode) {
    androidHandler?.setFullScreen(mode);
  },
  /**
   * Keep Screen On
   */
  keepScreenOn(mode) {
    androidHandler?.setKeepScreenOn(mode);
  },
  /**
   * StatusBarColor
   * @param color Цвет в формате #00ff00
   */
  setStatusBarColor(color) {
    androidHandler?.setStatusBarColor(color);
  },
  /**
   * Handling Back button
   * Handler must return true, if action handled, false - otherwize
   * @param handler
   */
  onBackKey(handler) {
    window.onBackPressed = handler;
  },
  /**
   * Подписываемся на обработку
   * клавиш звука KEYCODE_VOLUME_DOWN и KEYCODE_VOLUME_UP
   * handler в первом параметре получает код клавиши
   * @param handler
   */
  onVolumeKey(handler) {
    if (!handler || typeof handler !== "function") return;
    androidHandler?.subscribeKeyEvent(this.KEYCODE_VOLUME_UP, true);
    androidHandler?.subscribeKeyEvent(this.KEYCODE_VOLUME_DOWN, true);
    window.onKeyDown = handler;
  },
  /**
   * Отписываемся от обработки
   * клавиш звука KEYCODE_VOLUME_DOWN и KEYCODE_VOLUME_UP
   */
  offVolumeKey() {
    androidHandler?.subscribeKeyEvent(this.KEYCODE_VOLUME_UP, false);
    androidHandler?.subscribeKeyEvent(this.KEYCODE_VOLUME_DOWN, false);
    window.onKeyDown = undefined;
  },
  /**
   * Добавляем уведомление установленного образца
   * @param param
   */
  async addNotification(param) {
    return new Promise((resolve) => {
      window.onAreNotificationsEnabledResponse = (isEnabled) => {
        resolve(isEnabled);
      };
      androidHandler?.requestAreNotificationsEnabled();
    }).then((isEnabled) => {
      if (isEnabled && androidHandler) {
        const notification = {
          id: "123",
          title: param.title || "",
          description: param.description || "",
          date: format(param.date || new Date(), "yyyyMMdd HH:mm:ss"),
          url: param.url || "",
        };
        androidHandler.addEventToCalendar(JSON.stringify(notification));
        return true;
      }
      return false;
    });
  },
};
export default androidAPI;
