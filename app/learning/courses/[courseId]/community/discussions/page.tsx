import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import CommunityNav from "../../../../../components/learning/CommunityNav";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_COMMUNITY_ROUTES,
  listLearningDiscussionThreads,
  readCommunityItems,
  readCommunityNumber,
  readCommunityString,
} from "../../../../../../lib/learning/communityFoundation";
import { createDiscussionThreadAction } from "../../../../communityActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function CommunityDiscussionsPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId } = await params;
  const sp = searchParams ? await searchParams : {};
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_COMMUNITY_ROUTES.discussions(courseId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await listLearningDiscussionThreads(supabase, courseId);
  if (!loaded.ok) notFound();

  const threads = readCommunityItems(loaded.data, "threads");

  return (
    <LearningShell
      title="Discussions"
      subtitle="Course discussion threads"
      backHref={LEARNING_COMMUNITY_ROUTES.hub(courseId)}
      backLabel="Community"
    >
      <CommunityNav courseId={courseId} active="discussions" />

      {sp.error ? (
        <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">
          {sp.error}
        </p>
      ) : null}

      <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-base font-bold">Start a discussion</h2>
        <form action={createDiscussionThreadAction} className="mt-3 space-y-3">
          <input type="hidden" name="courseId" value={courseId} />
          <input
            name="title"
            required
            maxLength={200}
            placeholder="Title"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          />
          <textarea
            name="body"
            required
            rows={4}
            maxLength={20000}
            placeholder="What do you want to discuss?"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black"
          >
            Post thread
          </button>
        </form>
      </section>

      {threads.length === 0 ? (
        <p className="mt-6 text-sm text-white/55">No discussions yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {threads.map((thread) => {
            const id = readCommunityString(thread, "thread_id");
            if (!id) return null;
            return (
              <li key={id}>
                <Link
                  href={LEARNING_COMMUNITY_ROUTES.discussion(courseId, id)}
                  className="block rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-3 hover:border-white/25"
                >
                  <p className="font-bold text-white/90">
                    {readCommunityString(thread, "title")}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {readCommunityString(thread, "author_label")} ·{" "}
                    {readCommunityString(thread, "status")} ·{" "}
                    {readCommunityNumber(thread, "reply_count")} replies
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
