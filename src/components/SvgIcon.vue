<template>
  <div
    :class="['icon', `color-${color}`, borderColor ? `border-color-${borderColor}` : '']"
    :style="{ width: size + 'px', height: size + 'px' }"
    v-html="svgIcon"
  ></div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { IconName } from '@/types/icon-name';

type IconColor = 
  | "white"
  | "baige-5"
  | "baige-10"
  | "baige-30"
  | "baige-40"
  | "baige-60"
  | "baige-90"
  | "baige-100"
  | "black-primary"
  | "black-5"
  | "black-10"
  | "black-20"
  | "black-40"
  | "black-60"
  | "primary-accent-50";

type IconBorderColor = 
  | "black-primary"
  | "white"
  | "baige-30"
  | "black-20";

const {
  icon,
  size = 24,
  color = "white",
  borderColor,
} = defineProps<{
  icon: IconName;
  color?: IconColor;
  size?: number;
  borderColor?: IconBorderColor;
}>();

// Автоматически подхватывает все SVG из assets/icons, не требуя импорта и switch на каждую иконку.
const iconModules = import.meta.glob<string>("@/assets/icons/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});

const icons: Record<string, string> = {};
for (const path in iconModules) {
  const name = path.match(/([^/]+)\.svg$/)?.[1] ?? path;
  icons[name] = iconModules[path];
}

const svgIcon = computed(() => icons[icon] ?? "");
</script>
<style scoped lang="less">
.icon {
  display: flex;
  align-items: center;
  justify-content: center;

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}
</style>
