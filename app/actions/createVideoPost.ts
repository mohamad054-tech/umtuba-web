"use server";

import { sanitizeUserFacingMessage } from "../lib/product/userFacingMessage";
import { getServerUser, createClient } from "../../lib/supabase/server";
import {
  deleteOwnedVideoObject,
  insertVideoPostForUser,
  type CreateVideoPostInput,
} from "../../lib/supabase/videoPosts";
import type { MediaMetadata } from "../../lib/media/pipelineTypes";
import type { VideoOverlayElement } from "../../lib/media/videoOverlays";

export type CreateVideoPostActionResult =
  | { ok: true; postId: number }
  | {
      ok: false;
      message: string;
      code?: "auth_required" | "publish_failed";
      videoPath?: string;
    };

export type CreateVideoPostActionInput = {
  caption: string;
  videoPath: string;
  mimeType: string;
  byteSize: number;
  metadata?: Partial<MediaMetadata> | null;
  /** Pre-publish overlay composition (text + stickers). Sanitized server-side. */
  overlays?: VideoOverlayElement[] | null;
  uploadStartedAt?: string | null;
};

/**
 * Authoritative create path: re-validates metadata, verifies the owned object,
 * runs Media Pipeline V1 (queued → processing → ready), and deletes the
 * storage object on any failure.
 */
export async function createVideoPostAction(
  input: CreateVideoPostActionInput
): Promise<CreateVideoPostActionResult> {
  const videoPath =
    typeof input.videoPath === "string" ? input.videoPath.trim() : "";
  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      code: "auth_required",
      videoPath: videoPath || undefined,
      message: "Please sign in to publish a video.",
    };
  }

  const supabase = await createClient();

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, username, avatar_initial")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("createVideoPostAction profile error:", profileError);
      await deleteOwnedVideoObject(supabase, user.id, videoPath);
      return {
        ok: false,
        code: "publish_failed",
        message: "Unable to load your profile. Please try again.",
      };
    }

    if (!profile) {
      await deleteOwnedVideoObject(supabase, user.id, videoPath);
      return {
        ok: false,
        code: "publish_failed",
        message: "Unable to load your profile. Please try again.",
      };
    }

    const payload: CreateVideoPostInput = {
      caption: typeof input.caption === "string" ? input.caption : "",
      videoPath,
      mimeType: typeof input.mimeType === "string" ? input.mimeType : "",
      byteSize:
        typeof input.byteSize === "number" && Number.isFinite(input.byteSize)
          ? input.byteSize
          : 0,
      metadata: input.metadata ?? null,
      overlays: input.overlays ?? null,
      uploadStartedAt: input.uploadStartedAt ?? null,
    };

    const post = await insertVideoPostForUser(
      supabase,
      user.id,
      {
        full_name: profile.full_name,
        username: profile.username,
        avatar_initial: profile.avatar_initial,
      },
      payload
    );

    return { ok: true, postId: post.id };
  } catch (error) {
    console.error("createVideoPostAction failed:", error);

    await deleteOwnedVideoObject(supabase, user.id, videoPath);

    const message = sanitizeUserFacingMessage(
      error instanceof Error ? error.message : null,
      "Unable to create the video post. Please try again."
    );

    return { ok: false, code: "publish_failed", message };
  }
}
