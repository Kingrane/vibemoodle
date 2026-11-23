/**
 * Конфиг opencode для «супер кнопки 2»: только провайдеры coarena и apinex
 * с deepseek-моделями. Ключи берутся из env Vite (`VITE_COARENA_API_KEY`,
 * `VITE_APINEX_API_KEY`) и подставляются в конфиг; если ключа нет — остаётся
 * ссылка `{env:…}`, которую opencode раскрывает из своего окружения.
 */

const COARENA_KEY = import.meta.env.VITE_COARENA_API_KEY ?? "";
const APINEX_KEY = import.meta.env.VITE_APINEX_API_KEY ?? "";

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
        apinex: {
          npm: "@ai-sdk/openai-compatible",
          name: "Apinex",
          options: {
            baseURL: "https://api.apinex.bond/v1",
            apiKey: key(APINEX_KEY, "APINEX_API_KEY"),
          },
          models: {
            "free/deepseek-v4.1-flash": {
              name: "дэпсик 4.1 флэш",
            },
          },
        },
      },
    },
    null,
    2,
  );
}
