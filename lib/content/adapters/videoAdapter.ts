/**
 * Video/Post adapter — independent ready videos only (no article_id).
 * Article teasers are discovery surfaces for articles, not separate video items.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_ROUTES } from "../../../app/lib/nav/routes";
import {
  deactivateContentRegistryItem,
  isIndependentVideoPost,
  sourceEntityIdFromPostId,
  upsertContentRegistryItem,
  type ContentAdapter,
  type ContentAdapterResult,
  type ContentRegistryRow,
  type ProfileContentCard,
} from "../contentRegistry";

async function loadVideoPost(
  supabase: SupabaseClient,
  postId: number
): Promise<{
  id: number;
  user_id: string;
  content: string | null;
  article_id: string | null;
  media_status: string | null;
  video_path: string | null;
  post_type: string | null;
  created_at: string;
} | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, user_id, content, article_id, media_status, video_path, post_type, created_at"
    )
    .eq("id", postId)
    .maybeSingle();
  if (error || !data) return null;
  return data as {
    id: number;
    user_id: string;
    content: string | null;
    article_id: string | null;
    media_status: string | null;
    video_path: string | null;
    post_type: string | null;
    created_at: string;
  };
}

function watchHref(postId: number): string {
  return `${APP_ROUTES.watch}?post=${postId}`;
}

async function syncVideo(
  supabase: SupabaseClient,
  sourceEntityId: string
): Promise<ContentAdapterResult<ContentRegistryRow>> {
  const postId = Number(sourceEntityId);
  if (!Number.isInteger(postId) || postId <= 0) {
    return { ok: false, message: "Invalid video id." };
  }
  const post = await loadVideoPost(supabase, postId);
  if (!post) {
    return { ok: false, message: "Video not found." };
  }
  if (post.post_type !== "video") {
    return { ok: false, message: "Not a video post." };
  }
  // Teaser of an article → do not register as independent video content.
  if (!isIndependentVideoPost(post)) {
    await deactivateContentRegistryItem(
      supabase,
      "video",
      sourceEntityIdFromPostId(post.id)
    );
    return { ok: false, message: "Video is bound to an article teaser." };
  }

  const ready =
    post.media_status === "ready" &&
    typeof post.video_path === "string" &&
    post.video_path.trim().length > 0;

  if (!ready) {
    await deactivateContentRegistryItem(
      supabase,
      "video",
      sourceEntityIdFromPostId(post.id)
    );
    return { ok: false, message: "Video not ready for registry." };
  }

  return upsertContentRegistryItem(supabase, {
    contentKind: "video",
    sourceEntityId: sourceEntityIdFromPostId(post.id),
    ownerUserId: post.user_id,
    visibility: "public",
    publishState: "published",
    canonicalHref: watchHref(post.id),
    discoveryPostId: post.id,
    title: (post.content || "Video").slice(0, 300),
    publishedAt: post.created_at,
  });
}

export const videoContentAdapter: ContentAdapter = {
  kind: "video",

  register: syncVideo,
  sync: syncVideo,

  resolveProfileCard(row: ContentRegistryRow): ProfileContentCard {
    return {
      registryId: row.id,
      kind: "video",
      sourceEntityId: row.source_entity_id,
      title: row.title || "Video",
      href: row.canonical_href,
      publishedAt: row.published_at,
      discoveryPostId: row.discovery_post_id,
    };
  },

  resolveCanonicalHref(sourceEntityId: string): string {
    const id = Number(sourceEntityId);
    return Number.isInteger(id) && id > 0
      ? watchHref(id)
      : APP_ROUTES.watch;
  },

  async resolveDiscoveryPost(supabase, sourceEntityId) {
    const post = await loadVideoPost(supabase, Number(sourceEntityId));
    if (!post || !isIndependentVideoPost(post)) return null;
    if (post.media_status !== "ready" || !post.video_path) return null;
    return post.id;
  },

  resolveVisibility() {
    return "public";
  },

  async unpublish(supabase, sourceEntityId) {
    return deactivateContentRegistryItem(supabase, "video", sourceEntityId);
  },
};
