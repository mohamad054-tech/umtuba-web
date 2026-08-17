import { createClient } from "./server";
import type { PublicVideoSeoInput } from "../site/videoSeo";
import { VIDEO_SITEMAP_LIMIT } from "../site/videoSeo";

const SEO_POST_COLUMNS =
  "id, content, created_at, media_duration_ms, author_name, author_username, article_id, post_type, media_status, video_path";

type SeoPostRow = {
  id: number;
  content: string | null;
  created_at: string;
  media_duration_ms: number | null;
  author_name: string | null;
  author_username: string | null;
  article_id?: string | null;
  post_type: string | null;
  media_status: string | null;
  video_path: string | null;
};

function isPublicEligibleVideo(row: SeoPostRow): boolean {
  if (row.post_type !== "video") return false;
  if (row.media_status !== "ready") return false;
  const path = typeof row.video_path === "string" ? row.video_path.trim() : "";
  return Boolean(path);
}

function mapRow(row: SeoPostRow): PublicVideoSeoInput {
  return {
    id: row.id,
    caption: typeof row.content === "string" ? row.content : null,
    createdAt: row.created_at,
    durationMs:
      typeof row.media_duration_ms === "number" && row.media_duration_ms > 0
        ? row.media_duration_ms
        : null,
    authorName: row.author_name,
    authorUsername: row.author_username,
    articleTitle: null,
  };
}

/**
 * Public-eligible video metadata only.
 * Never mints signed playback URLs. RLS hides private/unreadable rows.
 */
export async function loadPublicVideoSeoById(
  postId: number
): Promise<PublicVideoSeoInput | null> {
  if (!Number.isInteger(postId) || postId <= 0) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts")
      .select(SEO_POST_COLUMNS)
      .eq("id", postId)
      .eq("post_type", "video")
      .eq("media_status", "ready")
      .not("video_path", "is", null)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as unknown as SeoPostRow;
    if (!isPublicEligibleVideo(row)) return null;
    return mapRow(row);
  } catch (error) {
    console.error("loadPublicVideoSeoById failed:", error);
    return null;
  }
}

/** Bounded public video list for the video sitemap. Chronological, no ranking. */
export async function listPublicVideosForSitemap(
  limit = VIDEO_SITEMAP_LIMIT
): Promise<PublicVideoSeoInput[]> {
  const capped = Math.min(Math.max(limit, 1), VIDEO_SITEMAP_LIMIT);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts")
      .select(SEO_POST_COLUMNS)
      .eq("post_type", "video")
      .eq("media_status", "ready")
      .not("video_path", "is", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(capped);

    if (error) {
      console.error("listPublicVideosForSitemap failed:", error);
      return [];
    }

    return ((data ?? []) as unknown as SeoPostRow[])
      .filter(isPublicEligibleVideo)
      .map(mapRow);
  } catch (error) {
    console.error("listPublicVideosForSitemap failed:", error);
    return [];
  }
}
