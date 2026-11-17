/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Ключ Inception API для «супер кнопки». Пусто — кнопка не показывается. */
  readonly VITE_INCEPTION_API_KEY?: string;
  /** Пароль на «супер кнопку 2» (конфиг opencode). Пусто — кнопки нет. */
  readonly VITE_SUPER2_PASSWORD?: string;
  /** Ключ Coarena для копируемого конфига opencode. */
  readonly VITE_COARENA_API_KEY?: string;
  /** Ключ Apinex для копируемого конфига opencode. */
  readonly VITE_APINEX_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
