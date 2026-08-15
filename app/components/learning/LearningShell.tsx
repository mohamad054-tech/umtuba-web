import Link from "next/link";
import AppTopNav from "../AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import { LearningContainer } from "./ds";

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
 * UAF-04: AppTopNav must sit outside the content max-width so platform
 * chrome stays full-bleed; learner content remains constrained.
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
      <AppTopNav title={title} subtitle={subtitle ?? "UM Learning"} />
      <LearningContainer>
        <div className="flex flex-wrap items-center gap-4">
          {backHref ? (
            <Link
              href={backHref}
              className="watch-focus-ring inline-flex items-center gap-1.5 text-sm font-bold text-white/60 hover:text-white"
            >
              <span aria-hidden="true" className="inline-block rtl:rotate-180">
                ←
              </span>
              {backLabel}
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
      </LearningContainer>
    </main>
  );
}
