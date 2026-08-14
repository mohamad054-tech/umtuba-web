import Link from "next/link";
import AppTopNav from "../AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";

type LearningShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  /** Entitled staff only — never show to learners without access. */
  instructorHref?: string;
};

/**
 * Platform Learning chrome — AppTopNav stays full-bleed (same as Games/product
 * surfaces). Page content is constrained; do not nest primary nav in max-w-*.
 */
export default function LearningShell({
  title,
  subtitle,
  children,
  backHref,
  backLabel = "Back",
  instructorHref,
}: LearningShellProps) {
  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav title={title} subtitle={subtitle ?? "UM Learning"} sticky />
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-center gap-4">
          {backHref ? (
            <Link
              href={backHref}
              className="watch-focus-ring text-sm font-bold text-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300/60"
            >
              ← {backLabel}
            </Link>
          ) : null}
          {instructorHref ? (
            <Link
              href={instructorHref}
              className="watch-focus-ring text-sm font-bold text-sky-300 hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300/60"
            >
              Instructor workspace
            </Link>
          ) : null}
        </div>
        {children}
      </div>
    </main>
  );
}
