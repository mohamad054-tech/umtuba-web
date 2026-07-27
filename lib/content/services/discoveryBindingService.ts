/**
 * Discovery Binding Service — bind ready posts as discovery surfaces.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isIndependentVideoPost,
  setContentRegistryDiscoveryPost,
  type ContentAdapterResult,
  type ContentKind,
} from "../contentRegistry";
import { emitContentHook } from "./hookContracts";

export type DiscoveryPostSnapshot = {
  id: number;
  user_id: string;
  article_id: string | null;
  post_type: string | null;
  media_status: string | null;
  video_path: string | null;
};

export async function loadDiscoveryPost(
  supabase: SupabaseClient,
  postId: number
): Promise<DiscoveryPostSnapshot | null> {
  if (!Number.isInteger(postId) || postId <= 0) return null;
  const { data, error } = await supabase
    .from("posts")
    .select("id, user_id, article_id, post_type, media_status, video_path")
    .eq("id", postId)
    .maybeSingle();
  if (error || !data) return null;
  return data as DiscoveryPostSnapshot;
}

export function isPubliclyReadyDiscoveryPost(
  post: DiscoveryPostSnapshot
): boolean {
  return (
    post.post_type === "video" &&
    post.media_status === "ready" &&
    typeof post.video_path === "string" &&
    post.video_path.trim().length > 0
  );
}

/**
 * Validate a discovery post for binding to a content item.
 * - owner must match
 * - must be ready video
 * - article content may bind a post with matching article_id (or null then linked later)
 * - video content may only bind the same independent post id
 */
export function validateDiscoveryBinding(input: {
  contentKind: ContentKind;
  sourceEntityId: string;
  ownerUserId: string;
  post: DiscoveryPostSnapshot;
}): ContentAdapterResult<DiscoveryPostSnapshot> {
  const { contentKind, sourceEntityId, ownerUserId, post } = input;

  if (post.user_id !== ownerUserId) {
    return { ok: false, message: "Discovery post owner mismatch." };
  }
  if (!isPubliclyReadyDiscoveryPost(post)) {
    return { ok: false, message: "Discovery post is not ready." };
  }

  if (contentKind === "article") {
    if (
      post.article_id != null &&
      String(post.article_id) !== sourceEntityId
    ) {
      return { ok: false, message: "Discovery post belongs to another article." };
    }
    return { ok: true, data: post };
  }

  if (contentKind === "video") {
    if (!isIndependentVideoPost(post)) {
      return {
        ok: false,
        message: "Article teaser cannot register as independent video.",
      };
    }
    if (String(post.id) !== sourceEntityId) {
      return { ok: false, message: "Video discovery post id mismatch." };
    }
    return { ok: true, data: post };
  }

  return { ok: false, message: "Unsupported content kind." };
}

export async function bindDiscoveryPost(
  supabase: SupabaseClient,
  input: {
    contentKind: ContentKind;
    sourceEntityId: string;
    ownerUserId: string;
    discoveryPostId: number;
  }
): Promise<ContentAdapterResult<{ discoveryPostId: number }>> {
  const post = await loadDiscoveryPost(supabase, input.discoveryPostId);
  if (!post) {
    return { ok: false, message: "Discovery post not found." };
  }
  const validated = validateDiscoveryBinding({
    contentKind: input.contentKind,
    sourceEntityId: input.sourceEntityId,
    ownerUserId: input.ownerUserId,
    post,
  });
  if (!validated.ok) return validated;

  const linked = await setContentRegistryDiscoveryPost(
    supabase,
    input.contentKind,
    input.sourceEntityId,
    post.id
  );
  if (linked.ok) {
    emitContentHook({
      type: "onDiscoveryReady",
      contentKind: input.contentKind,
      sourceEntityId: input.sourceEntityId,
      ownerUserId: input.ownerUserId,
      discoveryPostId: post.id,
      at: new Date().toISOString(),
    });
  }
  return linked;
}

export async function resolveReadyDiscoveryPostId(
  supabase: SupabaseClient,
  input: {
    contentKind: ContentKind;
    sourceEntityId: string;
    ownerUserId: string;
    candidatePostId: number | null;
  }
): Promise<number | null> {
  if (input.candidatePostId == null) return null;
  const post = await loadDiscoveryPost(supabase, input.candidatePostId);
  if (!post) return null;
  const validated = validateDiscoveryBinding({
    contentKind: input.contentKind,
    sourceEntityId: input.sourceEntityId,
    ownerUserId: input.ownerUserId,
    post,
  });
  return validated.ok ? post.id : null;
}
