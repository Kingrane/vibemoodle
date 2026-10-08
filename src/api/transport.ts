/**
 * Транспорт к Moodle Web Services.
 *
 * Важная деталь: у edu.mmcs.sfedu.ru включён CORS (`Access-Control-Allow-Origin: *`)
 * на `login/token.php` и `webservice/rest/server.php`, поэтому браузер обращается
 * к API напрямую. Своего бэкенда у приложения нет — пароль уходит только на
 * edu.mmcs.sfedu.ru и нигде не сохраняется.
 *
 * Если админ однажды отключит CORS — достаточно поменять `REST_ENDPOINT` / `TOKEN_ENDPOINT`
 * на свой прокси, остальной код трогать не нужно.
 */

export const MOODLE_ORIGIN = "https://edu.mmcs.sfedu.ru";
export const MOBILE_SERVICE = "moodle_mobile_app";

export const TOKEN_ENDPOINT = `${MOODLE_ORIGIN}/login/token.php`;
export const REST_ENDPOINT = `${MOODLE_ORIGIN}/webservice/rest/server.php`;
/** Легаси-эндпоинт загрузки файлов multipart/form-data (только запись). */
export const UPLOAD_ENDPOINT = `${MOODLE_ORIGIN}/webservice/upload.php`;

export class MoodleError extends Error {
  code: string;
  constructor(message: string, code = "error") {
    super(message);
    this.name = "MoodleError";
    this.code = code;
  }
}

/** Moodle ждёт плоские параметры вида `courseids[0]`, `events[eventtype]`. */
function flatten(value: unknown, prefix: string, out: Record<string, string>) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}[${k}]` : k, out);
    }
    return;
  }
  out[prefix] = String(value);
}

export function encodeParams(params: Record<string, unknown>): string {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) flatten(v, k, flat);
  return new URLSearchParams(flat).toString();
}

type MoodleErrorBody = { exception?: string; errorcode?: string; message?: string };

async function parse<T>(res: Response, context: string): Promise<T> {
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new MoodleError(
      `Не удалось разобрать ответ сервера (${context}).`,
      "badresponse",
    );
  }
  const body = data as MoodleErrorBody;
  if (body && typeof body === "object" && body.exception) {
    throw new MoodleError(
      body.message || "Сервер Moodle вернул ошибку.",
      body.errorcode || "error",
    );
  }
  return data as T;
}

function networkError(err: unknown): MoodleError {
  const message = err instanceof Error ? err.message : String(err);
  return new MoodleError(
    `Не удалось связаться с edu.mmcs.sfedu.ru. ${message}`,
    "network",
  );
}

/** Обменивает логин/пароль на долгоживущий токен веб-сервиса. */
export async function requestToken(
  username: string,
  password: string,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username,
        password,
        service: MOBILE_SERVICE,
      }).toString(),
    });
  } catch (err) {
    throw networkError(err);
  }

  const text = await res.text();
  let data: { token?: string; error?: string; errorcode?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new MoodleError(
      "Сервер вернул неожиданный ответ при входе.",
      "badresponse",
    );
  }

  if (data.token) return data.token;
  throw new MoodleError(
    data.error || "Неверный логин или пароль.",
    data.errorcode || "invalidlogin",
  );
}

/** Вызывает произвольную ws-функцию Moodle. */
export async function callFunction<T>(
  token: string,
  fn: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const body = new URLSearchParams({
    wstoken: token,
    wsfunction: fn,
    moodlewsrestformat: "json",
  });
  const extra = encodeParams(params);
  const payload = extra ? `${body.toString()}&${extra}` : body.toString();

  let res: Response;
  try {
    res = await fetch(REST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload,
    });
  } catch (err) {
    throw networkError(err);
  }
  return parse<T>(res, fn);
}

/** Ссылка на файл курса, доступная по токену веб-сервиса. */
export function fileUrl(url: string, token: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("token", token);
    return u.toString();
  } catch {
    return url;
  }
}
