import Link from "next/link";
import { APP_ROUTES } from "../../lib/nav";

type SiteLegalLinksProps = {
  className?: string;
  /** Compact row for auth footers vs landing page. */
  tone?: "landing" | "auth";
};

export default function SiteLegalLinks({
  className = "",
  tone = "landing",
}: SiteLegalLinksProps) {
  const linkClass =
    tone === "auth"
      ? "font-bold text-blue-200 underline-offset-2 hover:underline"
      : "text-white/55 transition hover:text-white";

  return (
    <nav
      aria-label="Legal"
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-sm ${className}`}
    >
      <Link href={APP_ROUTES.terms} className={`watch-focus-ring ${linkClass}`}>
        Terms of Service
      </Link>
      <Link
        href={APP_ROUTES.privacy}
        className={`watch-focus-ring ${linkClass}`}
      >
        Privacy Policy
      </Link>
    </nav>
  );
}
