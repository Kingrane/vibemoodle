import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronRight, ExternalLink } from "lucide-react";
import type { MoodleModule, MoodleSection } from "@/api/types";
import { useCourseContents, useCourseEvents, useMyCourses } from "@/api/hooks";
import { useSession } from "@/session/useSession";
import { toDeadline } from "@/lib/deadlines";
import { formatDate, moduleTypeLabel, plural } from "@/lib/format";
import { buildMoodleHtml } from "@/lib/moodleHtml";
import { ACCENT_TEXT, accentFor } from "@/lib/palette";
import { cx } from "@/lib/cx";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  ModIcon,
  PillLink,
  ProgressBar,
  Reveal,
  Section,
} from "@/ui/primitives";
import { DeadlineRow } from "@/ui/DeadlineRow";
import { SubmissionBadge } from "@/ui/SubmissionBadge";

function Label({ module, token }: { module: MoodleModule; token: string }) {
  const html = buildMoodleHtml(
    module.description ?? module.afterlink ?? "",
    module.contents,
    token,
  );
  if (!html.trim()) return null;
  return (
    <li className="border-b border-line py-4 last:border-b-0">
      <div
        className="moodle-content text-body-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </li>
  );
}

function ModuleRow({ module, token }: { module: MoodleModule; token: string }) {
  if (module.modname === "label") {
    return <Label module={module} token={token} />;
  }

  const done = module.completiondata?.state === 1;
  const fileCount = module.contents?.length ?? 0;
  const accent = accentFor(module.modname);

  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        to={`/module/${module.id}`}
        className="group -mx-3 flex items-center gap-4 rounded-card px-3 py-4 transition-colors duration-300 hover:bg-cream/[0.05]"
      >
        <span className="text-muted transition-colors duration-300 group-hover:text-cream">
          <ModIcon modname={module.modname} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-body-sm">{module.name}</span>
            <span className={cx("text-caption", ACCENT_TEXT[accent])}>
              {moduleTypeLabel(module.modname)}
            </span>
            {done && (
              <span className="inline-flex items-center gap-1 text-caption text-green">
                <Check className="h-3.5 w-3.5" strokeWidth={2} /> пройдено
              </span>
            )}
            {module.modname === "assign" && module.instance && (
              <SubmissionBadge assignid={module.instance} />
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted">
            {module.dates?.map((d) => (
              <span key={d.dataid ?? d.label}>
                {d.label.replace(/:\s*$/, "")}:{" "}
                {formatDate(d.timestamp, {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ))}
            {fileCount > 0 && (
              <span>
                {fileCount} {plural(fileCount, "файл", "файла", "файлов")}
              </span>
            )}
          </div>
        </div>

        <span className="flex shrink-0 items-center gap-3 text-muted transition-colors duration-300 group-hover:text-cream">
          <span className="hidden text-caption sm:inline">открыть</span>
          <ChevronRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            strokeWidth={1.5}
          />
        </span>
      </Link>
    </li>
  );
}

function SectionBlock({
  section,
  token,
  index,
}: {
  section: MoodleSection;
  token: string;
  index: number;
}) {
  const [open, setOpen] = useState(index < 3);
  const accent = accentFor(section.id);

  return (
    <div className="border-t border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-baseline gap-4 py-5 text-left"
      >
        <span className="text-caption tabular-nums text-muted">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className={cx(
            "flex-1 text-body-lg font-medium transition-colors duration-300",
            open ? "text-cream" : "text-muted hover:text-cream",
          )}
        >
          {section.name}
        </span>
        <span className={cx("text-caption", ACCENT_TEXT[accent])}>
          {section.modules.length || "—"}
        </span>
        <ChevronRight
          className={cx(
            "h-4 w-4 text-muted transition-transform duration-500",
            open && "rotate-90",
          )}
          strokeWidth={1.5}
        />
      </button>

      {open && section.modules.length > 0 && (
        <ul className="pb-4 md:pl-12">
          {section.modules.map((module) => (
            <ModuleRow key={module.id} module={module} token={token} />
          ))}
        </ul>
      )}
      {open && section.modules.length === 0 && (
        <p className="pb-6 text-caption text-muted md:pl-12">раздел пуст</p>
      )}
    </div>
  );
}

export function CoursePage() {
  const { courseid } = useParams();
  const id = Number(courseid);
  const token = useSession((s) => s.token) ?? "";

  const coursesQuery = useMyCourses();
  const contentsQuery = useCourseContents(id);
  const eventsQuery = useCourseEvents(id);

  const course = coursesQuery.data?.find((c) => c.id === id);
  const accent = accentFor(id);

  const deadlines = useMemo(
    () =>
      (eventsQuery.data ?? [])
        .map(toDeadline)
        .filter((d) => !d.overdue)
        .sort((a, b) => a.timestamp - b.timestamp),
    [eventsQuery.data],
  );

  const visibleSections = contentsQuery.data ?? [];

  return (
    <div className="py-10 md:py-14">
      <Link
        to="/courses"
        className="inline-flex items-center gap-2 text-caption text-muted transition-colors duration-300 hover:text-cream"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        все курсы
      </Link>

      <Reveal>
        <div className="mt-10 flex flex-col gap-5">
          <span className={cx("text-caption uppercase tracking-[0.08em]", ACCENT_TEXT[accent])}>
            {course?.shortname ?? "курс"}
          </span>
          <h1 className="max-w-4xl text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] md:text-heading">
            {course?.fullname ?? `Курс ${id}`}
          </h1>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-caption text-muted">
            <span>{visibleSections.length} разделов</span>
            {course?.startdate ? <span>начало {formatDate(course.startdate)}</span> : null}
            {course?.enddate ? <span>до {formatDate(course.enddate)}</span> : null}
            <PillLink to="/grades" small>
              оценки
            </PillLink>
          </div>

          {typeof course?.progress === "number" && course.progress > 0 && (
            <div className="max-w-md">
              <ProgressBar value={course.progress} accent={id} />
            </div>
          )}
        </div>
      </Reveal>

      {deadlines.length > 0 && (
        <Section eyebrow="сроки" title="Ближайшие дедлайны">
          <div className="flex flex-col">
            {deadlines.slice(0, 6).map((d) => (
              <DeadlineRow key={d.id} deadline={d} />
            ))}
          </div>
        </Section>
      )}

      <Section eyebrow="содержимое" title="Материалы курса">
        {contentsQuery.isLoading ? (
          <LoadingBlock rows={4} />
        ) : contentsQuery.isError ? (
          <ErrorState
            message={(contentsQuery.error as Error)?.message}
            onRetry={() => contentsQuery.refetch()}
          />
        ) : visibleSections.length === 0 ? (
          <EmptyState title="Курс пока пуст" hint="Материалы появятся здесь." />
        ) : (
          <div className="mt-2">
            {visibleSections.map((section, i) => (
              <SectionBlock key={section.id} section={section} token={token} index={i} />
            ))}
            <div className="border-t border-line" />
          </div>
        )}
      </Section>

      <p className="mt-8 flex items-center gap-2 text-caption text-muted">
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
        Нажмите на материал, чтобы открыть его здесь. Сдача заданий и тесты —
        на самом сайте Moodle.
      </p>
    </div>
  );
}
