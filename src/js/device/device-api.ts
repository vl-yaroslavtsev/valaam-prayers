import androidAPI from "./android-api";
import iosAPI from "./ios-api";

interface Notification {
  title: string;
  body: string;
  // Добавьте другие необходимые поля для уведомлений
}

interface DeviceAPI {
  KEYCODE_VOLUME_DOWN: number;
  KEYCODE_VOLUME_UP: number;

  setBrightness(value: number): void;
  getBrightness(): Promise<number>;
  resetBrightness(): void;

  getTheme(): Promise<string>;

  showStatusBar(visibility: boolean): void;

  setFullScreen(mode: boolean): void;
  keepScreenOn(mode: boolean): void;
  setStatusBarColor(color: string): void;

  onBackKey(handler: () => void): void;

  onVolumeKey(handler: (keyCode: number) => void): void;
  offVolumeKey(): void;

  addNotification(notification: Notification): Promise<void>;
  // requestNotificationPermission(onGranted: () => void): void;
}

const deviceAPI: DeviceAPI = {
  KEYCODE_VOLUME_DOWN: 0,
  KEYCODE_VOLUME_UP: 0,

  setBrightness(value: number) {},
  async getBrightness() {
    return 50;
  },
  resetBrightness() {},

  async getTheme() {
    return 'unknown';
  },

  showStatusBar(visibility: boolean) {},

  setFullScreen(mode: boolean) {},
  keepScreenOn(mode: boolean) {},
  setStatusBarColor(color: string) {},

  onBackKey(handler: () => void) {},

  onVolumeKey(handler: (keyCode: number) => void) {},
  offVolumeKey() {},

  async addNotification(notification: Notification) {},
  // requestNotificationPermission(onGranted: () => void) {}
};

Object.seal(deviceAPI);

declare global {
  interface Window {
    androidJsHandler?: unknown;
    webkit?: {
      messageHandlers: unknown;
    };
  }
}

const isAndroid = 'androidJsHandler' in window;
const isIOS = window.webkit && 'messageHandlers' in window.webkit;

if (isAndroid) {
  Object.assign(deviceAPI, androidAPI); 
} else if (isIOS) {
  Object.assign(deviceAPI, iosAPI);
}

export default deviceAPI; 