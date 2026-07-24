import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import CommunityNav from "../../../../components/learning/CommunityNav";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_COMMUNITY_ROUTES,
  getLearningCourseCommunityFeed,
  readCommunityItems,
  readCommunityNumber,
  readCommunityString,
} from "../../../../../lib/learning/communityFoundation";
import { LEARNING_LEARNER_ROUTES } from "../../../../../lib/learning/learnerDelivery";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

function hrefForItem(
  courseId: string,
  kind: string | null,
  id: string | null
): string {
  if (!id) return LEARNING_COMMUNITY_ROUTES.hub(courseId);
  if (kind === "discussion") {
    return LEARNING_COMMUNITY_ROUTES.discussion(courseId, id);
  }
  if (kind === "unanswered_question" || kind === "instructor_activity") {
    // Instructor activity may be announcement or Q&A; prefer Q&A path when kind is unanswered.
    if (kind === "unanswered_question") {
      return LEARNING_COMMUNITY_ROUTES.question(courseId, id);
    }
    return LEARNING_COMMUNITY_ROUTES.announcements(courseId);
  }
  if (kind === "announcement") {
    return LEARNING_COMMUNITY_ROUTES.announcements(courseId);
  }
  return LEARNING_COMMUNITY_ROUTES.hub(courseId);
}

export default async function CourseCommunityFeedPage({ params }: PageProps) {
  const { courseId } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_COMMUNITY_ROUTES.hub(courseId))}`
    );
  }

  const supabase = await createClient();
  const loaded = await getLearningCourseCommunityFeed(supabase, courseId);
  if (!loaded.ok) {
    notFound();
  }

  const items = readCommunityItems(loaded.data, "items");
  const unanswered = readCommunityNumber(
    loaded.data,
    "unanswered_question_count"
  );

  return (
    <LearningShell
      title="Course community"
      subtitle="Discussions, Q&A, and announcements"
      backHref={LEARNING_LEARNER_ROUTES.course(courseId)}
      backLabel="Course"
    >
      <CommunityNav courseId={courseId} active="feed" />

      <p className="mt-4 text-sm text-white/55">
        Unanswered questions: {unanswered}
      </p>

      {items.length === 0 ? (
        <p
          role="status"
          className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/55"
        >
          No community activity yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            const kind = readCommunityString(item, "kind");
            const id = readCommunityString(item, "id");
            const title = readCommunityString(item, "title") ?? "Untitled";
            const preview = readCommunityString(item, "preview");
            const author = readCommunityString(item, "author_label");
            const status = readCommunityString(item, "item_status");
            const key = `${kind ?? "item"}-${id ?? title}`;
            return (
              <li key={key}>
                <Link
                  href={hrefForItem(courseId, kind, id)}
                  className="block rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-3 transition hover:border-white/25"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                    {(kind ?? "item").replaceAll("_", " ")}
                    {status ? ` · ${status}` : ""}
                  </p>
                  <p className="mt-1 font-bold text-white/90">{title}</p>
                  {preview ? (
                    <p className="mt-1 text-sm text-white/50 line-clamp-2">
                      {preview}
                    </p>
                  ) : null}
                  {author ? (
                    <p className="mt-2 text-xs text-white/35">{author}</p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </LearningShell>
  );
}
