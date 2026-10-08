import { Link } from "react-router-dom";
import { useSession } from "@/session/useSession";

export function Logo({ to = "/" }: { to?: string }) {
  const username = useSession((s) => s.username);
  return (
    <Link to={to} className="group inline-flex items-baseline gap-2">
      <span className="text-body-lg font-semibold tracking-[-0.03em]">
        мехмат<span className="text-green">.</span>edu
      </span>
      {username && (
        <span className="hidden text-caption text-muted sm:inline">
          /{username}
        </span>
      )}
    </Link>
  );
}
