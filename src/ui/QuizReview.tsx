import { useMemo } from "react";
import { Check, Download } from "lucide-react";
import type { QuizReview as QuizReviewData } from "@/api/types";
import { fileUrl } from "@/api/transport";
import { formatScore, parseQuizReview, plainText, toScore, type QuizQuestionView } from "@/api/quizReview";
import { buildMoodleHtml } from "@/lib/moodleHtml";
import { formatDateTime, plural } from "@/lib/format";
import { cx } from "@/lib/cx";

/** Полный балл — зелёный, частичный — оранжевый, ноль — розовый. */
function scoreTone(mark: number | null, maxMark: number | null) {
  if (mark == null || maxMark == null) return "text-muted";
  if (mark >= maxMark) return "text-green";
  return mark > 0 ? "text-orange" : "text-pink";
}

function duration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} ${plural(minutes, "минута", "минуты", "минут")}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [
    `${hours} ${plural(hours, "час", "часа", "часов")}`,
    rest > 0 ? `${rest} ${plural(rest, "минута", "минуты", "минут")}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function Question({ question, token }: { question: QuizQuestionView; token: string }) {
  const feedback = plainText(question.feedbackHtml);

  return (
    <article className="flex flex-col gap-4 border-t border-line py-8 first:border-t-0 first:pt-0">
      <header className="flex items-baseline justify-between gap-4">
        <span className="text-caption text-muted">вопрос {question.number}</span>
        <span
          className={cx(
            "text-caption tabular-nums",
            scoreTone(question.mark, question.maxMark),
          )}
        >
          {formatScore(question.mark)} / {formatScore(question.maxMark)}
        </span>
      </header>

      <div
        className="moodle-content moodle-content--compact"
        dangerouslySetInnerHTML={{ __html: buildMoodleHtml(question.textHtml, undefined, token) }}
      />

      {question.prompt && <p className="text-caption text-muted/80">{question.prompt}</p>}

      {question.options.length > 0 && (
        <ul className="flex flex-col gap-2">
          {question.options.map((option, index) => (
            <li
              key={index}
              className={cx(
                "flex items-start gap-3 text-body-sm",
                option.chosen ? "text-cream" : "text-muted/70",
              )}
            >
              <span
                className={cx(
                  "mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center rounded-pill border",
                  option.chosen ? "border-cream text-cream" : "border-line",
                )}
              >
                {option.chosen && (
                  <>
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                    <span className="sr-only">выбран: </span>
                  </>
                )}
              </span>
              <div
                className="moodle-content moodle-content--compact min-w-0 flex-1"
                dangerouslySetInnerHTML={{
                  __html: buildMoodleHtml(option.html, undefined, token),
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {question.answer && (
        <div className="rounded-card border border-line p-4">
          <div className="text-caption text-muted">мой ответ</div>
          <div className="mt-2 whitespace-pre-wrap text-body-sm text-cream">{question.answer}</div>
        </div>
      )}

      {question.files.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-caption text-muted">файлы ответа</span>
          {question.files.map((file) => (
            <a
              key={file.url}
              href={fileUrl(file.url, token)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 text-body-sm text-muted transition-colors duration-300 hover:text-cream"
            >
              <Download className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span className="truncate">{file.name}</span>
            </a>
          ))}
        </div>
      )}

      {feedback && <p className="text-caption text-muted">{feedback}</p>}

      {question.commentHtml && (
        <div className="border-l border-line pl-4">
          <div className="text-caption text-muted">отзыв преподавателя</div>
          <div
            className="moodle-content moodle-content--compact mt-2"
            dangerouslySetInnerHTML={{
              __html: buildMoodleHtml(question.commentHtml, undefined, token),
            }}
          />
        </div>
      )}
    </article>
  );
}

/** Разбор завершённой попытки теста: вопросы, мои ответы и отзывы. */
export function QuizReview({
  review,
  maxGrade,
  token,
}: {
  review: QuizReviewData;
  /** Максимум баллов за тест — из `MoodleQuiz.grade`. */
  maxGrade?: number | null;
  token: string;
}) {
  const questions = useMemo(() => parseQuizReview(review), [review]);
  if (questions.length === 0) return null;

  const grade = formatScore(review.grade);
  const gradeValue = toScore(review.grade);
  const percent =
    maxGrade && gradeValue != null && Number(maxGrade) > 0
      ? Math.round((gradeValue / Number(maxGrade)) * 100)
      : null;

  return (
    <section className="border-t border-line pt-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">разбор попытки</span>
          <span className="text-caption text-muted">
            {[
              `попытка ${review.attempt.attempt}`,
              review.attempt.timefinish ? formatDateTime(review.attempt.timefinish) : null,
              review.attempt.timefinish && review.attempt.timestart
                ? duration(review.attempt.timefinish - review.attempt.timestart)
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-heading-sm font-semibold leading-none tabular-nums text-cream">
            {grade}
            {maxGrade ? <span className="text-body text-muted"> / {formatScore(maxGrade)}</span> : null}
          </span>
          {percent != null && (
            <span className="text-caption tabular-nums text-muted">{percent}%</span>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        {questions.map((question) => (
          <Question key={question.slot} question={question} token={token} />
        ))}
      </div>
    </section>
  );
}
