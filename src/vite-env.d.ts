/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Ключ Inception API для «супер кнопки». Пусто — кнопка не показывается. */
  readonly VITE_INCEPTION_API_KEY?: string;
  /** Пароль на «супер кнопку 2» (конфиг opencode). Пусто — кнопки нет. */
  readonly VITE_SUPER2_PASSWORD?: string;
  /** Ключ Coarena для копируемого конфига opencode. */
  readonly VITE_COARENA_API_KEY?: string;
  /** Ключ MoonMath (zro.moonmath.ai) для копируемого конфига opencode. */
  readonly VITE_MOONMATH_API_KEY?: string;
  /** Ключ OrcaRouter для копируемого конфига opencode. */
  readonly VITE_ORCAROUTER_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
