/**
 * Account-deletion media purge — post-videos for that user only.
 * Never touches another user's prefix. Dry-run capable.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "../../app/lib/nav";
import {
  isOwnedVideoPath,
  POST_VIDEOS_BUCKET,
} from "../supabase/videoPostsShared";
import { collectOwnedMediaPaths } from "../media/ugc/ugcVideoPaths";
import { referencedUgcPaths } from "../media/ugc/ugcVideoPipeline";

export type AccountMediaPurgeMode = "dry-run" | "apply";

export type AccountMediaPurgeResult = {
  ok: true;
  userId: string;
  mode: AccountMediaPurgeMode;
  candidatePaths: string[];
  deletedPaths: string[];
  refusedPaths: string[];
};

export function assertOwnedAccountMediaPaths(
  userId: string,
  paths: string[]
): { allowed: string[]; refused: string[] } {
  const allowed: string[] = [];
  const refused: string[] = [];
  const seen = new Set<string>();
  for (const raw of paths) {
    const path = raw.replace(/^\/+/, "").trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    if (isOwnedVideoPath(userId, path)) {
      allowed.push(path);
    } else {
      refused.push(path);
    }
  }
  return { allowed, refused };
}

async function listUserPostVideoPrefix(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(POST_VIDEOS_BUCKET)
    .list(userId, { limit: 1000, offset: 0 });
  if (error || !data) {
    return [];
  }
  const paths: string[] = [];
  for (const item of data) {
    const name = (item.name ?? "").trim();
    if (!name) continue;
    if (item.id == null) {
      const nested = await supabase.storage
        .from(POST_VIDEOS_BUCKET)
        .list(`${userId}/${name}`, { limit: 1000, offset: 0 });
      for (const child of nested.data ?? []) {
        const childName = (child.name ?? "").trim();
        if (childName && child.id != null) {
          paths.push(`${userId}/${name}/${childName}`);
        }
      }
      continue;
    }
    paths.push(`${userId}/${name}`);
  }
  return paths;
}

export async function collectUserPostVideoPaths(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data: rows } = await supabase
    .from("posts")
    .select("video_path, thumbnail_path, media_pipeline")
    .eq("user_id", userId)
    .eq("post_type", "video");

  const fromPosts = collectOwnedMediaPaths(
    userId,
    (rows ?? []).flatMap((row) =>
      referencedUgcPaths({
        videoPath: row.video_path,
        thumbnailPath: row.thumbnail_path,
        pipeline: row.media_pipeline,
      })
    )
  );
  const fromBucket = await listUserPostVideoPrefix(supabase, userId);
  return assertOwnedAccountMediaPaths(userId, [...fromPosts, ...fromBucket])
    .allowed;
}

export async function purgeUserPostVideos(
  supabase: SupabaseClient,
  userId: string,
  mode: AccountMediaPurgeMode = "dry-run"
): Promise<AccountMediaPurgeResult | { ok: false; message: string }> {
  if (!isUuid(userId)) {
    return { ok: false, message: "Invalid user id." };
  }

  const candidatePaths = await collectUserPostVideoPaths(supabase, userId);
  const { allowed, refused } = assertOwnedAccountMediaPaths(
    userId,
    candidatePaths
  );
  const deletedPaths: string[] = [];

  if (mode === "apply" && allowed.length > 0) {
    const { error } = await supabase.storage
      .from(POST_VIDEOS_BUCKET)
      .remove(allowed);
    if (!error) {
      deletedPaths.push(...allowed);
    }
  }

  return {
    ok: true,
    userId,
    mode,
    candidatePaths: allowed,
    deletedPaths,
    refusedPaths: refused,
  };
}
