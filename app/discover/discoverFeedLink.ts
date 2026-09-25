import type { DiscoverFeedLink } from "./types";

/**
 * A link chip is real only when the feed item carries a place, course, or product.
 * The placeholder city written onto every video ("UMTUBA") is not a place link.
 */
export function visibleDiscoverFeedLink(
  link: DiscoverFeedLink | null | undefined
): DiscoverFeedLink | null {
  if (!link) return null;

  if (link.kind === "place") {
    const city = link.city.trim();
    if (!city || city.toUpperCase() === "UMTUBA") return null;
    return { kind: "place", city };
  }

  const title = link.title.trim();
  const href = link.href.trim();
  if (!title || !href.startsWith("/")) return null;
  return { kind: link.kind, title, href };
}
