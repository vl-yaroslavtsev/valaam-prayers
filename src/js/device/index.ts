import android from "./android";
import ios from "./ios";
import browser from "./browser";
import type { Device } from "@/js/device/types";

let device: Device;

const isAndroid = "androidJsHandler" in window;
const isIOS = window.webkit && "messageHandlers" in window.webkit;
const isBrowser = !isAndroid && !isIOS;

if (isAndroid) {
  device = android;
} else if (isIOS) {
  device = ios;
} else {
  device = browser;
}

device.init();

export { device, isAndroid, isIOS, isBrowser };
