import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useActionEvents, useMyCourses, useOverviewGrades } from "@/api/hooks";
import { useSession } from "@/session/useSession";
import { toDeadline, type Deadline } from "@/lib/deadlines";
import { daysUntil, formatDate, plural } from "@/lib/format";
import { ACCENT_TEXT, accentFor } from "@/lib/palette";
import { cx } from "@/lib/cx";
import {
  EmptyState,
  ErrorState,
  Eyebrow,
  LoadingBlock,
  PillLink,
  Reveal,
  Section,
  Stat,
} from "@/ui/primitives"; import { DeadlineRow } from "@/ui/DeadlineRow";
import { CourseCard } from "@/ui/CourseCard";

export function DashboardPage() {
  const fullname = useSession((s) => s.fullname);

  const coursesQuery = useMyCourses();
  const eventsQuery = useActionEvents(50);
  const gradesQuery = useOverviewGrades();

  const deadlines = useMemo<Deadline[]>(
    () => (eventsQuery.data ?? []).map(toDeadline),
    [eventsQuery.data],
  );

  const { overdue, upcoming, thisWeek } = useMemo(() => {
    const od = deadlines.filter((d) => d.overdue);
    const up = deadlines
      .filter((d) => !d.overdue)
      .sort((a, b) => a.timestamp - b.timestamp);
    return {
      overdue: od,
      upcoming: up,
      thisWeek: up.filter((d) => daysUntil(d.timestamp) <= 7),
    };
  }, [deadlines]);

  const graded = useMemo(
    () => (gradesQuery.data ?? []).filter((g) => g.rawgrade !== null),
    [gradesQuery.data],
  );

  const today = new Date();
  const firstName = (fullname ?? "").split(" ").slice(-2).join(" ");

  return (
    <div className="py-14 md:py-20">
      <Reveal>
        <Eyebrow>
          сегодня, {formatDate(today.getTime() / 1000, { weekday: "long", day: "numeric", month: "long" })}
        </Eyebrow>
      </Reveal>

      <Section
        flush
        className="mt-2 md:mt-4"
        eyebrow="курсы"
        title="Мои дисциплины"
        action={
          <PillLink to="/catalog" small>
            все курсы
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </PillLink>
        }
      >
        {coursesQuery.isLoading ? (
          <LoadingBlock rows={2} />
        ) : coursesQuery.isError ? (
          <ErrorState
            message={(coursesQuery.error as Error)?.message}
            onRetry={() => coursesQuery.refetch()}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(coursesQuery.data ?? []).slice(0, 6).map((course, i) => (
              <Reveal key={course.id} delay={i * 40}>
                <CourseCard course={course} index={i} />
              </Reveal>
            ))}
          </div>
        )}
      </Section>

      <Reveal delay={80} className="mt-20 md:mt-28">
        <h1 className="max-w-4xl text-[54px] font-semibold leading-[0.95] tracking-[-0.03em] md:text-heading-lg">
          <span className={thisWeek.length > 0 ? "text-orange" : "text-green"}>
            {thisWeek.length}
          </span>{" "}
          <span className="text-[34px] font-normal text-muted md:text-heading-sm">
            {plural(thisWeek.length, "дедлайн", "дедлайна", "дедлайнов")} на этой неделе
          </span>
        </h1>
      </Reveal>

      {firstName && (
        <Reveal delay={140}>
          <p className="mt-6 text-body-lg text-muted">Привет, {firstName}.</p>
        </Reveal>
      )}

      <Reveal delay={200}>
        <div className="mt-14 grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
          <Stat
            value={coursesQuery.data?.length ?? "—"}
            label="курсов на обучении"
            accent="blue"
          />
          <Stat
            value={thisWeek.length}
            label="дедлайнов на неделе"
            accent="orange"
          />
          <Stat value={overdue.length} label="просрочено" accent="pink" />
          <Stat
            value={graded.length}
            label="выставленных оценок"
            accent="green"
          />
        </div>
      </Reveal>

      <Section
        eyebrow="дедлайны"
        title="Что требует внимания"
        action={
          <PillLink to="/calendar" small>
            весь календарь
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </PillLink>
        }
      >
        {eventsQuery.isLoading ? (
          <LoadingBlock rows={4} />
        ) : eventsQuery.isError ? (
          <ErrorState
            message={(eventsQuery.error as Error)?.message}
            onRetry={() => eventsQuery.refetch()}
          />
        ) : overdue.length === 0 && upcoming.length === 0 ? (
          <EmptyState
            title="Дедлайнов нет"
            hint="Ближайшие сроки сдачи появятся здесь, как только преподаватели их назначат."
          />
        ) : (
          <div className="flex flex-col">
            {overdue.length > 0 && (
              <div className="mb-2">
                <span className="eyebrow text-pink">просрочено</span>
                <div className="mt-2">
                  {overdue.slice(0, 4).map((d) => (
                    <DeadlineRow key={d.id} deadline={d} />
                  ))}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                {upcoming.slice(0, 7).map((d) => (
                  <DeadlineRow key={d.id} deadline={d} />
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      {graded.length > 0 && (
        <Section eyebrow="оценки" title="Результаты">
          <div className="flex flex-col">
            {graded.map((g, i) => {
              const course = coursesQuery.data?.find((c) => c.id === g.courseid);
              const accent = accentFor(g.courseid);
              return (
                <Reveal key={g.courseid} delay={i * 40}>
                  <Link
                    to="/grades"
                    className="flex items-baseline justify-between gap-6 border-b border-line py-5 transition-colors duration-300 last:border-b-0 hover:text-cream"
                  >
                    <span className="min-w-0">
                      <span className={cx("mr-3 text-caption", ACCENT_TEXT[accent])}>
                        {course?.shortname ?? g.courseidnumber ?? "курс"}
                      </span>
                      <span className="text-body-lg">
                        {course?.fullname ?? ""}
                      </span>
                    </span>
                    <span className={cx("text-heading-sm font-semibold tabular-nums leading-none", ACCENT_TEXT[accent])}>
                      {g.grade ?? "—"}
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
