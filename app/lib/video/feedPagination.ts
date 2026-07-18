/**
 * Shared Discover/Watch feed pagination helpers.
 * Pure — no network. Experiences own load-more concurrency via a ref lock.
 */

export const FEED_LOAD_MORE_ERROR_MESSAGE =
  "Couldn't load more videos. Please try again.";

export type FeedItemWithId = { id: string };

/** Append page items without duplicating ids already present. */
export function appendUniqueById<T extends FeedItemWithId>(
  current: T[],
  incoming: T[]
): T[] {
  if (incoming.length === 0) {
    return current;
  }
  const seen = new Set(current.map((item) => item.id));
  const appended = incoming.filter((item) => !seen.has(item.id));
  if (appended.length === 0) {
    return current;
  }
  return [...current, ...appended];
}

/**
 * Decide whether a near-end scroll should start a load-more request.
 * Failures must not clear the cursor — only a successful response may.
 */
export function shouldStartFeedLoadMore(input: {
  nextCursor: string | null | undefined;
  loadingMore: boolean;
  disabled?: boolean;
}): boolean {
  if (input.disabled) return false;
  if (input.loadingMore) return false;
  if (!input.nextCursor) return false;
  return true;
}
