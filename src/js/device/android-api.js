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
 * */

const androidAPI = {};

if ('androidJsHandler' in window) {
  const androidJsHandler = window.androidJsHandler;

  /**
   * Устанавливаем яркость от 0 до 100
   * @param {number} value
   */
  androidAPI.setBrightness = (value) => {
    const newValue = Math.round(value * 255 / 100);
    // 0 <= newBrighness <= 255;
    // set -1 to reset
    // alert("androidJsHandler.setBrightness(newValue) " + newValue + ", value = "+ value);
    androidJsHandler.setBrightness(newValue);
    // window.setBrightness(newValue);
    console.log("androidJsHandler.setBrightness(newValue);", newValue);
  };

  /**
   * Сбрасываем яркость до значения по умолчанию
   */
  androidAPI.resetBrightness = () => {
    // alert("androidJsHandler.setBrightness(-1) ");
    androidJsHandler.setBrightness(-1)
  };

  /**
   * Получаем яркость экрана от 0 до 100
   * @returns {number}
   */
  androidAPI.getBrightness = () => {
    const value = androidJsHandler.getCurrentBrightness();
    // alert("androidJsHandler.getCurrentBrightness() " + value);
    console.log("androidJsHandler.getCurrentBrightness()", value);
    return Math.round(value * 100 / 255);
  };

  /**
   * Theme (day/night/unknown)
   */
  androidAPI.getTheme = () => androidJsHandler.getTheme();

  /**
   * Show and hide status bars
   * @param {boolean} visibility 
   */
  androidAPI.showStatusBar = (visibility) => androidJsHandler.setStatusBarVisibility(visibility);

  /**
   * FullScreen mode
   * @param {boolean} mode 
   * @returns 
   */
  androidAPI.setFullScreen = (mode) => androidJsHandler.setFullScreen(mode);

  /**
   * Keep Screen On
   * @param {boolean} mode
   * @returns 
   */
  androidAPI.keepScreenOn = (mode) => androidJsHandler.setKeepScreenOn(mode);

  /**
   * StatusBarColor
   * @param {string} color Цвет в формате #00ff00
   * @returns 
   */
  androidAPI.setStatusBarColor = (color) => androidJsHandler.setStatusBarColor(color);

  /**
   * Handling Back button
   * Handler must return true, if action handled, false - otherwize
   * @param {() => boolean} handler 
   */
  androidAPI.onBackKey = (handler) => {
    window.onBackPressed = () => {
      console.log("window.onBackPressed call handler");    
      alert("window.onBackPressed call handler");
      handler();
    };
    androidJsHandler.onBackPressed =  () => {
      console.log("androidJsHandler.onBackPressed call handler");    
      alert("androidJsHandler.onBackPressed call handler");
      handler();
    };
    console.log("window.onBackPressed = handler;", handler);    
  };

  androidAPI.KEYCODE_VOLUME_UP = 24;
  androidAPI.KEYCODE_VOLUME_DOWN = 25;  

  /**
   * Подписываемся на обработку
   * клавиш звука KEYCODE_VOLUME_DOWN и KEYCODE_VOLUME_UP
   * handler в первом параметре получает код клавиши
   * @param {(keyCode, event) => {}} handler
   */
  androidAPI.onVolumeKey = (handler) => {
    if (!handler || typeof handler != 'function') {
      return;
    }
    
    androidJsHandler.subscribeKeyEvent(androidAPI.KEYCODE_VOLUME_UP, true);
    androidJsHandler.subscribeKeyEvent(androidAPI.KEYCODE_VOLUME_DOWN, true);

    window.onKeyDown = (keyCode, event) => {
      console.log("window.onKeyDown call handler", handler);    
      handler(keyCode, event);
    };
  };
  
  /**
   * Отписываемся от обработки
   * клавиш звука KEYCODE_VOLUME_DOWN и KEYCODE_VOLUME_UP
   */
  androidAPI.offVolumeKey = () => {
    androidJsHandler.subscribeKeyEvent(KEYCODE_VOLUME_UP, false);
    console.log("androidJsHandler.subscribeKeyEvent(KEYCODE_VOLUME_UP, false)");

    androidJsHandler.subscribeKeyEvent(KEYCODE_VOLUME_DOWN, false);
    console.log("androidJsHandler.subscribeKeyEvent(KEYCODE_VOLUME_DOWN, false);");

    window.onKeyDown = false;
    console.log(" window.onKeyDown = false;");    
  };
}

export default androidAPI;