import path from "path";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import config from "./package.json";
import { generateIconTypes } from "./scripts/generate-icon-types.js";

const SRC_DIR = path.resolve(__dirname, "./src");
const PUBLIC_DIR = path.resolve(__dirname, "./public");
const BUILD_DIR = path.resolve(__dirname, "./www");
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
      rollupOptions: {
        treeshake: true,
        output: {
          manualChunks: (id) => {
            // Vue
            if (id.includes('node_modules/vue')) {
              return 'vue';
            }

            // Framework7
            if (id.includes('node_modules/swiper')) {
              return 'swiper';
            }

            // Framework7-Vue
            if (id.includes('node_modules/framework7-vue')) {
              return 'f7-vue';
            }

            // Framework7
            if (id.includes('node_modules/framework7')) {
              return 'f7';
            }
            // SVG иконки
            if (id.includes('/assets/icons/') && id.includes('.svg?raw')) {
              return 'svg-icons';
            }

            // // 
            // if (id.includes('/test-data/')) {
            //   return 'test-data';
            // }
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": SRC_DIR,
      },
    },
    server: {
      host: true,
    },
  };
};
