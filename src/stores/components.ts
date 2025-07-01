import { defineStore } from "pinia";
import { computed, Ref, shallowRef } from "vue";
import SharePopover from "@/components/SharePopover.vue";
import BottomTabBar from "@/components/layout/BottomTabBar.vue";

interface Components {
  bottomTabBar: InstanceType<typeof BottomTabBar> | null;
  sharePopover: InstanceType<typeof SharePopover> | null;
}

export const useComponentsStore = defineStore("components", () => {
  const components: Components = {
    bottomTabBar: null,
    sharePopover: null,
  };

  // Actions
  const getComponent = <T extends keyof Components>(id: T) => components[id];

  const registerComponent = <T extends keyof Components>(
    id: T,
    component: Components[T]
  ) => (components[id] = component);

  return {
    // State
    components,

    // Actions
    registerComponent,
    getComponent,
  };
});
