import { useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { useSession } from "@/session/useSession";
import { cx } from "@/lib/cx";

export function UserMenu() {
  const { fullname, username, sitename, logout } = useSession();
  const [open, setOpen] = useState(false);

  const initials = (fullname || username || "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-full border border-line text-caption font-semibold transition-colors duration-300 hover:bg-cream/[0.06]"
      >
        {initials || "?"}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className={cx(
              "absolute right-0 z-50 mt-3 w-64 rounded-card border border-line bg-panel p-4",
            )}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-line">
                <UserRound className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-body-sm font-semibold">
                  {fullname || username}
                </p>
                <p className="truncate text-caption text-muted">@{username}</p>
              </div>
            </div>
            {sitename && (
              <p className="mt-3 border-t border-line pt-3 text-caption text-muted">
                {sitename}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="mt-3 flex w-full items-center gap-2 border-t border-line pt-3 text-body-sm text-muted transition-colors duration-300 hover:text-pink"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              выйти
            </button>
          </div>
        </>
      )}
    </div>
  );
}
