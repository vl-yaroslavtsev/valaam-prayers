import path from "path";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import config from "./package.json" with { type: "json" };
import { generateIconTypes } from "./scripts/generate-icon-types.js";

const SRC_DIR = path.resolve(import.meta.dirname, "./src");
const PUBLIC_DIR = path.resolve(import.meta.dirname, "./public");
const BUILD_DIR = path.resolve(import.meta.dirname, "./www");
const ICONS_DIR = path.resolve(SRC_DIR, "assets/icons");

// Перегенерирует src/types/icon-name.d.ts из файлов src/assets/icons,
// чтобы тип IconName не приходилось прописывать вручную.
function svgIconTypesPlugin() {
  return {
    name: "svg-icon-types",
    buildStart() {
      generateIconTypes();
    },
    configureServer(server) {
      generateIconTypes();
      server.watcher.on("add", (file) => {
        if (file.startsWith(ICONS_DIR) && file.endsWith(".svg")) generateIconTypes();
      });
      server.watcher.on("unlink", (file) => {
        if (file.startsWith(ICONS_DIR) && file.endsWith(".svg")) generateIconTypes();
      });
    },
  };
}

process.env.VITE_APP_VER = config.version;

export default async () => {
  return {
    css: {
      preprocessorOptions: {
        less: {
          math: "parens-division",
        },
      },
    },
    plugins: [
      svgIconTypesPlugin(),
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.includes("swiper-"),
          },
        },
      }),
      VitePWA({
        injectRegister: "auto",
        registerType: "prompt",
        strategies: "injectManifest",
        srcDir: "",
        filename: "service-worker.js",
        manifest: false,
        devOptions: {
          enabled: true,
          type: "module",
        },
        injectManifest: {
          globPatterns: [
            "**/*.{woff,woff2,js,css,png,jpg,svg,html}",
            "**/manifest*.json",
          ],
        },
      }),
    ],
    root: SRC_DIR,
    base: "",
    publicDir: PUBLIC_DIR,
    build: {
      outDir: BUILD_DIR,
      assetsInlineLimit: 0,
      emptyOutDir: true,
      sourcemap: true,
      rolldownOptions: {
        treeshake: true,
        output: {
          codeSplitting: {
            groups: [
              {
                name: "f7-vue",
                test: /node_modules[\\/]framework7-vue(?:[\\/]|$)/,
                priority: 20,
              },
              {
                name: "swiper",
                test: /node_modules[\\/]swiper(?:[\\/]|$)/,
                priority: 10,
              },
              {
                name: "f7",
                test: /node_modules[\\/]framework7(?:[\\/]|$)/,
                priority: 5,
              },
              {
                name: "svg-icons",
                test: (id) =>
                  id.includes("/assets/icons/") && id.includes(".svg?raw"),
                priority: 10,
              },
            ],
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": SRC_DIR,
      },
    },
    // framework7/types указывает на .d.ts без runtime-экспортов;
    // Vite 8/Rolldown падает на нём при prebundle, если импорт не type-only.
    optimizeDeps: {
      exclude: ["framework7/types"],
    },
    server: {
      host: true,
    },
  };
};
