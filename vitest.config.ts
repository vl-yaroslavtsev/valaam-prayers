import path from "node:path";
import { defineConfig } from "vitest/config";

// Тот же алиас, что в vite.config.js (`resolve.alias["@"] -> src`)
const SRC_DIR = path.resolve(import.meta.dirname, "./src");

export default defineConfig({
  resolve: {
    alias: {
      "@": SRC_DIR,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
    },
  },
});
