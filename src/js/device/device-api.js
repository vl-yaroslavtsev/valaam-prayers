import androidAPI from "./android-api";
import iosAPI from "./ios-api";
let deviceAPI;
const browserAPI = {
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
  async addNotification(notification) {
    return false;
  },
};
const isAndroid = "androidJsHandler" in window;
const isIOS = window.webkit && "messageHandlers" in window.webkit;
if (isAndroid) {
  deviceAPI = androidAPI;
} else if (isIOS) {
  deviceAPI = iosAPI;
} else {
  deviceAPI = browserAPI;
}
export default deviceAPI;
