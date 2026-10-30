import type { Device, ScreenRect } from "@/js/device/types";

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

  // В установленном PWA и во вкладке Chrome/Safari красит системный статус-бар.
  // Прозрачный цвет браузеры отбрасывают, поэтому сюда приходит непрозрачный hex.
  setStatusBarColor(color: string) {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  },
  onBackKey(handler: () => boolean) {},

  onVolumeKey(handler: (keyCode: number, event: any) => void) {},
  offVolumeKey() {},

  setWebViewVisible(visible: boolean) {},

  setStatusBarTextColor(color: "light" | "dark") {},

  setNavigationBarColor(color: string) {},

  openNotificationsSettings() {},

  setShouldHandleLongClick(shouldHandle: boolean) {},

  disableBackGestureInArea(rect: ScreenRect) {},
  enableBackGesture() {},
};

export default browser;
