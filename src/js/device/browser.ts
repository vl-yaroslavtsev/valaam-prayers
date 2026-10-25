import type { CalendarEvent, CalendarEventResponse, Device, ScreenRect } from "@/js/device/types";

const browser: Device = {
  KEYCODE_VOLUME_DOWN: 0,
  KEYCODE_VOLUME_UP: 0,

  init() {
    // Ссылку не кладём в index.html: тот же файл открывается в WebView Android и iOS.
    // В браузере манифест даёт установку на главный экран и картинку сплэша из public/icons.
    if (document.querySelector('link[rel="manifest"]')) return;

    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "./manifest.json";
    document.head.appendChild(link);
  },

  setBrightness(value: number) {},
  async getBrightness() {
    return 50;
  },
  resetBrightness() {},

  async getTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  },

  showStatusBar(visibility: boolean) {},

  setFullScreen(mode: boolean) {},
  keepScreenOn(mode: boolean) {},
  setStatusBarColor(color: string) {},
  onBackKey(handler: () => boolean) {},

  onVolumeKey(handler: (keyCode: number, event: any) => void) {},
  offVolumeKey() {},

  async addCalendarEvent(
    event: CalendarEvent | CalendarEvent[]
  ): Promise<CalendarEventResponse> {
    return {
      isSuccess: false,
      errorDescription: "",
      id: "",
      hasPermissions: false,
    };
  },

  async deleteCalendarEvent(
    id: string | string[]
  ): Promise<CalendarEventResponse> {
    return {
      isSuccess: false,
      errorDescription: "",
      id: "",
      hasPermissions: false,
    };
  },

  async hasCalendarPermissions(): Promise<boolean> {
    return false;
  },

  async requestCalendarPermissions(): Promise<boolean> {
    return false;
  },

  setWebViewVisible(visible: boolean) {},

  setStatusBarTextColor(color: "light" | "dark") {},

  setNavigationBarColor(color: string) {},

  openNotificationsSettings() {},

  openCalendarSettings() {},

  setShouldHandleLongClick(shouldHandle: boolean) {},

  disableBackGestureInArea(rect: ScreenRect) {},
  enableBackGesture() {},
};

export default browser;
