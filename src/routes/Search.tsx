import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import * as api from "@/api/moodle";
import { useCourseSearch, useMyCourses } from "@/api/hooks";
import { useSession } from "@/session/useSession";
import { useDebounced } from "@/lib/useDebounced";
import { moduleTypeLabel } from "@/lib/format";
import { ACCENT_TEXT, accentFor } from "@/lib/palette";
import { cx } from "@/lib/cx";
import {
  EmptyState,
  Eyebrow,
  ModIcon,
  PillLink,
  Reveal,
  Section,
} from "@/ui/primitives";

const MIN_QUERY = 2;

export function SearchPage() {
  const token = useSession((s) => s.token);
  const [raw, setRaw] = useState("");
  const query = useDebounced(raw, 350);
  const active = query.trim().length >= MIN_QUERY;

  const coursesQuery = useMyCourses();
  const courses = coursesQuery.data ?? [];

  const platform = useCourseSearch(active ? query : "");

  const contentsResults = useQueries({
    queries: courses.map((course) => ({
      queryKey: ["contents", token, course.id],
      queryFn: () => api.getCourseContents(token!, course.id),
      enabled: !!token && active,
      staleTime: 1000 * 60 * 5,
    })),
  });

  const materialHits = useMemo(() => {
    if (!active) return [];
    const q = query.trim().toLowerCase();
    const hits: {
      id: number;
      name: string;
      modname: string;
      courseid: number;
      courseShort: string;
      section: string;
    }[] = [];
    contentsResults.forEach((result, i) => {
      const course = courses[i];
      for (const section of result.data ?? []) {
        for (const mod of section.modules) {
          if (mod.name.toLowerCase().includes(q)) {
            hits.push({
              id: mod.id,
              name: mod.name,
              modname: mod.modname,
              courseid: course.id,
              courseShort: course.shortname,
              section: section.name,
            });
          }
        }
      }
    });
    return hits.slice(0, 40);
  }, [active, query, contentsResults, courses]);

  const materialsLoading = contentsResults.some((r) => r.isLoading);

  return (
    <div className="py-14 md:py-20">
      <Reveal>
        <Eyebrow>поиск по материалам</Eyebrow>
      </Reveal>

      <Reveal delay={80}>
        <label className="mt-10 flex items-center gap-4 border-b border-line py-4">
          <SearchIcon className="h-6 w-6 shrink-0 text-muted" strokeWidth={1.5} />
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            autoFocus
            placeholder="например, исчисление секвенций"
            className="w-full bg-transparent text-subhead font-medium tracking-[-0.02em] outline-none placeholder:text-muted/50 md:text-heading-sm"
          />
        </label>
      </Reveal>

      {!active ? (
        <p className="mt-8 text-body text-muted">
          Введите хотя бы {MIN_QUERY} символа — поиск пройдёт по названиям
          материалов ваших курсов и по каталогу платформы.
        </p>
      ) : (
        <>
          <Section eyebrow="мои материалы" title={`Найдено: ${materialHits.length}`}>
            {materialsLoading ? (
              <p className="text-body-sm text-muted">ищем…</p>
            ) : materialHits.length === 0 ? (
              <EmptyState
                title="Среди ваших материалов совпадений нет"
                hint="Попробуйте другой запрос или посмотрите каталог ниже."
              />
            ) : (
              <ul className="flex flex-col">
                {materialHits.map((hit) => {
                  const accent = accentFor(hit.courseid);
                  return (
                    <li
                      key={`${hit.courseid}-${hit.id}`}
                      className="flex items-start gap-4 border-b border-line py-4 last:border-b-0"
                    >
                      <span className="mt-0.5 text-muted">
                        <ModIcon modname={hit.modname} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <Link
                            to={`/module/${hit.id}`}
                            className="text-body-sm transition-colors duration-300 hover:text-cream"
                          >
                            {hit.name}
                          </Link>
                          <span className="text-caption text-muted">
                            {moduleTypeLabel(hit.modname)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 text-caption text-muted">
                          <Link
                            to={`/courses/${hit.courseid}`}
                            className={cx("transition-colors duration-300 hover:text-cream", ACCENT_TEXT[accent])}
                          >
                            {hit.courseShort}
                          </Link>
                          <span className="truncate">{hit.section}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section eyebrow="каталог платформы" title="Другие курсы">
            {platform.isLoading ? (
              <p className="text-body-sm text-muted">ищем…</p>
            ) : (platform.data?.courses ?? []).length === 0 ? (
              <EmptyState title="Курсов не найдено" />
            ) : (
              <div className="flex flex-col">
                {(platform.data?.courses ?? []).map((course) => (
                  <div
                    key={course.id}
                    className="flex items-baseline justify-between gap-6 border-b border-line py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <span className={cx("mr-3 text-caption", ACCENT_TEXT[accentFor(course.id)])}>
                        {course.shortname}
                      </span>
                      <span className="text-body-sm">{course.fullname}</span>
                    </div>
                    <PillLink to={`/courses/${course.id}`} small>
                      открыть
                    </PillLink>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
