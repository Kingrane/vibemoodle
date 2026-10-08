import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import * as api from "@/api/moodle";
import { useMyCourses, useOverviewGrades } from "@/api/hooks";
import { useSession } from "@/session/useSession";
import { formatDate } from "@/lib/format";
import { ACCENT_TEXT, accentFor } from "@/lib/palette";
import { cx } from "@/lib/cx";
import {
  EmptyState,
  ErrorState,
  Eyebrow,
  LoadingBlock,
  Reveal,
} from "@/ui/primitives";

function GradeRow({
  name,
  gradeformatted,
  max,
  percentage,
  date,
  accent,
  isTotal,
}: {
  name: string;
  gradeformatted: string;
  max: number | null;
  percentage?: string;
  date?: number;
  accent: keyof typeof ACCENT_TEXT;
  isTotal?: boolean;
}) {
  return (
    <div
      className={cx(
        "grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 border-b border-line py-4 last:border-b-0 md:grid-cols-[1fr_120px_100px]",
        isTotal && "border-cream/40",
      )}
    >
      <span className={cx("text-body-sm", isTotal && "font-semibold")}>{name}</span>
      <span className="text-caption text-muted tabular-nums">
        {date ? formatDate(date, { day: "numeric", month: "short" }) : ""}
      </span>
      <span className="col-start-2 row-start-1 text-right md:col-start-3">
        <span className={cx("text-body-lg font-semibold tabular-nums", ACCENT_TEXT[accent])}>
          {gradeformatted}
        </span>
        {max != null && (
          <span className="text-caption text-muted"> / {max}</span>
        )}
        {percentage && (
          <span className="ml-2 text-caption text-muted">{percentage}</span>
        )}
      </span>
    </div>
  );
}

export function GradesPage() {
  const token = useSession((s) => s.token);
  const userid = useSession((s) => s.userid);
  const coursesQuery = useMyCourses();
  const overview = useOverviewGrades();

  const courses = coursesQuery.data ?? [];

  const results = useQueries({
    queries: courses.map((course) => ({
      queryKey: ["grades", token, course.id, userid],
      queryFn: () => api.getCourseGradeItems(token!, course.id, userid!),
      enabled: !!token && !!userid,
      staleTime: 1000 * 60 * 5,
    })),
  });

  const totals = useMemo(() => {
    const map = new Map<number, number | null>();
    for (const g of overview.data ?? []) map.set(g.courseid, g.rawgrade);
    return map;
  }, [overview.data]);

  const isLoading = coursesQuery.isLoading || results.some((r) => r.isLoading);

  return (
    <div className="py-14 md:py-20">
      <Reveal>
        <Eyebrow>оценки</Eyebrow>
      </Reveal>
      <Reveal delay={80}>
        <h1 className="mt-8 text-heading-sm font-semibold tracking-[-0.03em] md:text-heading">
          Успеваемость
        </h1>
      </Reveal>
      <Reveal delay={140}>
        <p className="mt-4 max-w-2xl text-body text-muted">
          Все выставленные баллы по дисциплинам — в одном списке. Итоговые
          значения берутся из журнала Moodle.
        </p>
      </Reveal>

      <div className="mt-16 flex flex-col gap-20">
        {coursesQuery.isError ? (
          <ErrorState
            message={(coursesQuery.error as Error)?.message}
            onRetry={() => coursesQuery.refetch()}
          />
        ) : isLoading ? (
          <LoadingBlock rows={4} />
        ) : courses.length === 0 ? (
          <EmptyState title="Курсов нет" />
        ) : (
          courses.map((course, i) => {
            const items = results[i]?.data ?? [];
            const error = results[i]?.error as Error | undefined;
            const accent = accentFor(course.id);
            const total = totals.get(course.id);
            const shown = items.filter(
              (it) => it.itemtype === "course" || it.itemname !== null,
            );

            return (
              <Reveal key={course.id} delay={Math.min(i, 4) * 50}>
                <section>
                  <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <span className={cx("text-caption uppercase tracking-[0.08em]", ACCENT_TEXT[accent])}>
                        {course.shortname}
                      </span>
                      <Link
                        to={`/courses/${course.id}`}
                        className="text-body-lg font-medium transition-colors duration-300 hover:text-cream md:text-subhead"
                      >
                        {course.fullname}
                      </Link>
                    </div>
                    {total != null && (
                      <span className={cx("text-subhead font-semibold tabular-nums leading-none md:text-heading-sm", ACCENT_TEXT[accent])}>
                        {total}
                      </span>
                    )}
                  </div>

                  <div className="mt-6">
                    {error ? (
                      <p className="text-caption text-pink">{error.message}</p>
                    ) : shown.length === 0 ? (
                      <p className="text-caption text-muted">
                        Оценок по курсу пока нет.
                      </p>
                    ) : (
                      shown.map((item, idx) => (
                        <GradeRow
                          key={item.id ?? idx}
                          name={
                            item.itemtype === "course"
                              ? "Итог по курсу"
                              : (item.itemname as string)
                          }
                          gradeformatted={item.gradeformatted}
                          max={item.grademax}
                          percentage={
                            item.percentageformatted &&
                            item.percentageformatted !== "" &&
                            item.percentageformatted !== "-"
                              ? item.percentageformatted
                              : undefined
                          }
                          date={item.gradedategraded}
                          accent={accent}
                          isTotal={item.itemtype === "course"}
                        />
                      ))
                    )}
                  </div>
                </section>
              </Reveal>
            );
          })
        )}
      </div>
    </div>
  );
}
