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
      aria-label={title}
      data-testid="learning-shell"
    >
      <a
        href="#learning-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-black"
        data-testid="learning-skip-link"
      >
        Skip to content
      </a>
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <AppTopNav title={title} subtitle={subtitle ?? "UM Learning"} />
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {backHref ? (
            <Link
              href={backHref}
              className="watch-focus-ring text-sm font-bold text-white/60 hover:text-white"
            >
              ← {backLabel}
            </Link>
          ) : null}
          {instructorHref ? (
            <Link
              href={instructorHref}
              className="watch-focus-ring text-sm font-bold text-sky-300 hover:text-sky-200"
            >
              Instructor workspace
            </Link>
          ) : null}
        </div>
        <div
          id="learning-main-content"
          tabIndex={-1}
          className="outline-none"
          data-testid="learning-main-content"
        >
          {children}
        </div>
      </div>
    </main>
  );
}
