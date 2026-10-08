import { Link } from "react-router-dom";
import type { MoodleCourse } from "@/api/types";
import { ACCENT_TEXT, accentFor } from "@/lib/palette";
import { formatDate } from "@/lib/format";
import { cx } from "@/lib/cx";
import { ProgressBar } from "./primitives";

export function CourseCard({ course, index = 0 }: { course: MoodleCourse; index?: number }) {
  const accent = accentFor(course.id);
  return (
    <Link
      to={`/courses/${course.id}`}
      className="card flex flex-col gap-6 p-6 transition-colors"
      style={{ transitionDelay: `${index * 20}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={cx("text-caption uppercase tracking-[0.08em]", ACCENT_TEXT[accent])}>
          {course.shortname}
        </span>
        {course.visible === 0 && (
          <span className="text-caption text-muted">скрыт</span>
        )}
      </div>

      <h3 className="text-body-lg leading-tight font-medium md:text-[28px] md:leading-[1.1]">
        {course.displayname || course.fullname}
      </h3>

      <div className="mt-auto flex flex-col gap-3">
        {typeof course.progress === "number" && course.progress > 0 && (
          <ProgressBar value={course.progress} accent={course.id} />
        )}
        {course.enddate ? (
          <span className="text-caption text-muted">
            до {formatDate(course.enddate)}
          </span>
        ) : (
          <span className="text-caption text-muted">открытый курс</span>
        )}
      </div>
    </Link>
  );
}
