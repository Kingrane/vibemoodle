/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Ключ Inception API для «супер кнопки». Пусто — кнопка не показывается. */
  readonly VITE_INCEPTION_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
