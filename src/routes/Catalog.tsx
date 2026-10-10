import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, ExternalLink } from "lucide-react";
import { MOODLE_ORIGIN } from "@/api/transport";
import type { CatalogCourse } from "@/api/types";
import { useCatalogCourses, useEnrolSelf, useMyCourses } from "@/api/hooks";
import { ACCENT_TEXT } from "@/lib/palette";
import { cx } from "@/lib/cx";
import {
  EmptyState,
  ErrorState,
  Eyebrow,
  LoadingBlock,
  PillButton,
  Reveal,
} from "@/ui/primitives";

/**
 * Каталог для ФИИТ. В Moodle семестр — это родительская категория,
 * а факультет — вложенная: `categoryid` ниже ведут на нужные подкатегории.
 */
const FACULTY = "Фундаментальная информатика и ИТ";
const SEMESTERS = [
  { id: 13, label: "осенний семестр" },
  { id: 10, label: "весенний семестр" },
];

function canSelfEnrol(course: CatalogCourse) {
  return course.enrollmentmethods?.includes("self") ?? false;
}

function hasGuest(course: CatalogCourse) {
  return course.enrollmentmethods?.includes("guest") ?? false;
}

export function CatalogPage() {
  const [semesterId, setSemesterId] = useState(SEMESTERS[0].id);
  const [filter, setFilter] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorFor, setErrorFor] = useState<{ id: number; text: string } | null>(null);

  const { data, isLoading, isError, error, refetch } = useCatalogCourses(semesterId);
  const mine = useMyCourses();
  const enrol = useEnrolSelf();

  const mineIds = useMemo(
    () => new Set((mine.data ?? []).map((c) => c.id)),
    [mine.data],
  );

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

  const switchSemester = (id: number) => {
    setSemesterId(id);
    setPendingId(null);
    setErrorFor(null);
  };

  const confirmEnrol = (course: CatalogCourse) => {
    setErrorFor(null);
    enrol.mutate(course.id, {
      onSuccess: (result) => {
        setPendingId(null);
        if (result && result.status === false) {
          setErrorFor({
            id: course.id,
            text: result.warnings?.[0]?.message || "Moodle не разрешил запись.",
          });
        }
      },
      onError: (e) => {
        setPendingId(null);
        setErrorFor({ id: course.id, text: (e as Error).message });
      },
    });
  };

  const moodleCatalog = `${MOODLE_ORIGIN}/course/index.php?categoryid=${semesterId}`;

  return (
    <div className="py-14 md:py-20">
      <Reveal>
        <Eyebrow>каталог</Eyebrow>
      </Reveal>

      <Reveal delay={80}>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-heading-sm font-semibold tracking-[-0.03em] md:text-heading">
              Курсы ФИИТ
            </h1>
            <p className="max-w-2xl text-body-sm text-muted">
              {FACULTY}. Выберите семестр и запишитесь на нужные дисциплины —
              или откройте те, где уже учитесь.
            </p>
          </div>
          <div className="flex items-baseline gap-4">
            <span
              className={cx("text-heading-sm tabular-nums leading-none", ACCENT_TEXT.blue)}
            >
              {courses.length}
            </span>
            <span className="text-caption text-muted">курсов</span>
          </div>
        </div>
      </Reveal>

      <Reveal delay={140}>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          {SEMESTERS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => switchSemester(s.id)}
              className={cx("pill pill-sm", semesterId === s.id && "pill-primary")}
            >
              {s.label}
            </button>
          ))}

          <label className="ml-auto flex min-w-[200px] max-w-sm flex-1 items-center gap-3 border-b border-line pb-2">
            <span className="text-caption text-muted">фильтр</span>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="название или код курса"
              className="w-full bg-transparent text-body-sm outline-none placeholder:text-muted/60"
            />
          </label>
        </div>
      </Reveal>

      <div className="mt-10">
        {isLoading ? (
          <LoadingBlock rows={5} />
        ) : isError ? (
          <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
        ) : courses.length === 0 ? (
          <EmptyState
            title="Ничего не найдено"
            hint="Попробуйте другой запрос — например, «алгоритмы»."
          />
        ) : (
          <ul className="flex flex-col">
            {courses.map((course) => {
              const enrolled = mineIds.has(course.id);
              const selfOpen = canSelfEnrol(course);
              const guest = hasGuest(course);
              const rowError = errorFor?.id === course.id ? errorFor.text : null;

              if (pendingId === course.id) {
                return (
                  <li
                    key={course.id}
                    className="border-b border-line bg-cream/[0.03] px-4 py-4 last:border-b-0"
                  >
                    <p className="text-body-sm">
                      Записаться на «{course.fullname}»?
                    </p>
                    <p className="mt-2 max-w-2xl text-caption text-muted">
                      Вы будете зачислены на курс с ролью «студент». Отписаться
                      можно на сайте Moodle.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <PillButton
                        small
                        primary
                        onClick={() => confirmEnrol(course)}
                        disabled={enrol.isPending}
                      >
                        {enrol.isPending ? "записываю…" : "да, записаться"}
                      </PillButton>
                      <button
                        type="button"
                        onClick={() => setPendingId(null)}
                        disabled={enrol.isPending}
                        className="text-body-sm text-muted transition-colors duration-300 hover:text-cream"
                      >
                        отмена
                      </button>
                    </div>
                  </li>
                );
              }

              return (
                <li key={course.id} className="border-b border-line last:border-b-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        {enrolled ? (
                          <Link
                            to={`/courses/${course.id}`}
                            className="text-body-sm transition-colors duration-300 hover:text-cream"
                          >
                            {course.fullname}
                          </Link>
                        ) : (
                          <span className="text-body-sm">{course.fullname}</span>
                        )}
                        <span className="text-caption text-muted">
                          {course.shortname}
                        </span>
                      </div>
                      {rowError ? (
                        <p className="mt-1 text-caption text-pink">{rowError}</p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {enrolled ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-caption text-green">
                            <Check className="h-3.5 w-3.5" strokeWidth={2} />
                            вы записаны
                          </span>
                          <Link
                            to={`/courses/${course.id}`}
                            className="pill pill-sm"
                          >
                            открыть
                            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                          </Link>
                        </>
                      ) : selfOpen ? (
                        <PillButton
                          small
                          primary
                          onClick={() => {
                            setErrorFor(null);
                            setPendingId(course.id);
                          }}
                        >
                          записаться
                        </PillButton>
                      ) : guest ? (
                        <span className="text-caption text-muted">
                          гостевой доступ
                        </span>
                      ) : (
                        <span className="text-caption text-muted/60">
                          запись закрыта
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-8 flex items-center gap-2 text-caption text-muted">
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
        Другие факультеты — в{" "}
        <a
          href={moodleCatalog}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-line underline-offset-2 transition-colors duration-300 hover:text-cream"
        >
          каталоге на сайте Moodle
        </a>
        .
      </p>
    </div>
  );
}
