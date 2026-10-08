import { useMemo, useState } from "react";
import { useMyCourses } from "@/api/hooks";
import { ACCENT_TEXT } from "@/lib/palette";
import {
  EmptyState,
  ErrorState,
  Eyebrow,
  LoadingBlock,
  Reveal,
} from "@/ui/primitives";
import { CourseCard } from "@/ui/CourseCard";

export function CoursesPage() {
  const { data, isLoading, isError, error, refetch } = useMyCourses();
  const [filter, setFilter] = useState("");

  const courses = useMemo(() => {
    const list = data ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.fullname.toLowerCase().includes(q) ||
        c.shortname.toLowerCase().includes(q),
    );
  }, [data, filter]);

  return (
    <div className="py-14 md:py-20">
      <Reveal>
        <Eyebrow>дисциплины</Eyebrow>
      </Reveal>
      <Reveal delay={80}>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
          <h1 className="text-heading-sm font-semibold tracking-[-0.03em] md:text-heading">
            Мои курсы
          </h1>
          <div className="flex items-baseline gap-4">
            <span className={ACCENT_TEXT.blue + " text-heading-sm tabular-nums leading-none"}>
              {courses.length}
            </span>
            <span className="text-caption text-muted">
              из {data?.length ?? 0} дисциплин
            </span>
          </div>
        </div>
      </Reveal>

      <Reveal delay={140}>
        <label className="mt-10 flex max-w-md items-center gap-3 border-b border-line pb-2">
          <span className="text-caption text-muted">фильтр</span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="название или код курса"
            className="w-full bg-transparent text-body-sm outline-none placeholder:text-muted/60"
          />
        </label>
      </Reveal>

      <div className="mt-12">
        {isLoading ? (
          <LoadingBlock rows={3} />
        ) : isError ? (
          <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
        ) : courses.length === 0 ? (
          <EmptyState
            title="Ничего не найдено"
            hint="Попробуйте другой запрос — например, «математическая логика»."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, i) => (
              <Reveal key={course.id} delay={Math.min(i, 6) * 40}>
                <CourseCard course={course} index={i} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
