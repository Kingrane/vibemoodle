import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/useTheme";
import { cx } from "@/lib/cx";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
      className="relative grid h-9 w-9 place-items-center rounded-full border border-line transition-colors duration-500 hover:bg-cream/[0.06]"
    >
      <span
        className="grid place-items-center transition-transform duration-500"
        style={{
          transform: isDark ? "rotate(0deg)" : "rotate(90deg)",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <Sun
          className={cx(
            "col-start-1 row-start-1 h-4 w-4 transition-all duration-500",
            isDark ? "scale-0 opacity-0" : "scale-100 opacity-100 text-orange",
          )}
          strokeWidth={1.5}
        />
        <Moon
          className={cx(
            "col-start-1 row-start-1 h-4 w-4 transition-all duration-500",
            isDark ? "scale-100 opacity-100" : "scale-0 opacity-0",
          )}
          strokeWidth={1.5}
        />
      </span>
    </button>
  );
}
