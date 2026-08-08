/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_APP_VER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
