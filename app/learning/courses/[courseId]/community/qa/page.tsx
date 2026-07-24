import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import CommunityNav from "../../../../../components/learning/CommunityNav";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_COMMUNITY_ROUTES,
  listLearningQaQuestions,
  readCommunityItems,
  readCommunityNumber,
  readCommunityString,
} from "../../../../../../lib/learning/communityFoundation";
import { createQaQuestionAction } from "../../../../communityActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ error?: string; status?: string }>;
};

export default async function CommunityQaPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId } = await params;
  const sp = searchParams ? await searchParams : {};
  const statusFilter = sp.status === "open" || sp.status === "resolved" ? sp.status : null;
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_COMMUNITY_ROUTES.qa(courseId))}`
    );
  }

  const supabase = await createClient();
  const loaded = await listLearningQaQuestions(supabase, {
    courseId,
    status: statusFilter,
  });
  if (!loaded.ok) notFound();

  const questions = readCommunityItems(loaded.data, "questions");

  return (
    <LearningShell
      title="Q&A"
      subtitle="Ask and answer course questions"
      backHref={LEARNING_COMMUNITY_ROUTES.hub(courseId)}
      backLabel="Community"
    >
      <CommunityNav courseId={courseId} active="qa" />

      <nav className="mt-3 flex flex-wrap gap-3 text-xs">
        <Link
          href={LEARNING_COMMUNITY_ROUTES.qa(courseId)}
          className="font-bold text-white/70 underline"
        >
          All
        </Link>
        <Link
          href={`${LEARNING_COMMUNITY_ROUTES.qa(courseId)}?status=open`}
          className="font-bold text-white/70 underline"
        >
          Open
        </Link>
        <Link
          href={`${LEARNING_COMMUNITY_ROUTES.qa(courseId)}?status=resolved`}
          className="font-bold text-white/70 underline"
        >
          Resolved
        </Link>
      </nav>

      {sp.error ? (
        <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">
          {sp.error}
        </p>
      ) : null}

      <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-base font-bold">Ask a question</h2>
        <form action={createQaQuestionAction} className="mt-3 space-y-3">
          <input type="hidden" name="courseId" value={courseId} />
          <input
            name="title"
            required
            maxLength={200}
            placeholder="Question title"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          />
          <textarea
            name="body"
            required
            rows={4}
            maxLength={20000}
            placeholder="Details"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black"
          >
            Post question
          </button>
        </form>
      </section>

      {questions.length === 0 ? (
        <p className="mt-6 text-sm text-white/55">No questions yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {questions.map((q) => {
            const id = readCommunityString(q, "question_id");
            if (!id) return null;
            return (
              <li key={id}>
                <Link
                  href={LEARNING_COMMUNITY_ROUTES.question(courseId, id)}
                  className="block rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-3 hover:border-white/25"
                >
                  <p className="font-bold text-white/90">
                    {readCommunityString(q, "title")}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {readCommunityString(q, "asker_role")} ·{" "}
                    {readCommunityString(q, "status")} ·{" "}
                    {readCommunityNumber(q, "answer_count")} answers ·{" "}
                    {readCommunityString(q, "author_label")}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </LearningShell>
  );
}
