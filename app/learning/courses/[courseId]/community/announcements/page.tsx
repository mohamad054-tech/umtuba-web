import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import CommunityNav from "../../../../../components/learning/CommunityNav";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_COMMUNITY_ROUTES,
  listLearningAnnouncements,
  readCommunityBoolean,
  readCommunityItems,
  readCommunityString,
} from "../../../../../../lib/learning/communityFoundation";
import {
  archiveAnnouncementAction,
  pinAnnouncementAction,
  publishAnnouncementAction,
  removeAnnouncementAction,
} from "../../../../communityActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ error?: string; published?: string }>;
};

export default async function CommunityAnnouncementsPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId } = await params;
  const sp = searchParams ? await searchParams : {};
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_COMMUNITY_ROUTES.announcements(courseId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await listLearningAnnouncements(supabase, courseId);
  if (!loaded.ok) notFound();

  const announcements = readCommunityItems(loaded.data, "announcements");

  return (
    <LearningShell
      title="Announcements"
      subtitle="Instructor updates for this course"
      backHref={LEARNING_COMMUNITY_ROUTES.hub(courseId)}
      backLabel="Community"
    >
      <CommunityNav courseId={courseId} active="announcements" />

      {sp.error ? (
        <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">
          {sp.error}
        </p>
      ) : null}
      {sp.published ? (
        <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          Announcement published.
        </p>
      ) : null}

      <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-base font-bold">Publish announcement</h2>
        <p className="mt-1 text-xs text-white/45">
          Instructor/staff only. Learners can read published items.
        </p>
        <form action={publishAnnouncementAction} className="mt-3 space-y-3">
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
            placeholder="Announcement body"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" name="pinned" value="1" />
            Pin to top
          </label>
          <button
            type="submit"
            className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black"
          >
            Publish
          </button>
        </form>
      </section>

      {announcements.length === 0 ? (
        <p className="mt-6 text-sm text-white/55">No announcements yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {announcements.map((row) => {
            const id = readCommunityString(row, "announcement_id");
            if (!id) return null;
            const pinned = readCommunityBoolean(row, "pinned");
            return (
              <li
                key={id}
                className="rounded-2xl border border-white/10 bg-[#080816]/60 p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                  {pinned ? "Pinned · " : ""}
                  {readCommunityString(row, "status")}
                </p>
                <h3 className="mt-1 text-lg font-bold text-white/90">
                  {readCommunityString(row, "title")}
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">
                  {readCommunityString(row, "body")}
                </p>
                <p className="mt-2 text-xs text-white/35">
                  {readCommunityString(row, "author_label")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <form action={pinAnnouncementAction}>
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="announcementId" value={id} />
                    <input
                      type="hidden"
                      name="pinned"
                      value={pinned ? "0" : "1"}
                    />
                    <button
                      type="submit"
                      className="rounded border border-white/20 px-2 py-1 font-bold text-white/75"
                    >
                      {pinned ? "Unpin" : "Pin"}
                    </button>
                  </form>
                  <form action={archiveAnnouncementAction}>
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="announcementId" value={id} />
                    <button
                      type="submit"
                      className="rounded border border-white/20 px-2 py-1 font-bold text-white/75"
                    >
                      Archive
                    </button>
                  </form>
                  <form action={removeAnnouncementAction}>
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="announcementId" value={id} />
                    <button
                      type="submit"
                      className="rounded border border-rose-400/40 px-2 py-1 font-bold text-rose-100"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </LearningShell>
  );
}
