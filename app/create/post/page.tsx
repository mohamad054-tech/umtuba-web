import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import { createPostMetadata } from "../../../lib/site/routeMetadata";
import { getServerUser } from "../../../lib/supabase/server";
import CreatePostForm from "./CreatePostForm";

export const metadata = createPostMetadata;
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ image?: string }> | { image?: string };
};

export default async function CreatePostPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams ?? {});
  const imageIntent = query.image === "1" || query.image === "true";
  const user = await getServerUser();

  if (!user) {
    const next = imageIntent
      ? `${APP_ROUTES.createPost}?image=1`
      : APP_ROUTES.createPost;
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(next)}`);
  }

  return (
    <main
      className={`relative min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav
        title={imageIntent ? "Share an image" : "Write Post"}
        subtitle={
          imageIntent
            ? "Photo with an optional caption"
            : "Text-only, or add an image"
        }
        sticky
        actions={
          <Link
            href={APP_ROUTES.create}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold"
          >
            Back to Create
          </Link>
        }
      />
      <div className="mx-auto max-w-2xl px-5 py-8 md:px-8">
        <CreatePostForm variant="page" imageIntent={imageIntent} />
      </div>
    </main>
  );
}
