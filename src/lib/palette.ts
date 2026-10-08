/**
 * Таксономия цветов: у каждого курса — свой акцент из пяти-цветной палитры.
 * Цвет несёт смысл (различает сущности), а не служит украшением.
 */

export type AccentName = "green" | "orange" | "pink" | "lilac" | "blue";

export const ACCENTS: AccentName[] = ["blue", "orange", "lilac", "green", "pink"];

export const ACCENT_TEXT: Record<AccentName, string> = {
  green: "text-green",
  orange: "text-orange",
  pink: "text-pink",
  lilac: "text-lilac",
  blue: "text-blue",
};

export const ACCENT_BG: Record<AccentName, string> = {
  green: "bg-green",
  orange: "bg-orange",
  pink: "bg-pink",
  lilac: "bg-lilac",
  blue: "bg-blue",
};

export function accentFor(seed: number | string): AccentName {
  const n =
    typeof seed === "number"
      ? seed
      : Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return ACCENTS[Math.abs(n) % ACCENTS.length];
}

export function accentClass(seed: number | string) {
  return ACCENT_TEXT[accentFor(seed)];
}

/** Цвет по срочности дедлайна — из той же палитры, без введения новых. */
export function toneAccent(tone: "overdue" | "today" | "soon" | "later"): AccentName {
  switch (tone) {
    case "overdue":
      return "pink";
    case "today":
      return "orange";
    case "soon":
      return "blue";
    default:
      return "lilac";
  }
}
