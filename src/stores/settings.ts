import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";

export const useSettingsStore = defineStore("settings", () => {
  const version = import.meta.env.VITE_APP_VER;

  const initStore = async () => {
    console.log("Settings store initialized");
  }

  return {
    version,
    initStore,
  };
});