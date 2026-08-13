import Link from "next/link";
import AppTopNav from "../AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import LearningLearnerNav from "./ui/LearningLearnerNav";
import { learningBtnGhost } from "./ui/tokens";

type LearningShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  /** Entitled staff only — never show to learners without access. */
  instructorHref?: string;
  /**
   * wide: hub/catalog/transcript
   * focus: lesson/quiz/tutor — content is the hero, hide secondary nav
   * default: other Learning pages
   */
  layout?: "default" | "wide" | "focus";
};

const WIDTH: Record<NonNullable<LearningShellProps["layout"]>, string> = {
  default: "max-w-3xl",
  wide: "max-w-6xl",
  focus: "max-w-3xl",
};

export default function LearningShell({
  title,
  subtitle,
  children,
  backHref,
  backLabel = "Back",
  instructorHref,
  layout = "default",
}: LearningShellProps) {
  const showLearnerNav = layout !== "focus";

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav title={title} subtitle={subtitle ?? "UM Learning"} />
      <div className={`mx-auto ${WIDTH[layout]} px-4 py-5 md:px-6 md:py-7`}>
        {showLearnerNav ? (
          <div className="mb-4">
            <LearningLearnerNav />
          </div>
        ) : null}
        {backHref || instructorHref ? (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {backHref ? (
              <Link href={backHref} className={learningBtnGhost}>
                ← {backLabel}
              </Link>
            ) : null}
            {instructorHref ? (
              <Link
                href={instructorHref}
                className="watch-focus-ring inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/10 hover:text-sky-200"
              >
                Instructor workspace
              </Link>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </main>
  );
}
