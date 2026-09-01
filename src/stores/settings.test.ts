import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { SETTINGS_KEYS, useSettingsStore } from "@/stores/settings";

describe("useSettingsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("setSetting пишет в localStorage под правильным ключом, loadSettings подхватывает значение", async () => {
    const store = useSettingsStore();
    store.setSetting("language", "ru");

    expect(localStorage.getItem(SETTINGS_KEYS.LANGUAGE)).toBe(JSON.stringify("ru"));

    setActivePinia(createPinia());
    const reloaded = useSettingsStore();
    await reloaded.initStore();

    expect(reloaded.currentLanguage).toBe("ru");
  });

  it("setIsAutoUpdateOfflineDataEnabled пишет флаг в localStorage", () => {
    const store = useSettingsStore();
    store.setIsAutoUpdateOfflineDataEnabled(false);

    expect(localStorage.getItem(SETTINGS_KEYS.AUTO_UPDATE_OFFLINE_DATA)).toBe("false");
    expect(store.isAutoUpdateOfflineDataEnabled).toBe(false);
  });
});
