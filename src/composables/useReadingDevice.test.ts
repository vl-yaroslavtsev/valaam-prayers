import { createApp, defineComponent, nextTick, ref, type Ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSettingsStore } from "@/stores/settings";
import { useComponentsStore } from "@/stores/components";
import { useReadingDevice } from "@/composables/useReadingDevice";

const isDarkModeRef = ref(false);
let volumeHandler: ((keyCode: number) => void) | null = null;

const deviceMock = vi.hoisted(() => ({
  KEYCODE_VOLUME_UP: 24,
  KEYCODE_VOLUME_DOWN: 25,
  setBrightness: vi.fn(),
  resetBrightness: vi.fn(),
  keepScreenOn: vi.fn(),
  showStatusBar: vi.fn(),
  setFullScreen: vi.fn(),
  setStatusBarTextColor: vi.fn(),
  onVolumeKey: vi.fn((cb: (keyCode: number) => void) => {
    volumeHandler = cb;
  }),
  offVolumeKey: vi.fn(() => {
    volumeHandler = null;
  }),
}));

const screenTimeoutMock = vi.hoisted(() => ({
  startReadingScreenTimeout: vi.fn(),
  stopReadingScreenTimeout: vi.fn(),
  noteReadingInteraction: vi.fn(),
}));

vi.mock("@/js/device", () => ({
  device: deviceMock,
}));

vi.mock("@/js/device/readingScreenTimeout", () => screenTimeoutMock);

vi.mock("@/composables/useTheme", () => ({
  useTheme: () => ({
    isDarkMode: isDarkModeRef,
  }),
}));

const mountReadingDevice = (
  pinia: ReturnType<typeof createPinia>,
  opts?: {
    isNavbarHidden?: Ref<boolean>;
    isPageNavHidden?: Ref<boolean>;
    isSliderScrubbing?: Ref<boolean>;
    onVolumePrev?: () => void;
    onVolumeNext?: () => void;
  }
) => {
  const isNavbarHidden = opts?.isNavbarHidden ?? ref(true);
  const isPageNavHidden = opts?.isPageNavHidden ?? ref(true);
  const isSliderScrubbing = opts?.isSliderScrubbing ?? ref(false);
  const onVolumePrev = opts?.onVolumePrev ?? vi.fn();
  const onVolumeNext = opts?.onVolumeNext ?? vi.fn();

  let api!: ReturnType<typeof useReadingDevice>;
  const host = document.createElement("div");
  const app = createApp(
    defineComponent({
      setup() {
        api = useReadingDevice({
          isNavbarHidden,
          isPageNavHidden,
          isSliderScrubbing,
          onVolumePrev,
          onVolumeNext,
        });
        return () => null;
      },
    })
  );
  app.use(pinia);
  app.mount(host);
  return { app, api, isNavbarHidden, isPageNavHidden, isSliderScrubbing, onVolumePrev, onVolumeNext };
};

describe("useReadingDevice", () => {
  beforeEach(() => {
    localStorage.clear();
    isDarkModeRef.value = false;
    volumeHandler = null;
    deviceMock.setBrightness.mockReset();
    deviceMock.resetBrightness.mockReset();
    deviceMock.keepScreenOn.mockReset();
    deviceMock.showStatusBar.mockReset();
    deviceMock.setFullScreen.mockReset();
    deviceMock.setStatusBarTextColor.mockReset();
    deviceMock.onVolumeKey.mockClear();
    deviceMock.offVolumeKey.mockClear();
    screenTimeoutMock.startReadingScreenTimeout.mockReset();
    screenTimeoutMock.stopReadingScreenTimeout.mockReset();
    screenTimeoutMock.noteReadingInteraction.mockReset();
  });

  it("enter применяет яркость, keepScreenOn, кнопки громкости, системные панели и скрывает bottomTabBar, а leave всё откатывает", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const settingsStore = useSettingsStore();
    settingsStore.setReadingBrightness(0.6);
    settingsStore.setKeepScreenOn(true);
    settingsStore.setIsVolumeButtonsScrollEnabled(true);
    settingsStore.setReadingSystemBars("fullscreen");
    settingsStore.setTextTheme("dark");

    const tabBar = { hide: vi.fn(), show: vi.fn() };
    const componentsStore = useComponentsStore();
    componentsStore.registerComponent(
      "bottomTabBar",
      tabBar as unknown as Parameters<typeof componentsStore.registerComponent<"bottomTabBar">>[1]
    );

    const h = mountReadingDevice(pinia);
    h.api.enter();

    expect(tabBar.hide).toHaveBeenCalledWith(true);
    expect(deviceMock.setBrightness).toHaveBeenCalledWith(0.6);
    expect(screenTimeoutMock.startReadingScreenTimeout).toHaveBeenCalledTimes(1);
    expect(deviceMock.onVolumeKey).toHaveBeenCalledTimes(1);
    expect(deviceMock.showStatusBar).toHaveBeenLastCalledWith(false);
    expect(deviceMock.setFullScreen).toHaveBeenLastCalledWith(true);
    expect(deviceMock.setStatusBarTextColor).toHaveBeenLastCalledWith("light");

    // Открытие панелей чтения возвращает системные панели
    h.isNavbarHidden.value = false;
    h.isPageNavHidden.value = false;
    await nextTick();
    expect(deviceMock.setFullScreen).toHaveBeenLastCalledWith(false);
    expect(deviceMock.showStatusBar).toHaveBeenLastCalledWith(true);
    expect(deviceMock.setStatusBarTextColor).toHaveBeenLastCalledWith("dark");

    // Скраббинг снова скрывает статус-бар
    settingsStore.setReadingSystemBars("hide-status-bar");
    h.isNavbarHidden.value = true;
    h.isSliderScrubbing.value = true;
    await nextTick();
    expect(deviceMock.showStatusBar).toHaveBeenLastCalledWith(false);

    // Кнопки громкости
    volumeHandler?.(deviceMock.KEYCODE_VOLUME_UP);
    volumeHandler?.(deviceMock.KEYCODE_VOLUME_DOWN);
    expect(screenTimeoutMock.noteReadingInteraction).toHaveBeenCalledTimes(2);
    expect(h.onVolumePrev).toHaveBeenCalledTimes(1);
    expect(h.onVolumeNext).toHaveBeenCalledTimes(1);

    // Отключение громкости при повторном enter снимает обработчик
    settingsStore.setIsVolumeButtonsScrollEnabled(false);
    h.api.enter();
    expect(deviceMock.offVolumeKey).toHaveBeenCalledTimes(1);

    // Выход со страницы откатывает всё
    isDarkModeRef.value = true;
    h.api.leave();
    expect(tabBar.show).toHaveBeenCalledWith(true);
    expect(deviceMock.resetBrightness).toHaveBeenCalledTimes(1);
    expect(deviceMock.setFullScreen).toHaveBeenLastCalledWith(false);
    expect(deviceMock.showStatusBar).toHaveBeenLastCalledWith(true);
    expect(deviceMock.setStatusBarTextColor).toHaveBeenLastCalledWith("light");
    expect(screenTimeoutMock.stopReadingScreenTimeout).toHaveBeenCalledTimes(1);

    h.app.unmount();
  });

  it("не дублирует нативные вызовы системных панелей, если итог не изменился", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const settingsStore = useSettingsStore();
    settingsStore.setReadingSystemBars("normal");
    settingsStore.setTextTheme("light");

    const h = mountReadingDevice(pinia);
    h.api.enter();

    expect(deviceMock.showStatusBar).toHaveBeenCalledTimes(1);
    expect(deviceMock.setFullScreen).toHaveBeenCalledTimes(1);
    expect(deviceMock.setStatusBarTextColor).toHaveBeenCalledTimes(1);

    h.isNavbarHidden.value = false;
    await nextTick();
    settingsStore.setTextTheme("sepia");
    await nextTick();

    expect(deviceMock.showStatusBar).toHaveBeenCalledTimes(1);
    expect(deviceMock.setFullScreen).toHaveBeenCalledTimes(1);
    expect(deviceMock.setStatusBarTextColor).toHaveBeenCalledTimes(1);

    h.app.unmount();
  });

  it("при размонтировании полностью откатывает состояние только если leave ещё не вызывался", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const settingsStore = useSettingsStore();
    settingsStore.setKeepScreenOn(true);
    settingsStore.setIsVolumeButtonsScrollEnabled(true);
    settingsStore.setReadingSystemBars("fullscreen");

    const tabBar = { hide: vi.fn(), show: vi.fn() };
    const componentsStore = useComponentsStore();
    componentsStore.registerComponent(
      "bottomTabBar",
      tabBar as unknown as Parameters<typeof componentsStore.registerComponent<"bottomTabBar">>[1]
    );

    const h1 = mountReadingDevice(pinia);
    h1.api.enter();
    h1.app.unmount();

    expect(tabBar.show).toHaveBeenCalledWith(true);
    expect(deviceMock.resetBrightness).toHaveBeenCalledTimes(1);
    expect(deviceMock.setFullScreen).toHaveBeenLastCalledWith(false);
    expect(deviceMock.showStatusBar).toHaveBeenLastCalledWith(true);
    expect(screenTimeoutMock.stopReadingScreenTimeout).toHaveBeenCalledTimes(1);
    expect(deviceMock.offVolumeKey).toHaveBeenCalledTimes(1);

    // После явного leave повторный unmount ничего не трогает
    const h2 = mountReadingDevice(pinia);
    h2.api.enter();
    h2.api.leave();
    tabBar.show.mockReset();
    deviceMock.resetBrightness.mockReset();
    deviceMock.setFullScreen.mockReset();
    deviceMock.showStatusBar.mockReset();
    deviceMock.offVolumeKey.mockReset();
    screenTimeoutMock.stopReadingScreenTimeout.mockReset();

    h2.app.unmount();
    expect(tabBar.show).not.toHaveBeenCalled();
    expect(deviceMock.resetBrightness).not.toHaveBeenCalled();
    expect(deviceMock.setFullScreen).not.toHaveBeenCalled();
    expect(deviceMock.offVolumeKey).not.toHaveBeenCalled();
    expect(screenTimeoutMock.stopReadingScreenTimeout).not.toHaveBeenCalled();
  });
});
