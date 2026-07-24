import Link from "next/link";
import AppTopNav from "../../AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../../lib/nav";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../lib/learning/instructorAuthoring";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export default function InstructorShell({
  title,
  subtitle = "Instructor",
  children,
  backHref,
  backLabel = "Back",
}: Props) {
  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <AppTopNav title={title} subtitle={subtitle} />
        <nav
          aria-label="Instructor"
          className="mt-4 flex flex-wrap gap-2 border-b border-white/10 pb-4"
        >
          <Link
            href={LEARNING_INSTRUCTOR_ROUTES.hub}
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            Spaces
          </Link>
          <Link
            href={LEARNING_INSTRUCTOR_ROUTES.spaceNew}
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            New space
          </Link>
        </nav>
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
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
