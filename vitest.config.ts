import path from "node:path";
import vue from "@vitejs/plugin-vue";
import { configDefaults, defineConfig } from "vitest/config";

// Тот же алиас, что в vite.config.js (`resolve.alias["@"] -> src`)
const SRC_DIR = path.resolve(import.meta.dirname, "./src");

// Даты записок считаются по Москве, чьё бы ни было время на устройстве: сервер принимает именно московскую дату.
// Тесты, где это важно, дополнительно гоняются в разных часовых поясах, включая крайние (-11 и +14 часов).
const TIMEZONE_SENSITIVE_TESTS = [
  "src/services/rites/ritesDates.test.ts",
  "src/services/rites/ritesFormat.test.ts",
  "src/stores/ritesCart.test.ts",
];
const TIMEZONES = [
  "Europe/Moscow",
  "America/Los_Angeles",
  "Pacific/Auckland",
  "Pacific/Pago_Pago",
  "Pacific/Kiritimati",
];

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
    exclude: [...configDefaults.exclude, "archive/**"],
    environment: "jsdom",
    // Тесты, подтягивающие всё приложение (browser.manifest), под нагрузкой параллельных проектов не укладываются в 5 с
    testTimeout: 15000,
    // Иначе стили Vue и Less подменяются пустой строкой и каскад шрифта не проверить
    css: true,
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
    },
    projects: [
      { extends: true, test: { name: "default" } },
      ...TIMEZONES.map((timezone) => ({
        extends: true,
        test: {
          name: `tz ${timezone}`,
          include: TIMEZONE_SENSITIVE_TESTS,
          env: { TZ: timezone },
        },
      })),
    ],
  },
});

