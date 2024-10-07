
import path from 'path';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import config from './package.json';


const SRC_DIR = path.resolve(__dirname, './src');
const PUBLIC_DIR = path.resolve(__dirname, './public');
const BUILD_DIR = path.resolve(__dirname, './www',);

process.env.VITE_APP_VER = config.version;

export default async () => {
  return  {
    css: {
      preprocessorOptions: {
        less: {
          math: 'parens-division',
        }
      }
    },
    plugins: [
      vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.includes('swiper-') } } }),
      VitePWA({ 
        injectRegister: 'auto',
        registerType: 'prompt',
        strategies: 'injectManifest',
        srcDir: '',
        filename: 'service-worker.js',
        manifest: false,
        devOptions: {
          enabled: true,
          type: 'module',
        },
        injectManifest: {
          globPatterns: ['**/*.{woff,woff2,js,css,png,jpg,svg,html}', '**/manifest*.json']
        }
      }),
    ],
    root: SRC_DIR,
    base: '',
    publicDir: PUBLIC_DIR,
    build: {
      outDir: BUILD_DIR,
      assetsInlineLimit: 0,
      emptyOutDir: true,
      rollupOptions: {
        treeshake: true,
        output:{
          manualChunks: {
            vue: ['vue'],
            f7: ['framework7', 'framework7-vue'],
          }
        }
      },
    },
    resolve: {
      alias: {
        '@': SRC_DIR,
      },
    },
    server: {
      host: true,
    },
  };
}