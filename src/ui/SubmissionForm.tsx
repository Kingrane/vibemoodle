import { useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  ExternalLink,
  FileUp,
  Paperclip,
  Send,
  Undo2,
  X,
} from "lucide-react";
import { fileUrl, MOODLE_ORIGIN } from "@/api/transport";
import type {
  MoodleAssignment,
  MoodleFileContent,
  SubmissionAttempt,
} from "@/api/types";
import {
  humanSize,
  removeSubmission,
  saveSubmission,
  submitForGrading,
  uploadFilesToDraft,
} from "@/api/submission";
import { useSubmissionStatus } from "@/api/hooks";
import { buildMoodleHtml } from "@/lib/moodleHtml";
import { cx } from "@/lib/cx";
import { ErrorState, PillButton, Skeleton } from "@/ui/primitives";

const FIELD =
  "w-full rounded-card border border-line bg-transparent px-4 py-3 text-body-sm outline-none transition-colors duration-300 placeholder:text-muted/50 focus:border-cream";

const STATE_LABEL: Record<string, string> = {
  new: "ещё не сдавали",
  draft: "черновик",
  submitted: "отправлено на проверку",
  reopened: "отправлено на доработку",
};

interface AssignLimits {
  fileEnabled: boolean;
  onlineEnabled: boolean;
  maxFiles: number;
  maxBytes: number;
  fileTypes: string[];
}

function readLimits(assign: MoodleAssignment): AssignLimits {
  const configs = assign.configs ?? [];
  const get = (plugin: string, name: string) =>
    configs.find(
      (c) => c.subtype === "assignsubmission" && c.plugin === plugin && c.name === name,
    )?.value;

  const fileTypes = (get("file", "filetypeslist") ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .map((t) => (t.startsWith(".") ? t : `.${t}`));

  return {
    fileEnabled: get("file", "enabled") === "1",
    onlineEnabled: get("onlinetext", "enabled") === "1",
    maxFiles: Number(get("file", "maxfilesubmissions")) || 20,
    maxBytes: Number(get("file", "maxsubmissionsizebytes")) || 0,
    fileTypes,
  };
}

function pluginFiles(sub?: SubmissionAttempt): MoodleFileContent[] {
  const file = sub?.plugins?.find((p) => p.type === "file");
  const area = file?.fileareas?.find((a) => a.area === "submission_files");
  return area?.files ?? [];
}

function pluginText(sub?: SubmissionAttempt): string {
  const ot = sub?.plugins?.find((p) => p.type === "onlinetext");
  return ot?.editorfields?.[0]?.text ?? "";
}

function CheckBox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer select-none items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border border-line transition-colors duration-300 peer-checked:border-green">
        <Check
          className={cx(
            "h-3.5 w-3.5 text-green transition-opacity duration-200",
            checked ? "opacity-100" : "opacity-0",
          )}
          strokeWidth={3}
        />
      </span>
      <span className="text-body-sm text-muted">{children}</span>
    </label>
  );
}

function Notice({ tone, text }: { tone: "ok" | "err"; text: string }) {
  return (
    <p
      role="status"
      className={cx(
        "flex items-start gap-2 text-body-sm",
        tone === "ok" ? "text-green" : "text-pink",
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
      {text}
    </p>
  );
}

export function SubmissionForm({
  assign,
  assignid,
  token,
}: {
  assign: MoodleAssignment;
  assignid: number;
  token: string;
}) {
  const qc = useQueryClient();
  const status = useSubmissionStatus(assignid);
  const limits = useMemo(() => readLimits(assign), [assign]);

  const [chosen, setChosen] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [acceptStatement, setAcceptStatement] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const invalidate = () => {
    for (const key of [
      "submission-status",
      "submission",
      "action-events",
      "course-events",
      "overview-grades",
      "grades",
      "assignments",
    ]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };

  const send = useMutation({
    mutationFn: async (kind: "draft" | "final") => {
      let fileItemId: number | undefined;
      if (limits.fileEnabled && chosen.length > 0) {
        fileItemId = await uploadFilesToDraft(token, chosen, (done, total) =>
          setProgress(`загружаю файлы: ${done} / ${total}`),
        );
      }
      const hasNew =
        fileItemId !== undefined || (limits.onlineEnabled && text.trim().length > 0);

      if (hasNew) {
        await saveSubmission(token, {
          assignmentid: assignid,
          fileItemId,
          onlineText: limits.onlineEnabled ? text : undefined,
        });
      } else if (!draftsAllowed) {
        throw new Error("Добавьте файл или текст.");
      }

      // Если черновики включены — save_submission сохранил черновик, финально
      // отправляем отдельным вызовом. Если черновиков нет, save_submission уже
      // отправил сдачу, и повторный submit_for_grading не нужен.
      if (kind === "final" && (draftsAllowed || assign.requiresubmissionstatement)) {
        await submitForGrading(token, assignid, acceptStatement);
      }
    },
    onMutate: () => {
      setNotice(null);
      setConfirming(false);
    },
    onSuccess: (_data, kind) => {
      setProgress(null);
      setChosen([]);
      setText("");
      setAcceptStatement(false);
      setNotice({
        tone: "ok",
        text: kind === "final" ? "Сдача отправлена на проверку." : "Черновик сохранён.",
      });
      invalidate();
    },
    onError: (err) => {
      setProgress(null);
      setNotice({
        tone: "err",
        text: err instanceof Error ? err.message : "Не удалось отправить.",
      });
    },
  });

  const cancel = useMutation({
    mutationFn: () => removeSubmission(token, assignid),
    onSuccess: () => {
      setNotice({ tone: "ok", text: "Сдача отменена." });
      invalidate();
    },
    onError: (err) => {
      setNotice({
        tone: "err",
        text: err instanceof Error ? err.message : "Не удалось отменить сдачу.",
      });
    },
  });

  if (status.isLoading) {
    return (
      <div className="mt-10 border-t border-line pt-8">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  }
  if (status.isError) {
    return (
      <div className="mt-10 border-t border-line pt-8">
        <ErrorState
          message={(status.error as Error)?.message}
          onRetry={() => status.refetch()}
        />
      </div>
    );
  }

  const last = status.data?.lastattempt;
  const enabled = last?.submissionsenabled ?? false;
  const locked = last?.locked ?? false;
  // ВАЖНО: «можно сдавать» — это canedit. Флаг cansubmit в Moodle 5.2
  // приходит всегда false, поэтому полагаться на него нельзя.
  const canEdit = (last?.canedit ?? last?.caneditowner) ?? false;
  const editable = enabled && !locked && canEdit;
  const submission = last?.submission;
  const hasSubmission = !!submission && submission.status !== "new";
  const existingFiles = pluginFiles(submission);
  const existingText = pluginText(submission);
  const stateLabel = submission ? STATE_LABEL[submission.status] ?? submission.status : "ещё не сдавали";
  const draftsAllowed = assign.submissiondrafts === 1;
  const moodleUrl = `${MOODLE_ORIGIN}/mod/assign/view.php?id=${assign.cmid}`;

  const feedback = status.data?.feedback;
  const gradeText = feedback?.gradefordisplay
    ? feedback.gradefordisplay.replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, "").trim()
    : feedback?.grade?.grade != null
      ? String(feedback.grade.grade)
      : null;
  const feedbackComment =
    feedback?.plugins?.find((p) => p.type === "comments")?.editorfields?.[0]?.text ?? "";

  const addFiles = (files: FileList | File[]) => {
    const next = [...chosen];
    for (const f of Array.from(files)) {
      if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    setChosen(next);
    setNotice(null);
  };

  const validate = (kind: "draft" | "final"): string | null => {
    if (limits.fileEnabled && chosen.length > limits.maxFiles) {
      return `Не больше ${limits.maxFiles} файлов.`;
    }
    if (limits.fileEnabled && limits.maxBytes) {
      const big = chosen.find((f) => f.size > limits.maxBytes);
      if (big) return `«${big.name}» больше ${humanSize(limits.maxBytes)}.`;
    }
    if (limits.fileEnabled && limits.fileTypes.length) {
      const bad = chosen.find(
        (f) => !limits.fileTypes.some((ext) => f.name.toLowerCase().endsWith(ext)),
      );
      if (bad) return `«${bad.name}» — недопустимый тип файла.`;
    }
    const hasNew =
      chosen.length > 0 || (limits.onlineEnabled && text.trim().length > 0);
    if (!hasNew && !hasSubmission) return "Добавьте файл или текст.";
    if (kind === "draft" && !hasNew) return "Нечего сохранять.";
    if (kind === "final" && assign.requiresubmissionstatement && !acceptStatement) {
      return "Подтвердите, что работа выполнена самостоятельно.";
    }
    return null;
  };

  const requestFinal = () => {
    const problem = validate("final");
    if (problem) {
      setNotice({ tone: "err", text: problem });
      return;
    }
    setNotice(null);
    setConfirming(true);
  };

  const saveDraft = () => {
    const problem = validate("draft");
    if (problem) {
      setNotice({ tone: "err", text: problem });
      return;
    }
    send.mutate("draft");
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <section className="mt-10 border-t border-line pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="eyebrow">сдача</span>
          <span
            className={cx(
              "text-caption",
              submission?.status === "submitted"
                ? "text-blue"
                : submission?.status === "reopened"
                  ? "text-pink"
                  : "text-muted",
            )}
          >
            {stateLabel}
          </span>
          {hasSubmission && submission?.timemodified ? (
            <span className="text-caption text-muted/70">
              обновлено {new Intl.DateTimeFormat("ru-RU", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(submission.timemodified * 1000))}
            </span>
          ) : null}
        </div>
      </div>

      {gradeText && (
        <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-card border border-line px-5 py-4">
          <span className="eyebrow">оценка</span>
          <span className="text-heading-sm font-semibold tracking-[-0.02em] text-green">
            {gradeText}
          </span>
          {feedback?.gradeddate ? (
            <span className="text-caption text-muted/70">
              {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(
                new Date(feedback.gradeddate * 1000),
              )}
            </span>
          ) : null}
        </div>
      )}

      {feedbackComment && (
        <div className="mt-3 rounded-card border border-line px-5 py-4">
          <span className="eyebrow">отзыв</span>
          <div
            className="moodle-content mt-3 text-body-sm"
            dangerouslySetInnerHTML={{ __html: buildMoodleHtml(feedbackComment, [], token) }}
          />
        </div>
      )}

      {/* уже сданное */}
      {(existingFiles.length > 0 || existingText) && (
        <div className="mt-5 flex flex-col gap-3">
          {existingFiles.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {existingFiles.map((file) => (
                <a
                  key={file.fileurl}
                  href={fileUrl(file.fileurl, token)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-body-sm text-muted transition-colors duration-300 hover:text-cream"
                >
                  <Paperclip className="h-4 w-4" strokeWidth={1.5} />
                  {file.filename}
                  {file.filesize > 0 && (
                    <span className="text-caption text-muted/70">{humanSize(file.filesize)}</span>
                  )}
                </a>
              ))}
            </div>
          )}
          {existingText && (
            <div
              className="moodle-content rounded-card border border-line p-4 text-body-sm"
              dangerouslySetInnerHTML={{
                __html: buildMoodleHtml(existingText, [], token),
              }}
            />
          )}
        </div>
      )}

      {!enabled && (
        <p className="mt-5 max-w-2xl text-body-sm text-muted">
          Это задание не принимает ответы на сайте — сдавать его нужно очно или в Moodle.
        </p>
      )}

      {enabled && !editable && (
        <div className="mt-5 flex flex-col gap-4">
          <p className="max-w-2xl text-body-sm text-muted">
            {hasSubmission || last?.graded
              ? "Сдача уже отправлена. Сейчас изменить её нельзя."
              : "Приём ответов закрыт — срок сдачи истёк."}
          </p>
          <a
            href={moodleUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 text-caption text-muted transition-colors duration-300 hover:text-cream"
          >
            открыть в Moodle
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
          </a>
        </div>
      )}

      {enabled && editable && (
        <div className="mt-6 flex max-w-2xl flex-col gap-6">
          {hasSubmission && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="max-w-md text-body-sm text-muted">
                {submission?.status === "draft"
                  ? "Черновик сохранён — отправьте его на проверку, когда будет готово."
                  : "Ответ отправлен. Можно дополнить и отправить заново."}
              </span>
              <PillButton onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                <Undo2 className="h-4 w-4" strokeWidth={1.5} />
                {cancel.isPending ? "отменяю…" : "отменить сдачу"}
              </PillButton>
            </div>
          )}
          {limits.fileEnabled && (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-caption text-muted">файлы</span>
                <span className="text-caption text-muted/70">
                  до {limits.maxFiles}
                  {limits.maxBytes ? `, каждый до ${humanSize(limits.maxBytes)}` : ""}
                </span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={cx(
                  "mt-2 flex cursor-pointer flex-col items-center gap-2 rounded-card border border-dashed px-4 py-8 text-center transition-colors duration-300",
                  dragging ? "border-cream bg-cream/[0.04]" : "border-line hover:border-muted",
                )}
              >
                <FileUp className="h-5 w-5 text-muted" strokeWidth={1.5} />
                <span className="text-body-sm text-muted">
                  перетащите файлы или нажмите, чтобы выбрать
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {chosen.length > 0 && (
                <ul className="mt-4 flex flex-col">
                  {chosen.map((file) => (
                    <li
                      key={`${file.name}-${file.size}`}
                      className="flex items-center gap-3 border-b border-line py-2 last:border-b-0"
                    >
                      <Paperclip className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
                      <span className="min-w-0 flex-1 truncate text-body-sm">{file.name}</span>
                      <span className="shrink-0 text-caption text-muted/70">
                        {humanSize(file.size)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Убрать ${file.name}`}
                        onClick={() => setChosen((prev) => prev.filter((f) => f !== file))}
                        className="shrink-0 text-muted transition-colors duration-300 hover:text-pink"
                      >
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {limits.onlineEnabled && (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-caption text-muted">онлайн-ответ</span>
                <span className="text-caption text-muted/70">{wordCount} сл.</span>
              </div>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setNotice(null);
                }}
                rows={6}
                placeholder="текст ответа…"
                className={cx(FIELD, "mt-2 resize-y")}
              />
            </div>
          )}

          {assign.requiresubmissionstatement ? (
            <CheckBox checked={acceptStatement} onChange={setAcceptStatement}>
              подтверждаю, что эта работа выполнена мной самостоятельно
            </CheckBox>
          ) : null}

          {notice && <Notice tone={notice.tone} text={notice.text} />}
          {progress && <Notice tone="ok" text={progress} />}

          {!confirming ? (
            <div className="flex flex-wrap items-center gap-4">
              {draftsAllowed && (
                <PillButton onClick={saveDraft} disabled={send.isPending}>
                  {send.isPending ? "…" : "сохранить черновик"}
                </PillButton>
              )}
              <PillButton primary onClick={requestFinal} disabled={send.isPending}>
                <Send className="h-4 w-4" strokeWidth={1.5} />
                отправить на проверку
              </PillButton>
            </div>
          ) : (
            <div className="rounded-card border border-line p-5">
              <p className="text-body-sm">
                Отправить сдачу на проверку? После этого изменить её можно будет
                только если преподаватель вернёт работу на доработку.
              </p>
              <ul className="mt-3 flex flex-col gap-1 text-caption text-muted">
                {chosen.length > 0 && (
                  <li>
                    приложено файлов: {chosen.length}
                    {chosen.length > 0 ? ` (${chosen.map((f) => f.name).join(", ")})` : ""}
                  </li>
                )}
                {chosen.length === 0 && existingFiles.length > 0 && (
                  <li>будут отправлены уже прикреплённые файлы: {existingFiles.length}</li>
                )}
                {limits.onlineEnabled && text.trim() ? (
                  <li>онлайн-ответ: {wordCount} сл.</li>
                ) : null}
                {chosen.length === 0 && !text.trim() && !existingFiles.length && !existingText ? (
                  <li className="text-pink">ничего не добавлено</li>
                ) : null}
              </ul>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <PillButton
                  primary
                  onClick={() => send.mutate("final")}
                  disabled={send.isPending}
                >
                  {send.isPending ? "отправляю…" : "да, отправить"}
                </PillButton>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={send.isPending}
                  className="text-body-sm text-muted transition-colors duration-300 hover:text-cream"
                >
                  отмена
                </button>
              </div>
            </div>
          )}

          {!confirming && notice?.tone === "ok" && (
            <a
              href={moodleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-caption text-muted transition-colors duration-300 hover:text-cream"
            >
              проверить на сайте Moodle
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
            </a>
          )}
        </div>
      )}
    </section>
  );
}
