import type { SupabaseClient } from "@supabase/supabase-js";
import { POST_VIDEOS_BUCKET } from "../../supabase/videoPostsShared";
import { referencedUgcPaths } from "./ugcVideoPipeline";

export type OrphanCleanupMode = "dry-run" | "apply";

export type OrphanCleanupResult = {
  mode: OrphanCleanupMode;
  referencedCount: number;
  objectCount: number;
  orphanPaths: string[];
  deletedPaths: string[];
  skippedReferenced: string[];
};

export function findOrphanObjectPaths(
  objectPaths: string[],
  referencedPaths: string[]
): { orphans: string[]; skippedReferenced: string[] } {
  const referenced = new Set(
    referencedPaths.map((path) => path.replace(/^\/+/, "").trim()).filter(Boolean)
  );
  const orphans: string[] = [];
  const skippedReferenced: string[] = [];
  const seen = new Set<string>();

  for (const raw of objectPaths) {
    const path = raw.replace(/^\/+/, "").trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    if (referenced.has(path)) {
      skippedReferenced.push(path);
      continue;
    }
    orphans.push(path);
  }

  return { orphans, skippedReferenced };
}

export function collectReferencedPostVideoPaths(
  rows: Array<{
    video_path?: string | null;
    thumbnail_path?: string | null;
    media_pipeline?: unknown;
  }>
): string[] {
  const unique = new Set<string>();
  for (const row of rows) {
    for (const path of referencedUgcPaths({
      videoPath: row.video_path,
      thumbnailPath: row.thumbnail_path,
      pipeline: row.media_pipeline,
    })) {
      unique.add(path.replace(/^\/+/, ""));
    }
  }
  return [...unique];
}

async function listAllPostVideoObjects(
  supabase: SupabaseClient
): Promise<string[]> {
  const paths: string[] = [];
  const queue: string[] = [""];

  while (queue.length > 0) {
    const prefix = queue.shift() ?? "";
    const { data, error } = await supabase.storage
      .from(POST_VIDEOS_BUCKET)
      .list(prefix, { limit: 1000, offset: 0 });
    if (error || !data) {
      break;
    }
    for (const item of data) {
      const name = (item.name ?? "").trim();
      if (!name) continue;
      const full = prefix ? `${prefix}/${name}` : name;
      const isFolder =
        item.id == null ||
        (typeof item.metadata === "object" &&
          item.metadata != null &&
          !("size" in (item.metadata as Record<string, unknown>)));
      if (isFolder && item.id == null) {
        queue.push(full);
        continue;
      }
      paths.push(full);
    }
  }

  return paths;
}

export async function planOrphanPostVideoCleanup(
  supabase: SupabaseClient
): Promise<Omit<OrphanCleanupResult, "deletedPaths" | "mode">> {
  const { data: rows, error } = await supabase
    .from("posts")
    .select("video_path, thumbnail_path, media_pipeline")
    .eq("post_type", "video");

  if (error) {
    throw new Error("Unable to load post video references.");
  }

  const referenced = collectReferencedPostVideoPaths(rows ?? []);
  const objects = await listAllPostVideoObjects(supabase);
  const { orphans, skippedReferenced } = findOrphanObjectPaths(objects, referenced);

  return {
    referencedCount: referenced.length,
    objectCount: objects.length,
    orphanPaths: orphans,
    skippedReferenced,
  };
}

export async function runOrphanPostVideoCleanup(
  supabase: SupabaseClient,
  mode: OrphanCleanupMode = "dry-run"
): Promise<OrphanCleanupResult> {
  const plan = await planOrphanPostVideoCleanup(supabase);
  const deletedPaths: string[] = [];

  if (mode === "apply" && plan.orphanPaths.length > 0) {
    const { error } = await supabase.storage
      .from(POST_VIDEOS_BUCKET)
      .remove(plan.orphanPaths);
    if (!error) {
      deletedPaths.push(...plan.orphanPaths);
    }
  }

  return {
    mode,
    ...plan,
    deletedPaths,
  };
}
