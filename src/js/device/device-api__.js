import androidAPI from "./android-api";
import iosAPI from "./ios-api";

const deviceAPI = {
  KEYCODE_VOLUME_DOWN: 0,
  KEYCODE_VOLUME_UP: 0,

  setBrightness(value) {},
  async getBrightness() {
    return 50;
  },
  resetBrightness() {},

  async getTheme() {
    return "unknown";
  },

  showStatusBar(visibility) {},

  setFullScreen(mode) {},
  keepScreenOn(mode) {},
  setStatusBarColor(color) {},

  onBackKey(handler) {},

  onVolumeKey(handler) {},
  offVolumeKey() {},

  async addNotification(notification) {},
  // requestNotificationPermission(onGranted){}
};

Object.seal(deviceAPI);

if ("androidJsHandler" in window) {
  Object.assign(deviceAPI, androidAPI);
} else if ("webkit" in window && "messageHandlers" in window.webkit) {
  Object.assign(deviceAPI, iosAPI);
}

export default deviceAPI;
