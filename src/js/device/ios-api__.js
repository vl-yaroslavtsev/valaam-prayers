import { format } from "date-fns";

const iosHandler = window.webkit?.messageHandlers;

const iosAPI = {
  KEYCODE_VOLUME_UP: 0,
  KEYCODE_VOLUME_DOWN: 0,

  /**
   * Устанавливаем яркость от 0 до 100
   * @param {number} value
   */
  setBrightness(value) {
    const newValue = (value * 1) / 100;
    // alert("handler.setBrightness(newValue) " + newValue + ", value = "+ value);
    iosHandler.brightnessHandler.postMessage({
      action: "set",
      value: newValue,
    });
    // window.setBrightness(newValue);
    console.log("handler.brightnessHandler(newValue);", newValue);
  },

  /**
   * Сбрасываем яркость до значения по умолчанию
   */
  resetBrightness() {
    //handler.setBrightness(-1);
    return false;
  },

  /**
   * Получаем яркость экрана от 0 до 100
   * @returns {number}
   */
  async getBrightness() {
    const promise = new Promise((resolve) => {
      window.onBrightnessValue = (value) => {
        //alert("Current Brightness: " + Math.round(value * 100));
        console.log("window.onBrightnessValue()", value);

        resolve(Math.round(value * 100));
      };

      iosHandler.brightnessHandler.postMessage({
        action: "get",
      });
    });

    return promise;
  },

  /**
   * Theme (day/night/unknown)
   */
  async getTheme() {
    const promise = new Promise((resolve) => {
      window.onThemeValue = (theme) => resolve(theme);

      iosHandler.themeHandler.postMessage({
        action: "get",
      });
    });
    return promise;
  },

  /**
   * Show and hide status bars
   * @param {boolean} visibility
   */
  showStatusBar(visibility) {
    return iosHandler.statusBarHandler.postMessage({
      action: visibility ? "show" : "hide",
    });
  },

  /**
   * FullScreen mode. IOS always fullscreen
   * @param {boolean} mode
   * @returns
   */
  setFullScreen(mode) {
    return true;
  },

  /**
   * Keep Screen On
   * @param {boolean} mode
   * @returns
   */
  keepScreenOn(mode) {
    return iosHandler.idleTimerHandler.postMessage({
      action: mode ? "disable" : "enable",
    });
  },

  /**
   * StatusBarColor
   * @param {string} color Цвет в формате #00ff00
   * @returns
   */
  setStatusBarColor(color) {
    return iosHandler.statusBarColorHandler.postMessage({
      action: "set",
      color: color,
    });
  },

  /**
   * Handling Back button
   * Handler must return true, if action handled, false - otherwize
   * @param {() => boolean} handler
   */
  onBackKey(handler) {
    window.handleSwipeBack = function () {
      console.log("window.onBackPressed call handler");
      alert("window.handleSwipeBack: Swipe-back gesture");
      //alert("window.onBackPressed call handler");
      handler();
    };
    alert("window.handleSwipeBack = handler call");
  },

  /**
   * Подписываемся на обработку
   * клавиш звука KEYCODE_VOLUME_DOWN и KEYCODE_VOLUME_UP
   * handler в первом параметре получает код клавиши
   * @param {(keyCode, event) => {}} handler
   */
  onVolumeKey(handler) {
    return false;
  },

  /**
   * Отписываемся от обработки
   * клавиш звука KEYCODE_VOLUME_DOWN и KEYCODE_VOLUME_UP
   */
  offVolumeKey() {
    return false;
  },

  /**
   * Добавляем уведомление установленного образца
   * @param {Оbject} param
   * @param {Date} param.date Дата
   */
  async addNotification(param = {}) {
    const promise = new Promise((resolve) => {
      param.date = param.date || new Date();

      const notification = {
        id: "123",
        title: param.title || "",
        description: param.description || "",
        date:
          format(param.date, "yyyy-MM-dd") +
          "T" +
          format(param.date, "HH:mm:ss"),
        url: param.url || "",
      };

      alert("Notification: " + JSON.stringify(notification));

      window.onAddEvent = function (status, errorDescription) {
        alert(
          "window.onAddEvent: status: " +
            status +
            ", errorDescription: " +
            errorDescription,
        );

        if (status) {
          alert("Event added: " + JSON.stringify(notification));
        } else {
          console.log("Event add error: " + errorDescription);
          alert("Event add error: " + errorDescription);
        }
        resolve(status);
      };

      alert(" window.onAddEvent call ");

      iosHandler.calendarHandler.postMessage(notification);

      alert("iosHandler.calendarHandler.postMessage ");
    });

    return promise;
  },

  /**
   * Запрашиваем разрешение на получение уведомлений
   * @param {function(boolean) {}} onGranted
   */
  // requestNotificationPermission(onGranted) {

  // }
};

export default iosAPI;
