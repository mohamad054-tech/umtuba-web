import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../../../components/learning/LearningShell";
import CommunityNav from "../../../../../../components/learning/CommunityNav";
import { createClient, getServerUser } from "../../../../../../../lib/supabase/server";
import {
  LEARNING_COMMUNITY_ROUTES,
  getLearningDiscussionThread,
  readCommunityItems,
  readCommunityString,
} from "../../../../../../../lib/learning/communityFoundation";
import {
  archiveDiscussionThreadAction,
  editDiscussionThreadAction,
  lockDiscussionThreadAction,
  replyToDiscussionAction,
  softDeleteDiscussionReplyAction,
  softDeleteDiscussionThreadAction,
} from "../../../../../communityActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string; threadId: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function CommunityDiscussionThreadPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId, threadId } = await params;
  const sp = searchParams ? await searchParams : {};
  const user = await getServerUser();
  const path = LEARNING_COMMUNITY_ROUTES.discussion(courseId, threadId);
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);

  const supabase = await createClient();
  const loaded = await getLearningDiscussionThread(supabase, threadId);
  if (!loaded.ok) notFound();

  const thread = loaded.data;
  const replies = readCommunityItems(thread, "replies");
  const status = readCommunityString(thread, "status") ?? "open";
  const canReply = status === "open";

  return (
    <LearningShell
      title={readCommunityString(thread, "title") ?? "Discussion"}
      subtitle={`Status: ${status}`}
      backHref={LEARNING_COMMUNITY_ROUTES.discussions(courseId)}
      backLabel="Discussions"
    >
      <CommunityNav courseId={courseId} active="discussions" />

      {sp.error ? (
        <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">
          {sp.error}
        </p>
      ) : null}

      <article className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs text-white/40">
          {readCommunityString(thread, "author_label")}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
          {readCommunityString(thread, "body")}
        </p>
      </article>

      <section className="mt-4 flex flex-wrap gap-2 text-sm">
        <form action={lockDiscussionThreadAction}>
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="threadId" value={threadId} />
          <input type="hidden" name="locked" value={status === "locked" ? "0" : "1"} />
          <button
            type="submit"
            className="rounded-lg border border-white/20 px-3 py-1.5 font-bold text-white/80"
          >
            {status === "locked" ? "Unlock" : "Lock"}
          </button>
        </form>
        <form action={archiveDiscussionThreadAction}>
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="threadId" value={threadId} />
          <button
            type="submit"
            className="rounded-lg border border-white/20 px-3 py-1.5 font-bold text-white/80"
          >
            Archive
          </button>
        </form>
        <form action={softDeleteDiscussionThreadAction}>
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="threadId" value={threadId} />
          <button
            type="submit"
            className="rounded-lg border border-rose-400/40 px-3 py-1.5 font-bold text-rose-100"
          >
            Remove
          </button>
        </form>
      </section>

      {status === "open" ? (
        <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-bold">Edit thread</h2>
          <form action={editDiscussionThreadAction} className="mt-3 space-y-3">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="threadId" value={threadId} />
            <input
              name="title"
              required
              defaultValue={readCommunityString(thread, "title") ?? ""}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            />
            <textarea
              name="body"
              required
              rows={3}
              defaultValue={readCommunityString(thread, "body") ?? ""}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-bold text-black"
            >
              Save edits
            </button>
          </form>
        </section>
      ) : null}

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-bold">Replies</h2>
        {replies.length === 0 ? (
          <p className="text-sm text-white/50">No replies yet.</p>
        ) : (
          replies.map((reply) => {
            const replyId = readCommunityString(reply, "reply_id");
            if (!replyId) return null;
            const replyStatus = readCommunityString(reply, "status");
            return (
              <div
                key={replyId}
                className="rounded-xl border border-white/10 bg-[#080816]/50 p-3"
              >
                <p className="text-xs text-white/40">
                  {readCommunityString(reply, "author_label")}
                  {replyStatus === "removed" ? " · removed" : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">
                  {readCommunityString(reply, "body") ?? "[removed]"}
                </p>
                {replyStatus === "visible" ? (
                  <form action={softDeleteDiscussionReplyAction} className="mt-2">
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="threadId" value={threadId} />
                    <input type="hidden" name="replyId" value={replyId} />
                    <button
                      type="submit"
                      className="text-xs font-bold text-rose-200/80 underline"
                    >
                      Remove reply
                    </button>
                  </form>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      {canReply ? (
        <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-bold">Reply</h2>
          <form action={replyToDiscussionAction} className="mt-3 space-y-3">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="threadId" value={threadId} />
            <textarea
              name="body"
              required
              rows={3}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black"
            >
              Post reply
            </button>
          </form>
        </section>
      ) : (
        <p className="mt-6 text-sm text-white/50">This thread is closed for replies.</p>
      )}
    </LearningShell>
  );
}
