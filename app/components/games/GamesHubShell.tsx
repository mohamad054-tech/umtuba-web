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
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <AppTopNav title={title} subtitle={subtitle} />
        {backHref ? (
          <p className="mt-4">
            <Link
              href={backHref}
              className="watch-focus-ring text-sm font-bold text-white/60 hover:text-white"
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
