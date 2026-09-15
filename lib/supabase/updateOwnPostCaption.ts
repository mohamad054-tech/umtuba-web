/**
 * Owner-only caption edit for public.posts.content.
 * Authorization is enforced here AND by posts RLS / update_own_post_caption.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeUserFacingMessage } from "../../app/lib/product/userFacingMessage";
import { MAX_CAPTION_LENGTH, validateCaption } from "./videoPostsShared";

export const UPDATE_OWN_POST_CAPTION_RPC = "update_own_post_caption";

export const OWN_CAPTION_UPDATE_ERRORS = {
  authRequired: "Sign in to edit this caption.",
  notOwner: "You can only edit your own caption.",
  notFound: "This post is no longer available.",
  invalid: "Invalid caption.",
  failed: "Unable to update caption. Please try again.",
} as const;

export type UpdateOwnPostCaptionCode =
  | "auth_required"
  | "not_owner"
  | "not_found"
  | "invalid"
  | "failed";

export type UpdateOwnPostCaptionResult =
  | { ok: true; content: string }
  | { ok: false; message: string; code: UpdateOwnPostCaptionCode };

export function extractHashtagsFromCaption(caption: string): string[] {
  const matches = caption.match(/#[\p{L}\p{N}_]+/gu);
  if (!matches) {
    return [];
  }

  const unique = new Set(matches.map((tag) => tag.slice(0, 48)));
  return Array.from(unique).slice(0, 8);
}

export async function updateOwnPostCaption(
  supabase: SupabaseClient,
  userId: string,
  postId: number,
  caption: string
): Promise<UpdateOwnPostCaptionResult> {
  if (!Number.isInteger(postId) || postId <= 0) {
    return {
      ok: false,
      code: "invalid",
      message: OWN_CAPTION_UPDATE_ERRORS.invalid,
    };
  }

  const next = caption.trim();
  const check = validateCaption(next);
  if (!check.ok) {
    return {
      ok: false,
      code: "invalid",
      message: check.message,
    };
  }

  const rpc = await supabase.rpc(UPDATE_OWN_POST_CAPTION_RPC, {
    p_post_id: postId,
    p_content: next,
  });

  if (!rpc.error && typeof rpc.data === "string") {
    return { ok: true, content: rpc.data };
  }

  // RPC is not applied yet — fall back to owner RLS update of content only.
  const { data, error } = await supabase
    .from("posts")
    .update({ content: next })
    .eq("id", postId)
    .eq("user_id", userId)
    .select("content")
    .maybeSingle();

  if (error) {
    console.error("updateOwnPostCaption", rpc.error ?? error);
    return {
      ok: false,
      code: "failed",
      message: sanitizeUserFacingMessage(
        error.message,
        OWN_CAPTION_UPDATE_ERRORS.failed
      ),
    };
  }

  if (!data || typeof data.content !== "string") {
    return {
      ok: false,
      code: "not_found",
      message: OWN_CAPTION_UPDATE_ERRORS.notFound,
    };
  }

  return { ok: true, content: data.content };
}

export { MAX_CAPTION_LENGTH };
