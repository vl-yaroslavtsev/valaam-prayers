import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { Toolbar } from "framework7/framework7-types";

export interface Toolbar {
  hide: (animate?: boolean) => void;
  show: (animate?: boolean) => void;
}

interface Components {
  toolbar: Toolbar | null;
}

export const useComponentsStore = defineStore("components", () => {
  // State
  const components: Components = {
    toolbar: null,
  };

  // Getters
  const toolbar = computed(() => components.toolbar);

  // Getters
  // Actions
  const register = (
    id: keyof Components,
    component: Components[keyof Components]
  ) => (components[id] = component);

  return {
    // State
    components,

    // Getters
    toolbar,

    // Actions
    register,
  };
});
