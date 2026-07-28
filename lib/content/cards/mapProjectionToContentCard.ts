/**
 * Maps Profile Projection (+ creator context) → ContentCardViewModel.
 * Skips unknown/missing sources safely (caller may filter nulls).
 */

import type { ProfileProjectionCard } from "../services/profileProjectionService";
import {
  ctaLabelForVerb,
  detectTextDir,
  type ContentCardBadgeId,
  type ContentCardCreator,
  type ContentCardDiscoveryMode,
  type ContentCardLayoutVariant,
  type ContentCardPresentationVariant,
  type ContentCardViewModel,
} from "./contentCardViewModel";

const ARTICLE_GRADIENT =
  "bg-gradient-to-br from-sky-700/80 via-indigo-800/70 to-[#0b1024]";
const VIDEO_GRADIENT =
  "bg-gradient-to-br from-violet-700/70 via-blue-900/70 to-[#0b1024]";

export type MapProjectionOptions = {
  creator: ContentCardCreator;
  layoutVariant?: ContentCardLayoutVariant;
  summaryBySourceId?: Record<string, string | null | undefined>;
  previewSrcBySourceId?: Record<string, string | null | undefined>;
  durationByPostId?: Record<string, string | null | undefined>;
};

function discoveryModeFor(
  card: ProfileProjectionCard
): ContentCardDiscoveryMode {
  if (card.contentKind === "article" && card.discoveryPostId != null) {
    return "teaser_bound";
  }
  if (card.contentKind === "video") {
    return "native_video";
  }
  return "none";
}

function presentationFor(
  card: ProfileProjectionCard
): ContentCardPresentationVariant {
  return card.contentKind === "article" ? "article" : "video";
}

function buildBadges(card: ProfileProjectionCard): ContentCardBadgeId[] {
  const badges: ContentCardBadgeId[] = [...card.badges];
  if (
    card.contentKind === "article" &&
    card.discoveryPostId != null &&
    !badges.includes("generated_teaser")
  ) {
    badges.push("generated_teaser");
  }
  if (card.publishState === "draft" && !badges.includes("draft")) {
    badges.push("draft");
  }
  return badges;
}

/**
 * Convert one projection card. Returns null when kind/href is unusable.
 */
export function mapProjectionToContentCard(
  card: ProfileProjectionCard,
  options: MapProjectionOptions
): ContentCardViewModel | null {
  if (!card.registryId || !card.href || !card.title?.trim()) {
    return null;
  }
  if (card.contentKind !== "article" && card.contentKind !== "video") {
    return null;
  }

  const dir = detectTextDir(card.title);
  const hasGeneratedTeaser =
    card.contentKind === "article" && card.discoveryPostId != null;
  const verb = card.contentKind === "article" ? "read_article" : "watch";
  const summary =
    options.summaryBySourceId?.[card.sourceEntityId] ?? card.summary ?? null;
  const previewSrc =
    options.previewSrcBySourceId?.[card.sourceEntityId] ?? null;
  const durationLabel =
    card.contentKind === "video"
      ? options.durationByPostId?.[card.sourceEntityId] ?? null
      : null;

  return {
    id: card.registryId,
    registryId: card.registryId,
    kind: card.contentKind,
    sourceEntityId: card.sourceEntityId,
    creator: options.creator,
    title: card.title.trim(),
    summary:
      typeof summary === "string" && summary.trim() ? summary.trim() : null,
    canonicalHref: card.href,
    publishedAt: card.publishedAt,
    visibility: card.visibility,
    publishState: card.publishState,
    preview: {
      recipe: previewSrc ? "image" : "gradient",
      src: previewSrc,
      poster: previewSrc,
      aspect: card.contentKind === "video" ? "9:16" : "16:9",
      alt: card.title.trim(),
      gradientClass:
        card.contentKind === "article" ? ARTICLE_GRADIENT : VIDEO_GRADIENT,
      durationLabel,
    },
    discoveryPostId: card.discoveryPostId,
    discoveryMode: discoveryModeFor(card),
    hasGeneratedTeaser,
    featured: false,
    pinned: false,
    badges: buildBadges(card),
    cta: {
      verb,
      label: ctaLabelForVerb(verb, dir),
      href: card.href,
    },
    presentationVariant: presentationFor(card),
    layoutVariant: options.layoutVariant ?? "profile",
  };
}

export function mapProjectionsToContentCards(
  cards: ProfileProjectionCard[],
  options: MapProjectionOptions
): ContentCardViewModel[] {
  const seen = new Set<string>();
  const out: ContentCardViewModel[] = [];
  for (const card of cards) {
    try {
      const mapped = mapProjectionToContentCard(card, options);
      if (!mapped) continue;
      if (seen.has(mapped.registryId)) continue;
      seen.add(mapped.registryId);
      out.push(mapped);
    } catch {
      // source missing / corrupt — skip safely
    }
  }
  return out;
}
