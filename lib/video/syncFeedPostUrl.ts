/**
 * Address bar for the home feed and Watch.
 * The shared ?post= id is applied once on first load. After the visitor
 * moves on, the address follows the video they are watching without a reload.
 */

export function buildFeedPostUrl(href: string, postId: number): string {
  const url = new URL(href, "https://umtuba.com");
  url.searchParams.set("post", String(postId));
  url.searchParams.delete("id");
  const query = url.searchParams.toString();
  return `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
}

export function replaceFeedPostInAddress(postId: number | null | undefined): void {
  if (typeof window === "undefined") return;
  if (postId == null || !Number.isInteger(postId) || postId <= 0) return;
  const next = buildFeedPostUrl(window.location.href, postId);
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, "", next);
}
