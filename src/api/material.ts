import { htmlToText } from "@/lib/moodleHtml";
import { getAssignments, getPages, getQuizzes, getUrls } from "./moodle";
import { quizReviewText } from "./quizReview";
import type { MoodleModule } from "./types";

function clean(text: string): string {
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Собирает «решаемый» текст материала: название, описание и — в зависимости от
 * типа модуля — содержимое страницы, условие задания, интро теста и т.п.
 * Описания в `core_course_get_contents` часто пусты, поэтому текст дотягивается
 * тем же ws-вызовом, что и на странице материала.
 */
export async function gatherMaterial(
  token: string,
  cm: MoodleModule,
  mod?: MoodleModule,
): Promise<string> {
  const parts: string[] = [];
  const push = (value?: string | null) => {
    const text = clean(value ?? "");
    if (text) parts.push(text);
  };

  push(mod?.description);
  push(mod?.afterlink);

  const course = cm.course;
  if (course) {
    try {
      if (cm.modname === "page") {
        const pages = await getPages(token, course);
        push(htmlToText(pages.find((p) => p.coursemodule === cm.id)?.content));
      } else if (cm.modname === "assign") {
        const assigns = await getAssignments(token, course);
        push(htmlToText(assigns.find((a) => a.cmid === cm.id)?.intro));
      } else if (cm.modname === "quiz") {
        const quizzes = await getQuizzes(token, course);
        const quiz = quizzes.find((q) => q.coursemodule === cm.id);
        push(htmlToText(quiz?.intro));
        // Разбор попытки: вопросы, мои ответы, баллы и отзывы преподавателя.
        push(await quizReviewText(token, quiz?.id));
      } else if (cm.modname === "url") {
        const urls = await getUrls(token, course);
        const url = urls.find((u) => u.coursemodule === cm.id);
        push(htmlToText(url?.intro));
        push(url?.externalurl);
      }
    } catch {
      /* доп. текст не дотянулся — обойдёмся названием и описанием */
    }
  }

  const files = mod?.contents ?? [];
  if (files.length > 0) {
    push(`Прикреплённые файлы: ${files.map((f) => f.filename).join(", ")}`);
  }

  return parts.join("\n\n").slice(0, 20000);
}
