/**
 * Web video byte-delivery policy.
 *
 * Watch mounts players only for the active ± neighbor window and signs
 * playback URLs for that same window (mobile 0d5680a is API-only sign-ahead;
 * this does not widen video downloads).
 *
 * Home/Discover may keep signed URLs in memory but must not attach media
 * (src / preload) except for the active card.
 */

export const WATCH_PLAYBACK_NEIGHBOR_WINDOW = 1;

export type WatchSignPolicy = "all" | "active-window";

export function isPlayableHttpSrc(src: string | null | undefined): boolean {
  const value = src?.trim() ?? "";
  return value.startsWith("http://") || value.startsWith("https://");
}

export function resolvePlaybackWindowIndexes(
  activeIndex: number,
  length: number,
  radius = WATCH_PLAYBACK_NEIGHBOR_WINDOW
): number[] {
  if (length <= 0) {
    return [];
  }

  const safeActive = Math.min(Math.max(activeIndex, 0), length - 1);
  const start = Math.max(0, safeActive - radius);
  const end = Math.min(length - 1, safeActive + radius);
  const indexes: number[] = [];

  for (let index = start; index <= end; index += 1) {
    indexes.push(index);
  }

  return indexes;
}

/**
 * Watch first page signs the focused row ± neighbors.
 * Paginated pages (cursor) sign nothing — the client signs when a row
 * enters the mount window.
 */
export function resolveWatchSignIndexes(input: {
  length: number;
  focusIndex: number;
  isContinuationPage: boolean;
}): number[] {
  if (input.length <= 0) {
    return [];
  }

  if (input.isContinuationPage) {
    return [];
  }

  return resolvePlaybackWindowIndexes(input.focusIndex, input.length);
}

export function resolveWatchMediaPreload(active: boolean): "auto" | "metadata" {
  return active ? "auto" : "metadata";
}

/** Home/Discover never metadata-preload inactive or idle cards. */
export function resolveHomeDiscoverMediaPreload(
  _active: boolean
): "none" {
  return "none";
}

export function shouldAttachHomeDiscoverMediaSrc(active: boolean): boolean {
  return active;
}

export function shouldAttachWatchMediaSrc(input: {
  index: number;
  activeIndex: number;
  length: number;
}): boolean {
  return resolvePlaybackWindowIndexes(input.activeIndex, input.length).includes(
    input.index
  );
}
