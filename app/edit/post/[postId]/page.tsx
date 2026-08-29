import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../../lib/nav";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { createVideoSignedUrl } from "../../../../lib/supabase/videoPosts";
import {
  authorizePostEdit,
  loadOwnedPost,
  publicPostUrl,
} from "../../../../lib/posts/editOwnedPost";
import {
  coverUrlFromMediaPipeline,
  playbackEditFromMediaPipeline,
} from "../../../../lib/media/videoTrim";
import EditPostWorkspace, { type EditPostWorkspaceModel } from "../EditPostWorkspace";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ postId: string }> | { postId: string };
};

export default async function EditPostPage({ params }: PageProps) {
  const { postId: rawId } = await Promise.resolve(params);
  const postId = Number(rawId);
  if (!Number.isInteger(postId) || postId <= 0) {
    notFound();
  }

  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(`/edit/post/${postId}`)}`
    );
  }

  const supabase = await createClient();
  const post = await loadOwnedPost(supabase, user.id, postId);
  if (!post) {
    notFound();
  }

  const authz = authorizePostEdit(user.id, post.user_id);
  if (!authz.ok) {
    notFound();
  }

  let videoUrl: string | null = null;
  if (post.video_path) {
    videoUrl = await createVideoSignedUrl(supabase, post.video_path);
  }

  let articleTitle = "";
  let articleBody = "";
  if (post.article_id) {
    const { data } = await supabase
      .from("articles")
      .select("title, body")
      .eq("id", post.article_id)
      .eq("user_id", user.id)
      .maybeSingle();
    articleTitle = typeof data?.title === "string" ? data.title : "";
    articleBody = typeof data?.body === "string" ? data.body : "";
  }

  const coverUrl =
    coverUrlFromMediaPipeline(post.media_pipeline) || post.image_url;

  const model: EditPostWorkspaceModel = {
    postId: post.id,
    postType: post.post_type ?? "text",
    mediaStatus: post.media_status,
    isDraft: post.media_status === "draft",
    content: post.content ?? "",
    imageUrl: post.image_url,
    videoUrl,
    videoPath: post.video_path,
    durationMs: post.media_duration_ms,
    trim: playbackEditFromMediaPipeline(post.media_pipeline),
    coverUrl,
    articleId: post.article_id,
    articleTitle,
    articleBody,
    publicUrl: publicPostUrl(post.id),
  };

  return (
    <main
      className={`relative min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav
        title="Edit"
        subtitle={`Post ${post.id}`}
        sticky
        actions={
          <Link
            href={publicPostUrl(post.id)}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold"
          >
            Cancel
          </Link>
        }
      />
      <div className="mx-auto max-w-2xl px-5 py-8 md:px-8">
        <EditPostWorkspace model={model} />
      </div>
    </main>
  );
}
