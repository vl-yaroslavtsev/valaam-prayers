import { ref, watch, onUnmounted, type Ref } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useComponentsStore } from "@/stores/components";
import { useSettingsStore } from "@/stores/settings";
import { device } from "@/js/device";
import {
  noteReadingInteraction,
  startReadingScreenTimeout,
  stopReadingScreenTimeout,
} from "@/js/device/readingScreenTimeout";

export interface UseReadingDeviceOptions {
  isNavbarHidden: Readonly<Ref<boolean>>;
  isPageNavHidden: Readonly<Ref<boolean>>;
  isSliderScrubbing: Readonly<Ref<boolean>>;
  onVolumePrev: () => void;
  onVolumeNext: () => void;
}

interface SystemBarsSnapshot {
  fullScreen: boolean;
  statusBarVisible: boolean;
  textColor: "light" | "dark";
}

/**
 * Композабл нативного окружения страницы чтения:
 * нижняя панель приложения, яркость, удержание экрана, кнопки громкости
 * и синхронизация системных панелей устройства (status bar / fullscreen).
 */
export function useReadingDevice({
  isNavbarHidden,
  isPageNavHidden,
  isSliderScrubbing,
  onVolumePrev,
  onVolumeNext,
}: UseReadingDeviceOptions) {
  const { isDarkMode } = useTheme();
  const settingsStore = useSettingsStore();
  const { getComponent } = useComponentsStore();

  const isActive = ref(false);
  let screenTimeoutActive = false;
  let volumeKeyAttached = false;
  let lastBarsSnapshot: SystemBarsSnapshot | null = null;

  const releaseScreenTimeout = (): boolean => {
    if (!screenTimeoutActive) return false;
    screenTimeoutActive = false;
    stopReadingScreenTimeout();
    return true;
  };

  const detachVolumeKey = () => {
    if (!volumeKeyAttached) return;
    volumeKeyAttached = false;
    device.offVolumeKey();
  };

  const syncSystemBars = () => {
    const navbarVisible = !isNavbarHidden.value;
    const pageNavVisible = !isPageNavHidden.value;
    const barsMode = settingsStore.readingSystemBars;
    const hidesSystemBars = barsMode !== "normal";
    const scrubHidesSystemBars = isSliderScrubbing.value && hidesSystemBars;
    const chromeVisible = navbarVisible || (pageNavVisible && !scrubHidesSystemBars);
    const keepSystemBars = !hidesSystemBars || chromeVisible;

    const next: SystemBarsSnapshot = {
      fullScreen: !keepSystemBars && barsMode === "fullscreen",
      statusBarVisible: keepSystemBars,
      textColor: chromeVisible
        ? (isDarkMode.value ? "light" : "dark")
        : (settingsStore.textTheme === "dark" ? "light" : "dark"),
    };

    const prev = lastBarsSnapshot;
    if (
      prev &&
      prev.fullScreen === next.fullScreen &&
      prev.statusBarVisible === next.statusBarVisible &&
      prev.textColor === next.textColor
    ) {
      return;
    }

    if (
      !prev ||
      prev.fullScreen !== next.fullScreen ||
      prev.statusBarVisible !== next.statusBarVisible
    ) {
      if (next.fullScreen) {
        device.showStatusBar(false);
        device.setFullScreen(true);
      } else {
        device.setFullScreen(false);
        device.showStatusBar(next.statusBarVisible);
      }
    }

    if (!prev || prev.textColor !== next.textColor) {
      device.setStatusBarTextColor(next.textColor);
    }

    lastBarsSnapshot = next;
  };

  const enter = () => {
    isActive.value = true;
    getComponent("bottomTabBar")?.hide(true);

    if (settingsStore.readingBrightness !== -1) {
      device.setBrightness(settingsStore.readingBrightness);
    }

    lastBarsSnapshot = null;
    syncSystemBars();

    if (settingsStore.keepScreenOn) {
      if (!screenTimeoutActive) {
        startReadingScreenTimeout();
        screenTimeoutActive = true;
      }
    } else if (!releaseScreenTimeout()) {
      device.keepScreenOn(false);
    }

    if (settingsStore.isVolumeButtonsScrollEnabled) {
      volumeKeyAttached = true;
      device.onVolumeKey((keyCode) => {
        noteReadingInteraction();
        if (keyCode === device.KEYCODE_VOLUME_UP) {
          onVolumePrev();
        } else if (keyCode === device.KEYCODE_VOLUME_DOWN) {
          onVolumeNext();
        }
      });
    } else {
      detachVolumeKey();
    }
  };

  const leave = () => {
    if (!isActive.value) return;
    isActive.value = false;
    lastBarsSnapshot = null;

    getComponent("bottomTabBar")?.show(true);
    device.resetBrightness();
    device.setFullScreen(false);
    device.showStatusBar(true);
    device.setStatusBarTextColor(isDarkMode.value ? "light" : "dark");
    releaseScreenTimeout();
    detachVolumeKey();
  };

  watch(
    [
      isNavbarHidden,
      isPageNavHidden,
      isSliderScrubbing,
      () => settingsStore.readingSystemBars,
      () => settingsStore.textTheme,
      isDarkMode,
    ],
    () => {
      if (!isActive.value) return;
      syncSystemBars();
    }
  );

  onUnmounted(leave);

  return {
    enter,
    leave,
  };
}
