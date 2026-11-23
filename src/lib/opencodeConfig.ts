/**
 * Конфиг opencode для «супер кнопки 2»: провайдеры coarena, moonmath и
 * orcarouter с deepseek-моделями. Ключи берутся из env Vite
 * (`VITE_COARENA_API_KEY`, `VITE_MOONMATH_API_KEY`, `VITE_ORCAROUTER_API_KEY`)
 * и подставляются в конфиг; если ключа нет — остаётся ссылка `{env:…}`,
 * которую opencode раскрывает из своего окружения.
 */

const COARENA_KEY = import.meta.env.VITE_COARENA_API_KEY ?? "";
const MOONMATH_KEY = import.meta.env.VITE_MOONMATH_API_KEY ?? "";
const ORCAROUTER_KEY = import.meta.env.VITE_ORCAROUTER_API_KEY ?? "";

/** Пароль на кнопку. Пусто — кнопки нет. */
export const SUPER2_PASSWORD = import.meta.env.VITE_SUPER2_PASSWORD ?? "";
export const SUPER2_READY = SUPER2_PASSWORD.length > 0;

function key(value: string, envName: string): string {
  return value || `{env:${envName}}`;
}

/** Готовый `opencode.json` строкой — его и кладём в буфер. */
export function buildOpencodeConfig(): string {
  return JSON.stringify(
    {
      $schema: "https://opencode.ai/config.json",
      provider: {
        coarena: {
          npm: "@ai-sdk/openai-compatible",
          name: "Coarena",
          options: {
            baseURL: "https://coarena.ai/api/v1",
            apiKey: key(COARENA_KEY, "COARENA_API_KEY"),
          },
          models: {
            "deepseek-v4-1-flash-1017": {
              name: "дыпсик 4.1 флэш",
              reasoning: true,
              attachment: true,
              limit: { context: 128000, output: 16384 },
            },
          },
        },
        moonmath: {
          npm: "@ai-sdk/openai-compatible",
          name: "MoonMath",
          options: {
            baseURL: "https://zro.moonmath.ai/v1",
            apiKey: key(MOONMATH_KEY, "MOONMATH_API_KEY"),
          },
          models: {
            "deepseek-v4.1-flash": {
              name: "дыпсик 4.1 флэш",
              reasoning: true,
              limit: { context: 1048576, output: 64000 },
            },
          },
        },
        orcarouter: {
          npm: "@ai-sdk/openai-compatible",
          name: "OrcaRouter",
          options: {
            baseURL: "https://api.orcarouter.ai/v1",
            apiKey: key(ORCAROUTER_KEY, "ORCAROUTER_API_KEY"),
          },
          models: {
            "deepseek/deepseek-v4.1-flash-free": {
              name: "дыпсик 4.1 флэш",
              reasoning: true,
              limit: { context: 1048576, output: 384000 },
            },
            "tencent/hy4-preview-free": {
              name: "хуньюань 4 превью (free)",
              reasoning: true,
              limit: { context: 1048576, output: 64000 },
            },
          },
        },
      },
    },
    null,
    2,
  );
}
