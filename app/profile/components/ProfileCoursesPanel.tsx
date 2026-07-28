import Link from "next/link";
import { APP_ROUTES } from "../../lib/nav";

type ProfileCoursesPanelProps = {
  isOwner?: boolean;
};

/**
 * Stub panel only — full Courses catalog UI is out of scope (Creator Hub readiness).
 */
export default function ProfileCoursesPanel({
  isOwner = false,
}: ProfileCoursesPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
        Courses
      </p>
      <p className="mt-3 text-base font-bold text-white/80">No courses yet</p>
      <p className="mt-2 text-sm text-white/45">
        {isOwner
          ? "Published courses will appear here. Open Learning to manage instructor content."
          : "This creator has not published courses yet."}
      </p>
      {isOwner ? (
        <Link
          href={APP_ROUTES.learning}
          className="watch-focus-ring mt-5 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold transition hover:bg-white/10"
        >
          Open Learning
        </Link>
      ) : null}
    </div>
  );
}
