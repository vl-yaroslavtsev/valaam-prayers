/**
 * ****************
 * Android JS API *
 * ****************
 * usage in JS:
 * Theme (day/night/unknown)
 * let theme = androidJsHandler.getTheme();
 *
 * //Show and hide status bars
 * androidJsHandler.setStatusBarVisibility(true);
 * androidJsHandler.setStatusBarVisibility(false);
 *
 * //FullScreen mode
 * androidJsHandler.setFullScreen(true);
 * androidJsHandler.setFullScreen(false);
 *
 * //Keep Screen On
 * androidJsHandler.setKeepScreenOn(true);
 * androidJsHandler.setKeepScreenOn(false);
 *
 * //StatusBarColor
 * androidJsHandler.setStatusBarColor("#00ff00");
 *
 * //handling Back button
 * implement Js function
 * function onBackPressed() {
 *      return true;//if action handled
 *      return false;//otherwise
 * }
 *
 * setBrightness(newBrightness: Int) 0 <= newBrighness <= 255
 * set -1 to reset
 *
 * getCurrentBrightness
 * 0 <= brightness <= 255
 *
 * Key events subscription
 *   ACTION_DOWN 0;
 *   ACTION_UP   1;
 *
 *  KEYCODE_VOLUME_UP   24
 *  KEYCODE_VOLUME_DOWN 25
 *
 *  subscribeKeyEvent == true – subscribe
 *  subscribeKeyEvent == false – unsubscribe
 *
 *  androidJsHandler.subscribeKeyEvent(24, true);
 *  androidJsHandler.subscribeKeyEvent(25, true);
 *
 *  function onKeyDown(keyCode, event) {
 *     alert('keyCode = ' + keyCode + '   event = ' + event);
 *  }
 *
 *  //Добавить событие в календарь
 *  const CalendarObject = {
 *       title: "",
 *       description: "",
 *       date: "",
 *       url: "",
 *   };
 *
 *   const calendarObject = Object.create(CalendarObject);
 *
 *   calendarObject.title = "заголовок напоминания";
 *   calendarObject.description = "описание напоминания";
 *   calendarObject.date = "20241023 11:10:00";
 *   calendarObject.url = "https://google.com";
 *
 *   androidJsHandler.addEventToCalendar(JSON.stringify(calendarObject));
 *
 *   //Запрос на проверку прав на уведомления
 *   //Сначала пишем эту функцию
 *   function onAreNotificationsEnabledResponse(isEnabled) {
 *     //затем дергаем androidJsHandler.requestAreNotificationsEnabled();
 *     //которая в вызывает onAreNotificationsEnabledResponse
 *
 *     alert(isEnabled);
 * }
 *
 * androidJsHandler.requestAreNotificationsEnabled();
 * */

import { format } from "date-fns";

const andoroidHandler = window?.androidJsHandler;

const androidAPI = {
  KEYCODE_VOLUME_UP: 24,
  KEYCODE_VOLUME_DOWN: 25,

  /**
   * Устанавливаем яркость от 0 до 100
   * @param {number} value
   */
  setBrightness(value) {
    const newValue = Math.round((value * 255) / 100);
    // 0 <= newBrighness <= 255;
    // set -1 to reset
    // alert("handler.setBrightness(newValue) " + newValue + ", value = "+ value);
    andoroidHandler.setBrightness(newValue);
    // window.setBrightness(newValue);
    console.log("handler.setBrightness(newValue);", newValue);
  },

  /**
   * Сбрасываем яркость до значения по умолчанию
   */
  resetBrightness() {
    andoroidHandler.setBrightness(-1);
  },

  /**
   * Получаем яркость экрана от 0 до 100
   * @returns {number}
   */
  async getBrightness() {
    const value = andoroidHandler.getCurrentBrightness();
    // alert("handler.getCurrentBrightness() " + value);
    console.log("handler.getCurrentBrightness()", value);
    return Math.round((value * 100) / 255);
  },

  /**
   * Theme (day/night/unknown)
   */
  async getTheme() {
    return andoroidHandler.getTheme();
  },

  /**
   * Show and hide status bars
   * @param {boolean} visibility
   */
  showStatusBar(visibility) {
    return andoroidHandler.setStatusBarVisibility(visibility);
  },

  /**
   * FullScreen mode
   * @param {boolean} mode
   * @returns
   */
  setFullScreen(mode) {
    return andoroidHandler.setFullScreen(mode);
  },

  /**
   * Keep Screen On
   * @param {boolean} mode
   * @returns
   */
  keepScreenOn(mode) {
    return andoroidHandler.setKeepScreenOn(mode);
  },

  /**
   * StatusBarColor
   * @param {string} color Цвет в формате #00ff00
   * @returns
   */
  setStatusBarColor(color) {
    return andoroidHandler.setStatusBarColor(color);
  },

  /**
   * Handling Back button
   * Handler must return true, if action handled, false - otherwize
   * @param {() => boolean} handler
   */
  onBackKey(handler) {
    window.onBackPressed = () => {
      console.log("window.onBackPressed call handler");
      //alert("window.onBackPressed call handler");
      return handler();
    };
    // handler.onBackPressed =  () => {
    //   console.log("handler.onBackPressed call handler");
    //   alert("handler.onBackPressed call handler");
    //   handler();
    // };
    console.log("window.onBackPressed = handler;", handler);
  },

  /**
   * Подписываемся на обработку
   * клавиш звука KEYCODE_VOLUME_DOWN и KEYCODE_VOLUME_UP
   * handler в первом параметре получает код клавиши
   * @param {(keyCode, event) => {}} callback
   */
  onVolumeKey(handler) {
    if (!handler || typeof handler != "function") {
      return;
    }

    andoroidHandler.subscribeKeyEvent(androidAPI.KEYCODE_VOLUME_UP, true);
    andoroidHandler.subscribeKeyEvent(androidAPI.KEYCODE_VOLUME_DOWN, true);

    window.onKeyDown = (keyCode, event) => {
      console.log("window.onKeyDown call handler", handler);
      handler(keyCode, event);
    };
  },

  /**
   * Отписываемся от обработки
   * клавиш звука KEYCODE_VOLUME_DOWN и KEYCODE_VOLUME_UP
   */
  offVolumeKey() {
    andoroidHandler.subscribeKeyEvent(androidAPI.KEYCODE_VOLUME_UP, false);
    console.log("handler.subscribeKeyEvent(KEYCODE_VOLUME_UP, false)");

    andoroidHandler.subscribeKeyEvent(androidAPI.KEYCODE_VOLUME_DOWN, false);
    console.log("handler.subscribeKeyEvent(KEYCODE_VOLUME_DOWN, false);");

    window.onKeyDown = false;
    console.log(" window.onKeyDown = false;");
  },

  /**
   * Добавляем уведомление установленного образца
   * @param {Object} param
   * @param {Date} param.date Дата
   */
  async addNotification(param) {
    const promise = new Promise((resolve, reject) => {
      window.onAreNotificationsEnabledResponse = (isEnabled) => {
        resolve(isEnabled);
      };
      andoroidHandler.requestAreNotificationsEnabled();
    });

    promise.then((isNotificationEnabled) => {
      if (isNotificationEnabled) {
        param.date = param.date || new Date();

        const notification = {
          id: "123",
          title: param.title || "",
          description: param.description || "",
          date: format(param.date, "yyyyMMdd HH:mm:ss"),
          url: param.url || "",
        };

        return andoroidHandler.addEventToCalendar(JSON.stringify(notification));
      }
    });

    return promise;
  },

  /**
   * Запрашиваем разрешение на получение уведомлений
   * @param {function(boolean) {}} onGranted
   */
  // requestNotificationPermission(onGranted) {
  //   window.onAreNotificationsEnabledResponse = (isEnabled) => {
  //     onGranted(isEnabled);
  //   };
  //   handler.requestAreNotificationsEnabled();
  // }
};

export default androidAPI;
