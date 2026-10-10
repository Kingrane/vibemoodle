import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ExternalLink, Menu, Search, X } from "lucide-react";
import { MOODLE_ORIGIN } from "@/api/transport";
import { cx } from "@/lib/cx";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

const NAV = [
  { to: "/", label: "дешборд", end: true },
  { to: "/courses", label: "мои курсы" },
  { to: "/catalog", label: "курсы" },
  { to: "/grades", label: "оценки" },
  { to: "/calendar", label: "календарь" },
];

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          "px-1 py-2 text-body-sm transition-colors duration-300",
          isActive ? "text-cream" : "text-muted hover:text-cream",
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="min-h-dvh">
      <div className="wash" aria-hidden />

      <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-5 md:px-8">
          <Logo />

          <nav className="ml-auto hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
            <NavLink
              to="/search"
              aria-label="Поиск"
              className={({ isActive }) =>
                cx(
                  "grid h-9 w-9 place-items-center rounded-full border border-line transition-colors duration-300 hover:bg-cream/[0.06]",
                  isActive && "text-green",
                )
              }
            >
              <Search className="h-4 w-4" strokeWidth={1.5} />
            </NavLink>
            <ThemeToggle />
            <UserMenu />
          </nav>

          <div className="ml-auto flex items-center gap-3 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              aria-label="Меню"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-full border border-line"
            >
              {menuOpen ? (
                <X className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Menu className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-line bg-canvas md:hidden">
            <nav className="mx-auto flex max-w-[1280px] flex-col px-5 py-3">
              {[...NAV, { to: "/search", label: "поиск" }].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cx(
                      "border-b border-line py-3 text-body-sm last:border-0",
                      isActive ? "text-cream" : "text-muted",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="flex items-center justify-between py-3">
                <UserMenu />
                <span className="text-caption text-muted">аккаунт</span>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1280px] px-5 pb-24 md:px-8">{children}</main>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-5 py-14 md:flex-row md:items-start md:justify-between md:px-8">
          <div className="max-w-md">
            <Logo />
          </div>
          <div className="flex flex-col gap-3 text-body-sm">
            <span className="eyebrow">ссылки</span>
            <a
              href={MOODLE_ORIGIN}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-muted transition-colors duration-300 hover:text-cream"
            >
              edu.mmcs.sfedu.ru
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
            </a>
            <NavLink to="/calendar" className="text-muted transition-colors duration-300 hover:text-cream">
              дедлайны
            </NavLink>
            <NavLink to="/grades" className="text-muted transition-colors duration-300 hover:text-cream">
              оценки
            </NavLink>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-3 px-5 py-6 text-caption text-muted md:flex-row md:justify-between md:px-8">
            <span className="order-2 md:order-1">
              сделано для студентов, не является официальным сервисом ЮФУ
            </span>
            <span className="order-1 md:order-2">
              {"{ "}
              <span className="text-green">romka навайбкодил</span>
              {" }"}
            </span>
            <span className="order-3">Moodle Web Services · {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
