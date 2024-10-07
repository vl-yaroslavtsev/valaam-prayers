import androidAPI from "./android-api";
import iosAPI from "./ios-api";

const deviceAPI = {
  KEYCODE_VOLUME_DOWN: 0,
  KEYCODE_VOLUME_UP: 0,

  setBrightness(value) {},
  getBrightness() {
    return 50;
  },
  resetBrightness(){},

  getTheme() {
    return 'unknown';
  },

  showStatusBar(visibility){},

  setFullScreen(mode){},
  keepScreenOn(mode){},
  setStatusBarColor(color){},

  onBackKey(handler){},

  onVolumeKey(handler) {},
  offVolumeKey(){}
};

Object.seal(deviceAPI);
Object.assign(deviceAPI, androidAPI);
Object.assign(deviceAPI, iosAPI);

export default deviceAPI;