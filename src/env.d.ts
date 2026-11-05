/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_APP_VER: string;
  VITE_PAYMENT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
