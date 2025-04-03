import androidAPI from "./android-api";
import iosAPI from "./ios-api";
import type { CalendarEvent, CalendarEventResponse, DeviceAPI } from "./types";

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
    return "light";
  },

  showStatusBar(visibility: boolean) {},

  setFullScreen(mode: boolean) {},
  keepScreenOn(mode: boolean) {},
  setStatusBarColor(color: string) {},

  onBackKey(handler: () => boolean) {},

  onVolumeKey(handler: (keyCode: number, event: any) => void) {},
  offVolumeKey() {},

  async addCalendarEvent(event: CalendarEvent | CalendarEvent[]): Promise<CalendarEventResponse> {
    return { isSuccess: false, error: "", id: "", hasPermissions: false};
  },

  async deleteCalendarEvent(id: string | string[]): Promise<CalendarEventResponse> {
    return { isSuccess: false, error: "", id: "", hasPermissions: false};
  },

  async hasCalendarPermissions(): Promise<boolean> {
    return false;
  },

  async requestCalendarPermissions(): Promise<boolean> {
    return false;
  },

  setWebViewVisible(visible: boolean) {},
  
  setStatusBarTextColor(color: 'light' | 'dark') {},

  setNavigationBarColor(color: string) {},

  openNotificationsSettings() {},

  openCalendarSettings() {},

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
