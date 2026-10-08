/** Форматирование дат, размеров и русских склонений. */

const MS_DAY = 1000 * 60 * 60 * 24;

export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function formatDate(ts?: number | null, opts?: Intl.DateTimeFormatOptions) {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("ru-RU", opts ?? { day: "numeric", month: "long" }).format(
    new Date(ts * 1000),
  );
}

export function formatDateTime(ts?: number | null) {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts * 1000));
}

export function formatWeekday(ts?: number | null) {
  if (!ts) return "";
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(
    new Date(ts * 1000),
  );
}

/** Разница в днях от сегодняшнего дня (целые сутки, локальное время). */
export function daysUntil(ts: number): number {
  const target = new Date(ts * 1000);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / MS_DAY);
}

export function relativeDeadline(ts: number): {
  text: string;
  tone: "overdue" | "today" | "soon" | "later";
} {
  const d = daysUntil(ts);
  if (d < 0) {
    const n = Math.abs(d);
    return {
      text: `просрочено на ${n} ${plural(n, "день", "дня", "дней")}`,
      tone: "overdue",
    };
  }
  if (d === 0) return { text: "сегодня", tone: "today" };
  if (d === 1) return { text: "завтра", tone: "today" };
  if (d <= 7) return { text: `через ${d} ${plural(d, "день", "дня", "дней")}`, tone: "soon" };
  return {
    text: `через ${d} ${plural(d, "день", "дня", "дней")}`,
    tone: "later",
  };
}

export function formatSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  const rounded = value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[i]}`;
}

export function isImage(mimetype?: string) {
  return Boolean(mimetype?.startsWith("image/"));
}

export function isPdf(mimetype?: string) {
  return mimetype === "application/pdf";
}

/** Понятная подпись для типа модуля Moodle. */
export function moduleTypeLabel(modname: string): string {
  const map: Record<string, string> = {
    assign: "задание",
    quiz: "тест",
    resource: "файл",
    page: "страница",
    url: "ссылка",
    forum: "форум",
    folder: "папка",
    book: "книга",
    label: "заметка",
    feedback: "опрос",
    choice: "опрос",
    lesson: "урок",
    scorm: "курс SCORM",
    h5pactivity: "интерактив",
    bigbluebuttonbn: "вебинар",
    workshop: "семинар",
    glossary: "глоссарий",
    wiki: "вики",
    data: "база",
  };
  return map[modname] ?? modname;
}
