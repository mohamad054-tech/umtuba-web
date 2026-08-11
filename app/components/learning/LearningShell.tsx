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
      id="learning-main"
      aria-label={title}
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <a
        href="#learning-content"
        className="absolute left-4 top-4 z-50 -translate-y-[200%] rounded-full bg-white px-4 py-2 text-sm font-bold text-black outline-none transition focus:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
      >
        Skip to learning content
      </a>
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <AppTopNav title={title} subtitle={subtitle ?? "UM Learning"} />
        <nav
          aria-label="Learning page actions"
          className="mt-4 flex flex-wrap items-center gap-4"
        >
          {backHref ? (
            <Link
              href={backHref}
              className="watch-focus-ring text-sm font-bold text-white/70 hover:text-white"
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
        </nav>
        <div id="learning-content">{children}</div>
      </div>
    </main>
  );
}
