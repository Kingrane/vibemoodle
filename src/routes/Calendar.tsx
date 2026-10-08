import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useActionEventsRange } from "@/api/hooks";
import { toDeadline, type Deadline } from "@/lib/deadlines";
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
import { DeadlineRow } from "@/ui/DeadlineRow";

const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const MONTHS = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

function dayKey(ts: number) {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m, d, 12);
}

function buildMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Пн = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < total; i += 1) {
    const dayNumber = i - offset + 1;
    const date = new Date(year, month, dayNumber);
    cells.push({ date, inMonth: dayNumber >= 1 && dayNumber <= daysInMonth });
  }
  return cells;
}

export function CalendarPage() {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(dayKey(now.getTime() / 1000));

  const range = useMemo(() => {
    const start = new Date(cursor.year, cursor.month, 1);
    start.setDate(start.getDate() - 7);
    const end = new Date(cursor.year, cursor.month + 1, 0, 23, 59, 59);
    end.setDate(end.getDate() + 7);
    return {
      from: Math.floor(start.getTime() / 1000),
      to: Math.floor(end.getTime() / 1000),
    };
  }, [cursor]);

  const eventsQuery = useActionEventsRange(range.from, range.to, 200);

  const deadlines = useMemo(
    () => (eventsQuery.data ?? []).map(toDeadline),
    [eventsQuery.data],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Deadline[]>();
    for (const d of deadlines) {
      const key = dayKey(d.timestamp);
      const list = map.get(key);
      if (list) list.push(d);
      else map.set(key, [d]);
    }
    for (const list of map.values()) list.sort((a, b) => a.timestamp - b.timestamp);
    return map;
  }, [deadlines]);

  const cells = useMemo(() => buildMonth(cursor.year, cursor.month), [cursor]);
  const selectedList = byDay.get(selected) ?? [];
  const todayKey = dayKey(now.getTime() / 1000);

  const move = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <div className="py-14 md:py-20">
      <Reveal>
        <Eyebrow>календарь дедлайнов</Eyebrow>
      </Reveal>
      <Reveal delay={80}>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
          <h1 className="text-heading-sm font-semibold tracking-[-0.03em] md:text-heading">
            {MONTHS[cursor.month]}
            <span className="ml-4 text-muted tabular-nums">{cursor.year}</span>
          </h1>
          <div className="flex gap-3">
            <PillButton small onClick={() => move(-1)} ariaLabel="Предыдущий месяц">
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </PillButton>
            <PillButton
              small
              onClick={() => {
                setCursor({ year: now.getFullYear(), month: now.getMonth() });
                setSelected(todayKey);
              }}
            >
              сегодня
            </PillButton>
            <PillButton small onClick={() => move(1)} ariaLabel="Следующий месяц">
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </PillButton>
          </div>
        </div>
      </Reveal>

      <Reveal delay={140}>
        <div className="mt-12">
          <div className="grid grid-cols-7 border-b border-line">
            {WEEKDAYS.map((w) => (
              <span key={w} className="px-2 py-3 text-caption uppercase tracking-[0.1em] text-muted">
                {w}
              </span>
            ))}
          </div>

          {eventsQuery.isLoading ? (
            <div className="py-6">
              <LoadingBlock rows={4} />
            </div>
          ) : eventsQuery.isError ? (
            <div className="py-6">
              <ErrorState
                message={(eventsQuery.error as Error)?.message}
                onRetry={() => eventsQuery.refetch()}
              />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((cell) => {
                const key = dayKey(cell.date.getTime() / 1000);
                const list = byDay.get(key) ?? [];
                const isToday = key === todayKey;
                const isSelected = key === selected;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(key)}
                    className={cx(
                      "flex min-h-24 flex-col gap-1 border-b border-r border-line p-2 text-left transition-colors duration-300 md:min-h-28",
                      cell.inMonth ? "hover:bg-cream/[0.04]" : "opacity-30",
                      isSelected && "bg-cream/[0.06]",
                    )}
                  >
                    <span
                      className={cx(
                        "text-caption tabular-nums",
                        isToday ? "text-green" : "text-muted",
                      )}
                    >
                      {cell.date.getDate()}
                    </span>
                    <span className="flex flex-col gap-0.5 overflow-hidden">
                      {list.slice(0, 3).map((d) => (
                        <span
                          key={d.id}
                          className={cx(
                            "truncate text-[11px] leading-tight",
                            ACCENT_TEXT[d.accent],
                          )}
                        >
                          {d.name}
                        </span>
                      ))}
                      {list.length > 3 && (
                        <span className="text-[11px] text-muted">
                          +{list.length - 3}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Reveal>

      <Reveal delay={180}>
        <section className="mt-16">
          <div className="mb-6 flex flex-wrap items-baseline gap-4">
            <Eyebrow>выбранный день</Eyebrow>
            <span className="text-caption text-muted">
              {parseKey(selected).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>
          {selectedList.length === 0 ? (
            <EmptyState title="В этот день дедлайнов нет" />
          ) : (
            <div className="flex flex-col">
              {selectedList.map((d) => (
                <DeadlineRow key={d.id} deadline={d} />
              ))}
            </div>
          )}
        </section>
      </Reveal>
    </div>
  );
}
