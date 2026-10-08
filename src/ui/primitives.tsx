import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  FileText,
  Folder,
  HelpCircle,
  LayoutList,
  Link2,
  MessageSquare,
  PenLine,
  Presentation,
  Video,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/lib/cx";
import { useReveal } from "@/lib/useReveal";
import { accentClass, ACCENT_TEXT } from "@/lib/palette";

/* ------------------------------ layout ------------------------------ */

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reveal = useReveal<HTMLDivElement>(delay);
  return (
    <div ref={reveal.ref} className={cx(reveal.className, className)} style={reveal.style}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

export function Section({
  eyebrow,
  title,
  action,
  children,
  className,
  flush,
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Убрать верхний отступ — когда секция идёт первой на странице. */
  flush?: boolean;
}) {
  return (
    <section className={cx(flush ? undefined : "mt-20 md:mt-28", className)}>
      {(eyebrow || title || action) && (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-3">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {title && (
              <h2 className="text-subhead md:text-heading-sm font-semibold tracking-[-0.02em]">
                {title}
              </h2>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const pillBase = "pill";

export function PillLink({
  to,
  href,
  children,
  primary,
  small,
  className,
  onClick,
}: {
  to?: string;
  href?: string;
  children: ReactNode;
  primary?: boolean;
  small?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const cls = cx(pillBase, small && "pill-sm", primary && "pill-primary", className);
  if (to) {
    return (
      <Link to={to} className={cls} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cls}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

export function PillButton({
  children,
  onClick,
  primary,
  small,
  className,
  type = "button",
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  small?: boolean;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cx(
        pillBase,
        small && "pill-sm",
        primary && "pill-primary",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------ data bits ------------------------------ */

export function ProgressBar({
  value,
  accent,
  className,
}: {
  value: number;
  accent?: number | string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const color = accent === undefined ? "text-green" : accentClass(accent);
  return (
    <div className={cx("flex items-center gap-3", className)}>
      <div className="h-px flex-1 bg-line">
        <div
          className={cx("h-px bg-current transition-[width] duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cx("text-caption tabular-nums", color)}>{pct}%</span>
    </div>
  );
}

const MOD_ICONS: Record<string, LucideIcon> = {
  assign: ClipboardList,
  quiz: HelpCircle,
  resource: FileText,
  page: PenLine,
  url: Link2,
  forum: MessageSquare,
  folder: Folder,
  book: BookOpen,
  lesson: Presentation,
  h5pactivity: LayoutList,
  bigbluebuttonbn: Video,
};

export function ModIcon({ modname, className }: { modname: string; className?: string }) {
  const Icon = MOD_ICONS[modname] ?? FileText;
  return <Icon className={cx("h-5 w-5", className)} strokeWidth={1.5} />;
}

/* ------------------------------ states ------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

export function Stat({
  value,
  label,
  accent = "green",
  hint,
}: {
  value: ReactNode;
  label: string;
  accent?: keyof typeof ACCENT_TEXT;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-5">
      <span className="text-caption text-muted">{label}</span>
      <span className={cx("text-heading-sm font-semibold tracking-[-0.03em] tabular-nums leading-none", ACCENT_TEXT[accent])}>
        {value}
      </span>
      {hint && <span className="text-caption text-muted">{hint}</span>}
    </div>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-start gap-3 p-6">
      <p className="text-body-lg">{title}</p>
      {hint && <p className="text-muted text-body-sm max-w-prose">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Не удалось загрузить данные",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card flex flex-col items-start gap-4 p-6">
      <span className="eyebrow text-pink">ошибка</span>
      <p className="text-body-lg">{title}</p>
      {message && <p className="text-muted text-body-sm max-w-prose">{message}</p>}
      {onRetry && (
        <PillButton small onClick={onRetry}>
          повторить
        </PillButton>
      )}
    </div>
  );
}
