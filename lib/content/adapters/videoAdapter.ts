/**
 * Video adapter — independent ready videos only; uses Content Services V2.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isIndependentVideoPost,
  parsePostIdFromSource,
  sourceEntityIdFromPostId,
  type ContentAdapterResult,
  type ContentRegistryRow,
  type ProfileContentCard,
} from "../contentRegistry";
import type { DomainContentAdapter } from "../runtime/adapterRuntime";
import { buildCanonicalHref } from "../services/canonicalLinkService";
import {
  deactivateContentLifecycle,
  syncContentLifecycle,
} from "../services/lifecycleService";

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
  if (!Number.isInteger(postId) || postId <= 0) return null;
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

async function validateVideoSource(
  supabase: SupabaseClient,
  sourceEntityId: string
) {
  const postId = parsePostIdFromSource(sourceEntityId);
  if (postId == null) {
    return { ok: false as const, message: "Invalid video id." };
  }
  const post = await loadVideoPost(supabase, postId);
  if (!post) {
    return { ok: false as const, message: "Video not found." };
  }
  if (post.post_type !== "video") {
    return { ok: false as const, message: "Not a video post." };
  }
  if (!isIndependentVideoPost(post)) {
    await deactivateContentLifecycle(
      supabase,
      "video",
      sourceEntityIdFromPostId(post.id),
      post.user_id
    );
    return {
      ok: false as const,
      message: "Video is bound to an article teaser.",
    };
  }
  const ready =
    post.media_status === "ready" &&
    typeof post.video_path === "string" &&
    post.video_path.trim().length > 0;
  if (!ready) {
    await deactivateContentLifecycle(
      supabase,
      "video",
      sourceEntityIdFromPostId(post.id),
      post.user_id
    );
    return { ok: false as const, message: "Video not ready for registry." };
  }
  return {
    ok: true as const,
    data: {
      ownerUserId: post.user_id,
      publishState: "published" as const,
      visibilityHint: "public",
      title: (post.content || "Video").slice(0, 300),
      publishedAt: post.created_at,
      discoveryPostId: post.id,
    },
  };
}

async function syncVideo(
  supabase: SupabaseClient,
  sourceEntityId: string
): Promise<ContentAdapterResult<ContentRegistryRow>> {
  const validated = await validateVideoSource(supabase, sourceEntityId);
  if (!validated.ok) return validated;

  const href = buildCanonicalHref("video", sourceEntityId);
  if (!href.ok) return href;

  return syncContentLifecycle(supabase, {
    contentKind: "video",
    sourceEntityId: sourceEntityIdFromPostId(Number(sourceEntityId)),
    ownerUserId: validated.data.ownerUserId,
    publishState: validated.data.publishState,
    visibilityHint: validated.data.visibilityHint,
    title: validated.data.title,
    publishedAt: validated.data.publishedAt,
    discoveryPostId: validated.data.discoveryPostId,
    canonicalHref: href.href,
  });
}

export const videoContentAdapter: DomainContentAdapter = {
  kind: "video",
  validateSource: validateVideoSource,
  resolveOwner: (snapshot) => snapshot.ownerUserId,
  resolvePublishState: (snapshot) => snapshot.publishState,
  resolveVisibilityHint: (snapshot) => snapshot.visibilityHint,
  register: syncVideo,
  sync: syncVideo,
  resolveProfileCard(row): ProfileContentCard {
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
    const href = buildCanonicalHref("video", sourceEntityId);
    return href.ok ? href.href : "/watch";
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
    const post = await loadVideoPost(supabase, Number(sourceEntityId));
    return deactivateContentLifecycle(
      supabase,
      "video",
      sourceEntityId,
      post?.user_id ?? null
    );
  },
};
