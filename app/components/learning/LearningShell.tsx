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
    >
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
        {children}
      </div>
    </main>
  );
}
