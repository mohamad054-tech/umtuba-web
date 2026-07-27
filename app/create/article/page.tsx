import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import { createArticleMetadata } from "../../../lib/site/routeMetadata";
import { listEligibleTeaserVideos } from "../../../lib/articles/articlesFoundation";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import CreateArticleForm from "./CreateArticleForm";

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
  const [teasers, profile] = await Promise.all([
    listEligibleTeaserVideos(supabase, user.id),
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const username =
    typeof profile.data?.username === "string" ? profile.data.username : "creator";

  return (
    <main
      className={`relative min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav
        title="Create article"
        subtitle="Optional video or auto 5s teaser"
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
        <CreateArticleForm
          teasers={teasers}
          authorUsername={username}
          errorMessage={query.error ?? null}
        />
      </div>
    </main>
  );
}
