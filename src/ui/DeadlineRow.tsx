import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Deadline } from "@/lib/deadlines";
import { relativeDeadline, formatDate } from "@/lib/format";
import { ACCENT_TEXT, toneAccent } from "@/lib/palette";
import { cx } from "@/lib/cx";

export function DeadlineRow({ deadline, index = 0 }: { deadline: Deadline; index?: number }) {
  const rel = relativeDeadline(deadline.timestamp);
  const tone = deadline.overdue ? "overdue" : rel.tone;
  const toneColor = ACCENT_TEXT[toneAccent(tone)];

  const arrow = (
    <ArrowRight
      className="ml-1 inline h-4 w-4 opacity-0 transition-opacity duration-300 group-hover:opacity-60"
      strokeWidth={1.5}
    />
  );

  return (
    <div className="group flex flex-col gap-3 border-b border-line py-5 transition-colors duration-300 last:border-b-0 md:grid md:grid-cols-[120px_1fr_auto] md:items-baseline md:gap-6">
      <span
        className={cx(
          "text-caption tabular-nums transition-colors duration-300",
          toneColor,
        )}
      >
        {formatDate(deadline.timestamp, { day: "numeric", month: "short" })}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={cx("text-caption", ACCENT_TEXT[deadline.accent])}>
            {deadline.typeLabel}
          </span>
          {deadline.cmid ? (
            <Link
              to={`/module/${deadline.cmid}`}
              className="text-body-lg leading-snug transition-colors duration-300 hover:text-cream md:text-[23px]"
            >
              {deadline.name}
              {arrow}
            </Link>
          ) : deadline.url ? (
            <a
              href={deadline.url}
              target="_blank"
              rel="noreferrer"
              className="text-body-lg leading-snug transition-colors duration-300 hover:text-cream md:text-[23px]"
            >
              {deadline.name}
              {arrow}
            </a>
          ) : (
            <span className="text-body-lg leading-snug">{deadline.name}</span>
          )}
        </div>
        {deadline.courseid && (
          <Link
            to={`/courses/${deadline.courseid}`}
            className="mt-1 inline-block text-caption text-muted transition-colors duration-300 hover:text-cream"
          >
            {deadline.courseName}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-1">
        <span className={cx("text-caption whitespace-nowrap", toneColor)}>
          {rel.text}
        </span>
        <span className="text-caption text-muted tabular-nums">
          {formatDate(deadline.timestamp, { day: "numeric", month: "long", weekday: "short" })}
        </span>
      </div>
    </div>
  );
}
