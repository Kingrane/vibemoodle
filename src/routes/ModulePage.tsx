import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  FileText,
  Link2,
} from "lucide-react";
import { MOODLE_ORIGIN } from "@/api/transport";
import type { MoodleFileContent, MoodleModule } from "@/api/types";
import {
  useAssignments,
  useCourseContents,
  useCourseModule,
  usePages,
  useQuizBestGrade,
  useQuizzes,
  useUrls,
} from "@/api/hooks";
import { useSession } from "@/session/useSession";
import {
  formatDate,
  formatDateTime,
  moduleTypeLabel,
  plural,
} from "@/lib/format";
import { buildMoodleHtml } from "@/lib/moodleHtml";
import { ACCENT_TEXT, accentFor, type AccentName } from "@/lib/palette";
import { cx } from "@/lib/cx";
import {
  ErrorState,
  LoadingBlock,
  ModIcon,
  PillLink,
  Reveal,
  Skeleton,
} from "@/ui/primitives";
import { FileList } from "@/ui/FileList";
import { FilePreviewFrames } from "@/ui/FilePreview";
import { SubmissionForm } from "@/ui/SubmissionForm";

const moduleUrl = (modname: string, cmid: number) =>
  `${MOODLE_ORIGIN}/mod/${modname}/view.php?id=${cmid}`;

/* ------------------------------ мелкие блоки ------------------------------ */

function Meta({ items }: { items: { label: string; value: string; accent?: AccentName }[] }) {
  const shown = items.filter((i) => i.value);
  if (shown.length === 0) return null;
  return (
    <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
      {shown.map((item) => (
        <div key={item.label} className="border-t border-line pt-4">
          <div className="text-caption text-muted">{item.label}</div>
          <div
            className={cx(
              "mt-2 text-body-lg",
              item.accent ? ACCENT_TEXT[item.accent] : "text-cream",
            )}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function Html({
  raw,
  files,
  token,
  compact,
}: {
  raw?: string | null;
  files?: MoodleFileContent[];
  token: string;
  /** Чуть меньше кегль — для длинных описаний заданий. */
  compact?: boolean;
}) {
  const html = buildMoodleHtml(raw, files, token);
  if (!html.trim()) return null;
  return (
    <article
      className={cx("moodle-content", compact && "moodle-content--compact")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function BodyLoading() {
  return (
    <div className="mt-12 flex flex-col gap-4">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-5/6" />
    </div>
  );
}

function BodyError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="mt-12">
      <ErrorState message={(error as Error)?.message} onRetry={onRetry} />
    </div>
  );
}

function OpenInMoodle({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-line pt-8">
      <PillLink href={href} primary>
        {label}
        <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
      </PillLink>
      <span className="text-caption text-muted">
        откроется на edu.mmcs.sfedu.ru в новой вкладке
      </span>
    </div>
  );
}

/* ------------------------------ тела модулей ------------------------------ */

function PageBody({ cm, mod, token }: { cm: MoodleModule; mod?: MoodleModule; token: string }) {
  const query = usePages(cm.course!);
  if (query.isLoading) return <BodyLoading />;
  if (query.isError) return <BodyError error={query.error} onRetry={() => query.refetch()} />;

  const page = query.data?.find((p) => p.coursemodule === cm.id);
  const files = page?.contentfiles?.length ? page.contentfiles : mod?.contents;

  return (
    <div className="mt-12">
      <Html raw={page?.content} files={files} token={token} />
      {!page?.content && (
        <p className="text-body text-muted">Содержимое страницы пусто.</p>
      )}
    </div>
  );
}

function ResourceBody({ cm, mod, token }: { cm: MoodleModule; mod?: MoodleModule; token: string }) {
  const files = mod?.contents ?? [];
  const description = mod?.description;

  return (
    <div className="mt-12 flex flex-col gap-8">
      <Html raw={description} files={files} token={token} />
      {files.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 text-caption text-muted">
            <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
            {files.length} {plural(files.length, "файл", "файла", "файлов")}
          </div>
          <FilePreviewFrames files={files} token={token} />
          <FileList files={files} token={token} />
        </div>
      ) : (
        <p className="text-body text-muted">Файлы не прикреплены.</p>
      )}
      <OpenInMoodle href={moduleUrl(cm.modname, cm.id)} label="открыть в Moodle" />
    </div>
  );
}

function FolderBody({ cm, mod, token }: { cm: MoodleModule; mod?: MoodleModule; token: string }) {
  const files = mod?.contents ?? [];
  return (
    <div className="mt-12 flex flex-col gap-8">
      <Html raw={mod?.description} files={files} token={token} />
      {files.length > 0 ? (
        <FileList files={files} token={token} />
      ) : (
        <p className="text-body text-muted">Папка пуста.</p>
      )}
      <OpenInMoodle href={moduleUrl(cm.modname, cm.id)} label="открыть в Moodle" />
    </div>
  );
}

function AssignBody({ cm, mod, token }: { cm: MoodleModule; mod?: MoodleModule; token: string }) {
  const query = useAssignments(cm.course!);
  if (query.isLoading) return <BodyLoading />;
  if (query.isError) return <BodyError error={query.error} onRetry={() => query.refetch()} />;

  const assign = query.data?.find((a) => a.cmid === cm.id);
  const files = [
    ...(assign?.introfiles ?? []),
    ...(assign?.introattachments ?? []),
  ];

  return (
    <div className="mt-12 flex flex-col gap-8">
      <Meta
        items={[
          {
            label: "открыто с",
            value: assign?.allowsubmissionsfromdate
              ? formatDateTime(assign.allowsubmissionsfromdate)
              : "сразу",
          },
          {
            label: "срок сдачи",
            value: assign?.duedate ? formatDateTime(assign.duedate) : "без срока",
            accent: "orange",
          },
          {
            label: "крайний срок",
            value: assign?.cutoffdate ? formatDateTime(assign.cutoffdate) : "—",
          },
          {
            label: "максимум баллов",
            value: assign?.grade != null ? String(assign.grade) : "—",
            accent: "green",
          },
        ]}
      />

      <Html raw={assign?.intro ?? mod?.description} files={files} token={token} compact />

      {files.length > 0 && <FileList files={files} token={token} />}

      {assign && cm.instance ? (
        <SubmissionForm assign={assign} assignid={cm.instance} token={token} />
      ) : (
        <OpenInMoodle href={moduleUrl("assign", cm.id)} label="сдать в Moodle" />
      )}
    </div>
  );
}

function QuizBody({ cm, mod, token }: { cm: MoodleModule; mod?: MoodleModule; token: string }) {
  const query = useQuizzes(cm.course!);
  const quiz = query.data?.find((q) => q.coursemodule === cm.id);
  const best = useQuizBestGrade(quiz?.id);

  if (query.isLoading) return <BodyLoading />;
  if (query.isError) return <BodyError error={query.error} onRetry={() => query.refetch()} />;

  const limit = quiz?.timelimit
    ? `${Math.round(quiz.timelimit / 60)} ${plural(Math.round(quiz.timelimit / 60), "минута", "минуты", "минут")}`
    : "не ограничено";

  return (
    <div className="mt-12 flex flex-col gap-8">
      <Meta
        items={[
          {
            label: "открывается",
            value: quiz?.timeopen ? formatDate(quiz.timeopen) : "—",
          },
          {
            label: "закрывается",
            value: quiz?.timeclose ? formatDate(quiz.timeclose) : "—",
            accent: "orange",
          },
          { label: "время на попытку", value: limit },
          {
            label: "попыток",
            value: quiz?.attempts != null && quiz.attempts > 0 ? String(quiz.attempts) : "не ограничено",
          },
          {
            label: "максимум баллов",
            value: quiz?.grade != null ? String(quiz.grade) : "—",
            accent: "green",
          },
        ]}
      />

      {best.data?.hasgrade && (
        <div className="border-t border-line pt-6">
          <span className="text-caption text-muted">ваш лучший результат</span>
          <div className="mt-2 text-heading-sm font-semibold leading-none text-green tabular-nums">
            {best.data.grade}
            {quiz?.grade ? (
              <span className="text-body text-muted"> / {quiz.grade}</span>
            ) : null}
          </div>
        </div>
      )}

      <Html raw={quiz?.intro ?? mod?.description} token={token} />

      <OpenInMoodle href={moduleUrl("quiz", cm.id)} label="пройти в Moodle" />
    </div>
  );
}

function UrlBody({ cm, mod, token }: { cm: MoodleModule; mod?: MoodleModule; token: string }) {
  const query = useUrls(cm.course!);
  if (query.isLoading) return <BodyLoading />;
  if (query.isError) return <BodyError error={query.error} onRetry={() => query.refetch()} />;

  const url = query.data?.find((u) => u.coursemodule === cm.id);

  return (
    <div className="mt-12 flex flex-col gap-8">
      <Html raw={url?.intro ?? mod?.description} token={token} />
      {url?.externalurl && (
        <a
          href={url.externalurl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 border-t border-line pt-6 text-body text-muted transition-colors duration-300 hover:text-cream"
        >
          <Link2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span className="truncate">{url.externalurl}</span>
          <ArrowUpRight className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        </a>
      )}
      {url?.externalurl && (
        <div className="flex flex-wrap gap-4">
          <PillLink href={url.externalurl} primary>
            открыть ссылку
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
          </PillLink>
        </div>
      )}
    </div>
  );
}

function FallbackBody({ cm, mod, token }: { cm: MoodleModule; mod?: MoodleModule; token: string }) {
  return (
    <div className="mt-12 flex flex-col gap-8">
      <Html raw={mod?.description ?? mod?.afterlink} files={mod?.contents} token={token} />
      {!mod?.description && !mod?.afterlink && (
        <p className="text-body text-muted">
          Этот тип материала ({cm.modname}) можно открыть только на сайте Moodle.
        </p>
      )}
      {mod?.contents && mod.contents.length > 0 && (
        <FileList files={mod.contents} token={token} />
      )}
      <OpenInMoodle href={moduleUrl(cm.modname, cm.id)} label="открыть в Moodle" />
    </div>
  );
}

/* ------------------------------ страница ------------------------------ */

function ModuleView({ cm }: { cm: MoodleModule }) {
  const token = useSession((s) => s.token) ?? "";
  const contents = useCourseContents(cm.course ?? 0);

  const mod = contents.data
    ?.flatMap((s) => s.modules)
    .find((m) => m.id === cm.id);

  const accent = accentFor(cm.modname);
  const done = mod?.completiondata?.state === 1;

  return (
    <div className="py-10 md:py-14">
      <Link
        to={`/courses/${cm.course}`}
        className="inline-flex items-center gap-2 text-caption text-muted transition-colors duration-300 hover:text-cream"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        назад к курсу
      </Link>

      <Reveal>
        <div className="mt-10 flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className={cx("text-caption uppercase tracking-[0.08em]", ACCENT_TEXT[accent])}>
              {moduleTypeLabel(cm.modname)}
            </span>
            {done && (
              <span className="inline-flex items-center gap-1 text-caption text-green">
                <Check className="h-3.5 w-3.5" strokeWidth={2} /> пройдено
              </span>
            )}
          </div>

          <h1 className="flex max-w-4xl items-start gap-4 text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-heading">
            <span className="mt-2 hidden text-muted md:block">
              <ModIcon modname={cm.modname} className="h-8 w-8" />
            </span>
            {cm.name}
          </h1>

          {mod?.dates &&
            mod.dates.length > 0 &&
            !["assign", "quiz"].includes(cm.modname) && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-caption text-muted">
                {mod.dates.map((d) => (
                  <span key={d.dataid ?? d.label} className="inline-flex items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {d.label.replace(/:\s*$/, "")}: {formatDateTime(d.timestamp)}
                  </span>
                ))}
              </div>
            )}
        </div>
      </Reveal>

      {cm.modname === "assign" && <AssignBody cm={cm} mod={mod} token={token} />}
      {cm.modname === "quiz" && <QuizBody cm={cm} mod={mod} token={token} />}
      {cm.modname === "url" && <UrlBody cm={cm} mod={mod} token={token} />}
      {cm.modname === "page" && <PageBody cm={cm} mod={mod} token={token} />}
      {cm.modname === "resource" && <ResourceBody cm={cm} mod={mod} token={token} />}
      {cm.modname === "folder" && <FolderBody cm={cm} mod={mod} token={token} />}
      {!["assign", "quiz", "url", "page", "resource", "folder"].includes(cm.modname) && (
        <FallbackBody cm={cm} mod={mod} token={token} />
      )}
    </div>
  );
}

export function ModulePage() {
  const { cmid } = useParams();
  const id = Number(cmid);
  const query = useCourseModule(id);

  if (query.isLoading) {
    return (
      <div className="py-14">
        <LoadingBlock rows={4} />
      </div>
    );
  }

  if (query.isError || !query.data?.cm) {
    return (
      <div className="py-14">
        <ErrorState
          title="Материал не найден"
          message={(query.error as Error)?.message}
          onRetry={() => query.refetch()}
        />
      </div>
    );
  }

  return <ModuleView cm={query.data.cm} />;
}
