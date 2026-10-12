/**
 * Быстрый решатель задач через Inception API (Mercury 2.5).
 *
 * Это не Moodle: сторонний OpenAI-совместимый сервис, который отвечает
 * по тексту материала курса. Ключ берётся из env Vite (`VITE_INCEPTION_API_KEY`)
 * и вшивается в бандл на сборке — своего бэкенда у приложения нет, поэтому
 * скрыть его от пользователя браузера невозможно. Кнопка дополнительно
 * ограничена логином (см. `SOLVER_LOGIN`).
 */

const INCEPTION_ENDPOINT = "https://api.inceptionlabs.ai/v1/chat/completions";
const INCEPTION_MODEL = "mercury-2.5";

export const SOLVER_KEY = import.meta.env.VITE_INCEPTION_API_KEY ?? "";
/** Кому вообще показывать кнопку. */
export const SOLVER_LOGIN = "rborisov";
export const SOLVER_READY = SOLVER_KEY.length > 0;

export const SOLVER_SYSTEM_PROMPT = `Ты — быстрый решатель учебных задач с курса по C++.
Пользователь присылает текст учебного материала (лекция, задание, условие задачи).
Разберись в задаче и выдай аккуратный, компилируемый код на C++, который её решает.

Требования к коду:
- один полный файл, готовый к компиляции: g++ main.cpp -std=c++17 -O2 -Wall;
- только необходимые #include; <bits/stdc++.h> не использовать;
- ввод/вывод через std::cin/std::cout;
- отступ 4 пробела, понятные имена, никаких опечаток и неопределённого поведения;
- крайние случаи: пустой ввод, большие числа (long long), переполнение, деление на ноль;
- компилируй код мысленно перед ответом.

Формат ответа: 1–3 предложения о плане решения, затем один блок \`\`\`cpp с кодом.
Если материал не про C++ или не содержит задачи — коротко скажи это и предложи, что можно сделать.
Отвечай по-русски, без воды.`;

const NETWORK_HINT =
  "Запрос к api.inceptionlabs.ai не прошёл — его блокирует сеть: блокировщик " +
  "рекламы или трекеров, VPN/прокси, либо домен недоступен.";

/** Собирает понятное человеку сообщение об ошибке API. */
function solverError(status: number, body: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    detail = parsed.error?.message ?? "";
  } catch {
    detail = body.slice(0, 200);
  }
  const byStatus: Record<number, string> = {
    400: "Модель не приняла запрос.",
    401: "Ключ API недействителен.",
    402: "Счёт Inception неактивен — кончилась квота.",
    404: "Модель недоступна для этого аккаунта.",
    429: "Слишком много запросов, попробуйте через минуту.",
    500: "Сервер Inception ошибся.",
  };
  const head = byStatus[status] ?? `Сервис ответил ошибкой ${status}.`;
  return detail ? `${head} ${detail}` : head;
}

export interface SolverInput {
  title: string;
  material: string;
}

/** fetch с одним уточнением: «Failed to fetch» превращаем в понятную причину. */
async function postSolver(body: unknown, signal?: AbortSignal): Promise<Response> {
  try {
    return await fetch(INCEPTION_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SOLVER_KEY}`,
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new Error(NETWORK_HINT);
  }
}

/**
 * Отправляет материал в Mercury 2.5 и стримит ответ.
 * `reasoning_effort: "low"` — модель немного подумает, но ответит быстро.
 */
export async function askSolver(
  input: SolverInput,
  onChunk?: (answer: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!SOLVER_READY) throw new Error("Ключ Inception не задан (VITE_INCEPTION_API_KEY).");

  const res = await postSolver(
    {
      model: INCEPTION_MODEL,
      messages: [
        { role: "system", content: SOLVER_SYSTEM_PROMPT },
        { role: "user", content: `Материал: «${input.title}»\n\n${input.material}` },
      ],
      reasoning_effort: "low",
      max_completion_tokens: 8192,
      temperature: 0.75,
      stream: true,
    },
    signal,
  );

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(solverError(res.status, text));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload) as {
            choices?: { delta?: { content?: string | null } }[];
          };
          const piece = chunk.choices?.[0]?.delta?.content;
          if (piece) {
            answer += piece;
            onChunk?.(answer);
          }
        } catch {
          /* неполный кусок SSE — пропускаем */
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new Error(NETWORK_HINT);
  }

  return answer;
}
