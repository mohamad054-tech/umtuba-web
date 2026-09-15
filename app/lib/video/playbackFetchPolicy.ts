/**
 * Web video byte-delivery policy.
 *
 * SSR HTML may include at most one signed post-videos URL (the first/active
 * clip) so a full feed is not dumped into the document. Neighbors remint
 * from the client via refreshWatchPlaybackAction when they enter the mount
 * window. Watch still mounts players for active ± 1.
 *
 * Home/Discover must not attach media (src / preload) except for the active card.
 */

export const WATCH_PLAYBACK_NEIGHBOR_WINDOW = 1;

export type WatchSignPolicy = "all" | "active-window" | "first-active";

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
 * First page signs only the focused/first row. Paginated pages sign nothing —
 * the client remints when a row enters the mount window.
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

  const safeFocus = Math.min(Math.max(input.focusIndex, 0), input.length - 1);
  return [safeFocus];
}

/** Mixed feeds (Life, saved): sign at most the first video row. */
export function firstPlayableVideoSignIndexes(
  rows: ReadonlyArray<{ post_type?: string | null }>
): Set<number> {
  const index = rows.findIndex((row) => row.post_type === "video");
  return index >= 0 ? new Set([index]) : new Set();
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
