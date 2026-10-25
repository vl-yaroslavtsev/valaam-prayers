import path from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// Тот же алиас, что в vite.config.js (`resolve.alias["@"] -> src`)
const SRC_DIR = path.resolve(import.meta.dirname, "./src");

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.includes("swiper-"),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": SRC_DIR,
    },
  },
  test: {
    environment: "jsdom",
    // Иначе стили Vue и Less подменяются пустой строкой и каскад шрифта не проверить
    css: true,
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
    },
  },
});
