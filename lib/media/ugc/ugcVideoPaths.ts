import { isOwnedVideoPath } from "../../supabase/videoPostsShared";

export const UGC_PLAYBACK_SUFFIX = "-playback";
export const UGC_TEMP_INFIX = "-playback.tmp";

function stripKnownSuffix(stem: string): string {
  if (stem.endsWith(UGC_TEMP_INFIX)) {
    return stem.slice(0, -UGC_TEMP_INFIX.length);
  }
  if (stem.endsWith(UGC_PLAYBACK_SUFFIX)) {
    return stem.slice(0, -UGC_PLAYBACK_SUFFIX.length);
  }
  return stem;
}

/**
 * Deterministic playback object for an original upload path.
 * `{userId}/{uuid}.mov` → `{userId}/{uuid}-playback.mp4`
 * Already-playback paths stay stable so retries replace in place.
 */
export function buildUgcPlaybackPath(userId: string, originalPath: string): string {
  const normalized = originalPath.replace(/^\/+/, "").trim();
  const slash = normalized.lastIndexOf("/");
  const folder = slash >= 0 ? normalized.slice(0, slash) : userId;
  const file = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  const dot = file.lastIndexOf(".");
  const stem = stripKnownSuffix(dot > 0 ? file.slice(0, dot) : file);
  const cleanStem = stem.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80) || "clip";
  return `${folder}/${cleanStem}${UGC_PLAYBACK_SUFFIX}.mp4`;
}

export function buildUgcTempPlaybackPath(userId: string, originalPath: string): string {
  const finalPath = buildUgcPlaybackPath(userId, originalPath);
  return finalPath.replace(/-playback\.mp4$/i, `${UGC_TEMP_INFIX}.mp4`);
}

export function isUgcPlaybackPath(path: string): boolean {
  const file = path.replace(/^\/+/, "").split("/").pop() ?? "";
  return /(?:-playback|-playback\.tmp)\.mp4$/i.test(file);
}

export function collectOwnedMediaPaths(
  userId: string,
  paths: Array<string | null | undefined>
): string[] {
  const unique = new Set<string>();
  for (const raw of paths) {
    const path = (raw ?? "").trim();
    if (!path) continue;
    if (!isOwnedVideoPath(userId, path)) continue;
    unique.add(path);
  }
  return [...unique];
}
