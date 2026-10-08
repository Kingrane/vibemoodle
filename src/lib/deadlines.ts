import type { ActionEvent } from "@/api/types";
import { moduleTypeLabel } from "./format";
import { accentFor, type AccentName } from "./palette";

export interface Deadline {
  id: number;
  name: string;
  courseid: number | null;
  courseName: string;
  shortname: string;
  modulename: string;
  typeLabel: string;
  timestamp: number;
  url?: string;
  /** id элемента курса (cmid) — для ссылки внутрь приложения. */
  cmid: number | null;
  overdue: boolean;
  accent: AccentName;
}

/** Достаёт cmid из ссылки Moodle вида `/mod/assign/view.php?id=123`. */
function cmidFromUrl(url?: string): number | null {
  if (!url) return null;
  const match = url.match(/[?&]id=(\d+)/);
  return match ? Number(match[1]) : null;
}

export function toDeadline(event: ActionEvent): Deadline {
  const modulename = event.modulename ?? event.component ?? "event";
  return {
    id: event.id,
    name: event.name,
    courseid: event.course?.id ?? event.courseid ?? null,
    courseName: event.course?.fullname ?? "",
    shortname: event.course?.shortname ?? "",
    modulename,
    typeLabel: moduleTypeLabel(modulename),
    timestamp: event.timesort,
    url: event.action?.url ?? event.url,
    cmid: cmidFromUrl(event.url) ?? cmidFromUrl(event.action?.url),
    overdue: Boolean(event.overdue) || event.timesort < Math.floor(Date.now() / 1000),
    accent: accentFor(modulename),
  };
}

export function sortByTime(items: Deadline[]) {
  return [...items].sort((a, b) => a.timestamp - b.timestamp);
}
