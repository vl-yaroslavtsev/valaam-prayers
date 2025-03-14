import androidAPI from "./android-api";
import iosAPI from "./ios-api";
import type { Notification, DeviceAPI } from "./types";

let deviceAPI: DeviceAPI;

const browserAPI: DeviceAPI = {
  KEYCODE_VOLUME_DOWN: 0,
  KEYCODE_VOLUME_UP: 0,

  setBrightness(value: number) {},
  async getBrightness() {
    return 50;
  },
  resetBrightness() {},

  async getTheme() {
    return "unknown";
  },

  showStatusBar(visibility: boolean) {},

  setFullScreen(mode: boolean) {},
  keepScreenOn(mode: boolean) {},
  setStatusBarColor(color: string) {},

  onBackKey(handler: () => boolean) {},

  onVolumeKey(handler: (keyCode: number, event: any) => void) {},
  offVolumeKey() {},

  async addNotification(notification: Partial<Notification>): Promise<boolean> {
    return false;
  },

  deleteNotification(id: string): void {},

  async isNotificationsEnabled(): Promise<boolean> {
    return false;
  },

  setWebViewVisible(visible: boolean) {},
  
  setStatusBarTextColor(color: 'light' | 'dark') {},

  setNavigationBarColor(color: string) {},

  getNotificationStatus(id: string): Promise<string> {
    return Promise.resolve("UNKNOWN");
  },

  openNotificationsSettings() {},

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
