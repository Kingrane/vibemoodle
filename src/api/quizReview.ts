import { getQuizAttemptReview, getQuizAttempts } from "./moodle";
import type { QuizAttempt, QuizReview, QuizReviewQuestion } from "./types";

/**
 * «Разбор попытки» Moodle — это целый HTML-блок вопроса: скрипты, флажки,
 * скрытые поля формы. Напрямую его выводить нельзя (и `buildMoodleHtml`
 * вырезал бы вместе с формой и варианты ответа), поэтому достаём нужное
 * и показываем своими компонентами.
 */

export interface QuizOption {
  html: string;
  chosen: boolean;
}

export interface QuizFileLink {
  name: string;
  url: string;
}

export interface QuizQuestionView {
  slot: number;
  /** Номер вопроса в тесте («3»). */
  number: string;
  type: string;
  status: string;
  mark: number | null;
  maxMark: number | null;
  textHtml: string;
  /** Тот же текст без разметки — для промпта. */
  text: string;
  /** «выберите один или несколько ответов:». */
  prompt: string;
  options: QuizOption[];
  /** Ответ, набранный вручную (эссе/онлайн-текст). */
  answer: string;
  feedbackHtml: string;
  commentHtml: string;
  files: QuizFileLink[];
}

/** Баллы приходят строкой с запятой («0,30»), максимум — числом. */
export function toScore(value?: number | string | null): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function formatScore(value?: number | string | null): string {
  const n = toScore(value);
  return n == null
    ? "—"
    : n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const squash = (value?: string | null) => (value ?? "").replace(/\s+/g, " ").trim();

/** HTML → текст, но с пробелами между блоками (у `htmlToText` они склеиваются). */
export function plainText(html?: string | null): string {
  if (!html) return "";
  if (typeof DOMParser === "undefined") return squash(html.replace(/<[^>]+>/g, " "));
  const body = new DOMParser().parseFromString(html, "text/html").body;
  return squash(Array.from(body.childNodes).map((node) => node.textContent ?? "").join(" "));
}

/** Текст варианта: у multichoice — `answer-label`, у truefalse — обычный `<label>`. */
function optionHtml(row: Element): string {
  const region = row.querySelector('[data-region="answer-label"]');
  const source = region?.querySelector(".flex-fill") ?? region ?? row.querySelector("label");
  return source?.innerHTML.trim() ?? "";
}

/** Подсказку берём только у видимой легенды, без служебных «Вопрос 2». */
function promptText(legend: Element | null): string {
  if (!legend || legend.classList.contains("visually-hidden")) return "";
  const clone = legend.cloneNode(true) as Element;
  clone.querySelectorAll(".visually-hidden").forEach((node) => node.remove());
  return squash(clone.textContent);
}

function parseQuestion(question: QuizReviewQuestion): QuizQuestionView {
  const doc = new DOMParser().parseFromString(question.html ?? "", "text/html");

  const qtext = doc.querySelector(".qtext");
  const textHtml = qtext?.innerHTML.trim() ?? "";

  const options = Array.from(doc.querySelectorAll(".answer > .r0, .answer > .r1")).map((row) => ({
    html: optionHtml(row),
    chosen: Boolean(row.querySelector("input:checked")),
  }));

  const comment = doc.querySelector(".comment");
  if (comment) {
    comment.querySelectorAll(".accesshide, script, style").forEach((node) => node.remove());
    // Moodle подписывает блок словом «Комментарий:» — у нас свой заголовок.
    comment.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && /^\s*комментарий:?\s*$/i.test(node.textContent ?? "")) {
        node.remove();
      }
    });
  }
  const commentHtml = comment?.innerHTML.trim() ?? "";

  return {
    slot: question.slot,
    number: squash(doc.querySelector(".qno")?.textContent) || String(question.slot),
    type: question.type,
    status: squash(question.status),
    mark: toScore(question.mark),
    maxMark: toScore(question.maxmark),
    textHtml,
    text: plainText(textHtml),
    prompt: promptText(doc.querySelector("legend.prompt")),
    options,
    answer: (doc.querySelector(".answer textarea")?.textContent ?? "").trim(),
    feedbackHtml: doc.querySelector(".outcome .feedback")?.innerHTML.trim() ?? "",
    // Пустой «Комментарий:» (такой Moodle отдаёт по умолчанию) не показываем.
    commentHtml: plainText(commentHtml) ? commentHtml : "",
    files: Array.from(doc.querySelectorAll(".attachments a[href]")).map((link) => ({
      name: squash(link.textContent),
      url: link.getAttribute("href") ?? "",
    })),
  };
}

export function parseQuizReview(review: QuizReview): QuizQuestionView[] {
  return (review.questions ?? []).map(parseQuestion);
}

/** Последняя завершённая попытка — её и разбираем. */
export function lastFinishedAttempt(attempts?: QuizAttempt[]): QuizAttempt | undefined {
  return (attempts ?? [])
    .filter((attempt) => attempt.state === "finished")
    .sort((a, b) => b.attempt - a.attempt)[0];
}

const reviewCache = new Map<string, Promise<QuizReview>>();

/**
 * Разбор нужен и странице материала, и промпту для агента, причём промпт
 * собирается заранее — так что один запрос на попытку, а не два.
 */
export function loadQuizReview(token: string, attemptid: number): Promise<QuizReview> {
  const key = `${token}:${attemptid}`;
  let pending = reviewCache.get(key);
  if (!pending) {
    pending = getQuizAttemptReview(token, attemptid);
    pending.catch(() => reviewCache.delete(key));
    reviewCache.set(key, pending);
  }
  return pending;
}

/** Текст разбора для промпта: вопросы, мои ответы, баллы и отзывы. */
export async function quizReviewText(token: string, quizid?: number): Promise<string> {
  if (!quizid) return "";
  const attempt = lastFinishedAttempt(await getQuizAttempts(token, quizid));
  if (!attempt) return "";
  const review = await loadQuizReview(token, attempt.id);

  return parseQuizReview(review)
    .map((question) => {
      const lines = [
        `Вопрос ${question.number} — ${formatScore(question.mark)} из ${formatScore(question.maxMark)}`,
      ];
      if (question.text) lines.push(question.text);
      if (question.options.length > 0) {
        lines.push(
          question.options
            .map((option, index) => `${option.chosen ? "[x]" : "[ ]"} ${index + 1}. ${plainText(option.html)}`)
            .join("\n"),
        );
      }
      if (question.answer) lines.push(`Мой ответ: ${question.answer}`);
      const feedback = plainText(question.feedbackHtml);
      if (feedback) lines.push(`Отзыв: ${feedback}`);
      const comment = plainText(question.commentHtml);
      if (comment) lines.push(`Комментарий преподавателя: ${comment}`);
      if (question.files.length > 0) {
        lines.push(`Файлы моего ответа: ${question.files.map((file) => file.name).join(", ")}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}
