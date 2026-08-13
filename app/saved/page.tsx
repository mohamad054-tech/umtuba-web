import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../components/AppTopNav";
import { loadSavedPostsAction } from "../actions/socialInteractions";
import { savedMetadata } from "../../lib/site/routeMetadata";
import { getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";
import type { Post, PostType } from "../data/types/post";
import SavedExperience from "./SavedExperience";

export const metadata = savedMetadata;
export const dynamic = "force-dynamic";

const validPostTypes: PostType[] = [
  "text",
  "image",
  "video",
  "poll",
  "question",
  "challenge",
  "idea",
  "opportunity",
];

function formatCreatedAt(createdAt: string) {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const differenceInMinutes = Math.floor(
    (now.getTime() - createdDate.getTime()) / 60000
  );

  if (differenceInMinutes < 1) {
    return "Just now";
  }

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes} min ago`;
  }

  const differenceInHours = Math.floor(differenceInMinutes / 60);

  if (differenceInHours < 24) {
    return `${differenceInHours} hr ago`;
  }

  const differenceInDays = Math.floor(differenceInHours / 24);
  return `${differenceInDays} day${differenceInDays === 1 ? "" : "s"} ago`;
}

export default async function SavedPage() {
  let userId: string | null = null;

  try {
    const user = await getServerUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.saved)}`);
  }

  const result = await loadSavedPostsAction();

  const initialPosts: Post[] =
    result.ok
      ? result.posts.map((databasePost) => {
          const postType = validPostTypes.includes(
            databasePost.post_type as PostType
          )
            ? (databasePost.post_type as PostType)
            : "text";

          return {
            id: databasePost.id,
            ownerUserId: databasePost.user_id,
            author: {
              name: databasePost.author_name,
              username: databasePost.author_username,
              avatar: databasePost.author_avatar,
            },
            type: postType,
            content: databasePost.content,
            image: databasePost.image_url ?? undefined,
            video: databasePost.video_url ?? undefined,
            likes: databasePost.likes,
            comments: databasePost.comments,
            shares: databasePost.shares,
            saves: databasePost.saves,
            views: databasePost.views,
            likedByMe: databasePost.likedByMe,
            savedByMe: databasePost.savedByMe,
            createdAt: formatCreatedAt(databasePost.created_at),
          };
        })
      : [];

  const loadError = result.ok ? null : result.message;

  return (
    <main className="min-h-screen bg-[#050510] text-white max-sm:pb-[var(--app-mobile-bottom-nav-offset,0px)]">
      <AppTopNav
        title="Saved"
        subtitle="Your bookmarks"
        actions={
          <Link
            href={APP_ROUTES.discover}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10"
          >
            Discover
          </Link>
        }
      />
      <SavedExperience
        initialPosts={initialPosts}
        viewerId={userId}
        loadError={loadError}
      />
    </main>
  );
}
