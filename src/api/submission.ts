/**
 * ЕДИНСТВЕННЫЙ модуль, который пишет на сервер Moodle.
 *
 * Всё остальное приложение — только чтение. Здесь собраны операции сдачи
 * задания: загрузка файлов во временную область (draft), сохранение сдачи,
 * отправка на проверку и отмена сдачи. Каждый шаг инициирует пользователь,
 * ничего не происходит само по себе.
 *
 * Поток (как в официальном приложении Moodle):
 *   1. POST upload.php (multipart) → itemid черновика
 *   2. mod_assign_save_submission с plugindata[files_filemanager]=itemid
 *      и/или plugindata[onlinetext_editor]
 *   3. mod_assign_submit_for_grading
 */

import { callFunction, MoodleError, UPLOAD_ENDPOINT } from "./transport";
import type { SubmissionStatus } from "./types";

/** Ошибка при загрузке файла в черновик. */
export class UploadError extends MoodleError {
  constructor(message: string, code = "upload") {
    super(message, code);
    this.name = "UploadError";
  }
}

function humanSize(bytes: number): string {
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const rounded = v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1);
  return `${rounded} ${units[i]}`;
}

interface UploadResponseItem {
  itemid?: number;
  filename?: string;
  filesize?: number;
}

/**
 * Заливает файлы в черновик пользователя и возвращает itemid области.
 * Первый запрос создаёт область (itemid=0), дальше файлы кладутся в неё же.
 */
export async function uploadFilesToDraft(
  token: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  if (files.length === 0) throw new UploadError("Не выбрано ни одного файла.", "empty");

  let itemid = 0;
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const body = new FormData();
    body.append("file", file, file.name);

    let res: Response;
    try {
      res = await fetch(
        `${UPLOAD_ENDPOINT}?token=${encodeURIComponent(token)}&filepath=%2F&itemid=${itemid}`,
        { method: "POST", body },
      );
    } catch {
      throw new UploadError(
        `Не удалось загрузить «${file.name}»: нет связи с edu.mmcs.sfedu.ru.`,
        "network",
      );
    }

    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new UploadError(`Moodle не принял файл «${file.name}».`, "badresponse");
    }

    if (data && typeof data === "object" && !Array.isArray(data)) {
      const obj = data as { error?: string; message?: string; errorcode?: string };
      if (obj.error || obj.message) {
        throw new UploadError(obj.message || obj.error || "Ошибка загрузки файла.", obj.errorcode);
      }
    }

    const list = Array.isArray(data) ? (data as UploadResponseItem[]) : [data as UploadResponseItem];
    const first = list[0];
    if (!first?.itemid) {
      throw new UploadError(`Не удалось загрузить «${file.name}».`, "upload");
    }
    itemid = first.itemid;
    onProgress?.(i + 1, files.length);
  }

  return itemid;
}

/** Плоский текст → безопасный HTML для поля онлайн-ответа (format=1). */
export function plainToHtml(input: string): string {
  const escaped = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export interface SaveSubmissionInput {
  assignmentid: number;
  /** itemid области черновика с файлами (если включён файловый плагин). */
  fileItemId?: number;
  /** текст онлайн-ответа (если включён плагин онлайн-текста). */
  onlineText?: string;
}

/** Сохраняет сдачу. Если в задании выключены черновики — это сразу отправка. */
export async function saveSubmission(
  token: string,
  input: SaveSubmissionInput,
): Promise<void> {
  const plugindata: Record<string, unknown> = {};
  if (input.fileItemId) plugindata.files_filemanager = input.fileItemId;
  if (input.onlineText && input.onlineText.trim()) {
    plugindata.onlinetext_editor = {
      text: plainToHtml(input.onlineText),
      format: 1,
      itemid: 0,
    };
  }
  if (Object.keys(plugindata).length === 0) {
    throw new MoodleError("Нечего отправлять: добавьте файл или текст.", "empty");
  }
  await callFunction(token, "mod_assign_save_submission", {
    assignmentid: input.assignmentid,
    plugindata,
  });
}

/** Отправляет сдачу на проверку (финальный шаг). */
export async function submitForGrading(
  token: string,
  assignmentid: number,
  acceptSubmissionStatement: boolean,
): Promise<void> {
  await callFunction(token, "mod_assign_submit_for_grading", {
    assignmentid,
    acceptsubmissionstatement: acceptSubmissionStatement ? 1 : 0,
  });
}

/** Отменяет сдачу (переводит в черновик / удаляет отправку). */
export async function removeSubmission(
  token: string,
  assignmentid: number,
): Promise<void> {
  await callFunction(token, "mod_assign_remove_submission", { assignmentid });
}

/** Полный статус сдачи — им пользуется форма на странице задания. */
export function getSubmissionStatus(
  token: string,
  assignid: number,
): Promise<SubmissionStatus> {
  return callFunction<SubmissionStatus>(token, "mod_assign_get_submission_status", {
    assignid,
  });
}

export { humanSize };
