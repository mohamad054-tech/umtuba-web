import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../components/AppTopNav";
import { publishArticleAction } from "../../actions/articles";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import { createArticleMetadata } from "../../../lib/site/routeMetadata";
import { listEligibleTeaserVideos } from "../../../lib/articles/articlesFoundation";
import { createClient, getServerUser } from "../../../lib/supabase/server";

export const metadata = createArticleMetadata;
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?:
    | Promise<{ error?: string }>
    | { error?: string };
};

export default async function CreateArticlePage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.createArticle)}`
    );
  }

  const supabase = await createClient();
  const teasers = await listEligibleTeaserVideos(supabase, user.id);

  return (
    <main
      className={`relative min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav
        title="Create article"
        subtitle="Optional short teaser video"
        sticky
        actions={
          <Link
            href={APP_ROUTES.createVideo}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold"
          >
            Upload video first
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl px-5 py-8 md:px-8">
        {query.error ? (
          <p role="alert" className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {query.error}
          </p>
        ) : null}

        <form action={publishArticleAction} className="space-y-4 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <label className="block text-sm text-white/70">
            Title
            <input
              name="title"
              required
              maxLength={200}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
              placeholder="Article title"
            />
          </label>
          <label className="block text-sm text-white/70">
            Full article
            <textarea
              name="body"
              required
              rows={12}
              maxLength={50000}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
              placeholder="Write the full article…"
            />
          </label>
          <label className="block text-sm text-white/70">
            Teaser video (optional)
            <select
              name="teaserPostId"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
              defaultValue=""
            >
              <option value="">No teaser — article only</option>
              {teasers.map((video) => (
                <option key={video.id} value={video.id}>
                  #{video.id} · {video.caption.slice(0, 60)}
                </option>
              ))}
            </select>
          </label>
          {teasers.length === 0 ? (
            <p className="text-xs text-white/45">
              No ready videos without an article link yet. Upload a short clip
              first, then attach it here as a teaser.
            </p>
          ) : null}
          <button
            type="submit"
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            Publish article
          </button>
        </form>
      </div>
    </main>
  );
}
