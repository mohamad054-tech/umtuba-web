/**
 * Creator Space All Timeline Contract V1 (CREATOR_SPACE_EXPERIENCE_V1 §6 + §8).
 * Pure helpers for Profile All — no Home / registry / migration changes.
 */

import type { ContentCardViewModel } from "../../../lib/content/cards";
import {
  partitionProfileAllContent,
  type ProfileAllContentPartition,
} from "./profilePinnedContentStructure";

function cardKey(card: ContentCardViewModel): string {
  return card.registryId || card.id;
}

/** Stable first-wins dedupe; preserves projection order. */
export function dedupeCardsByRegistryId(
  cards: readonly ContentCardViewModel[]
): ContentCardViewModel[] {
  const seen = new Set<string>();
  const out: ContentCardViewModel[] = [];
  for (const card of cards) {
    const key = cardKey(card);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(card);
  }
  return out;
}

/**
 * Resolve numeric post id for a video card when present.
 * Does not invent ids — returns null when evidence is insufficient.
 */
export function resolveVideoPostId(
  card: ContentCardViewModel
): number | null {
  if (card.kind !== "video") {
    return null;
  }
  if (
    typeof card.discoveryPostId === "number" &&
    Number.isInteger(card.discoveryPostId) &&
    card.discoveryPostId > 0
  ) {
    return card.discoveryPostId;
  }
  const parsed = Number(card.sourceEntityId);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return null;
}

/**
 * Fail-closed: exclude a video only when explicit evidence proves it is an
 * article teaser. Never drop an independent video on incomplete data.
 */
export function isProvenTeaserVideoCard(
  card: ContentCardViewModel,
  articlesInFeed: readonly ContentCardViewModel[]
): boolean {
  if (card.kind !== "video") {
    return false;
  }

  if (
    card.discoveryMode === "teaser_bound" ||
    card.hasGeneratedTeaser === true ||
    card.badges.includes("linked_article") ||
    card.badges.includes("generated_teaser")
  ) {
    return true;
  }

  const videoPostId = resolveVideoPostId(card);
  if (videoPostId == null) {
    return false;
  }

  return articlesInFeed.some(
    (article) =>
      article.kind === "article" &&
      typeof article.discoveryPostId === "number" &&
      article.discoveryPostId === videoPostId
  );
}

/** Drop only proven teaser videos; preserve order of remaining cards. */
export function excludeProvenTeaserVideos(
  cards: readonly ContentCardViewModel[]
): ContentCardViewModel[] {
  const articles = cards.filter((card) => card.kind === "article");
  return cards.filter((card) => !isProvenTeaserVideoCard(card, articles));
}

/**
 * Full All-timeline contract:
 * 1) dedupe by registryId (order-preserving)
 * 2) fail-closed teaser-video exclusion
 * 3) partition pinned vs chronology (pinned not remixed into chronology)
 */
export function applyProfileAllTimelineContract(input: {
  cards: readonly ContentCardViewModel[];
  pinned?: readonly ContentCardViewModel[] | null;
}): ProfileAllContentPartition {
  const deduped = dedupeCardsByRegistryId(input.cards);
  const chronologySource = excludeProvenTeaserVideos(deduped);
  const pinnedSource =
    input.pinned != null
      ? excludeProvenTeaserVideos(dedupeCardsByRegistryId(input.pinned))
      : input.pinned;

  return partitionProfileAllContent({
    cards: chronologySource,
    pinned: pinnedSource,
  });
}
