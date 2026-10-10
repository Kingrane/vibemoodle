import { callFunction } from "./transport";
import type { EnrolResult } from "./types";

/**
 * Запись на сервер Moodle — самостоятельная запись студента на курс.
 *
 * Как и сдача заданий, это ЕДИНСТВЕННАЯ разрешённая запись, и вызывать её
 * можно только по явному действию пользователя (кнопка «записаться» с
 * подтверждением). Если Moodle откажет — прилетит `MoodleError` с его текстом
 * (запись закрыта, нужен пароль и т.п.).
 */
export function enrolSelf(token: string, courseid: number) {
  return callFunction<EnrolResult | null>(token, "enrol_self_enrol_user", {
    courseid,
  });
}
