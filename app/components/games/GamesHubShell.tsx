import Link from "next/link";
import AppTopNav from "../AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";

type GamesHubShellProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

/**
 * Platform Games hub chrome — AppTopNav stays full-bleed (same as other product
 * surfaces). Page content is constrained; do not nest primary nav in max-w-3xl.
 */
export default function GamesHubShell({
  title = "Games",
  subtitle = "UM Games",
  children,
  backHref,
  backLabel = "Back",
}: GamesHubShellProps) {
  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav title={title} subtitle={subtitle} sticky />
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        {backHref ? (
          <p className="mt-0">
            <Link
              href={backHref}
              className="watch-focus-ring text-sm font-bold text-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300/60"
            >
              ← {backLabel}
            </Link>
          </p>
        ) : null}
        {children}
      </div>
    </main>
  );
}
