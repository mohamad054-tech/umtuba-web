/**
 * Pinned Content Structure V1 (Creator Space Experience §8).
 * Readiness / presentation only — no migration, no pin management backend.
 */

import type { ContentCardViewModel } from "../../../lib/content/cards";

/** Soft cap from Creator Space §8. */
export const PROFILE_PINNED_SOFT_CAP = 3;

function cardKey(card: ContentCardViewModel): string {
  return card.registryId || card.id;
}

function withPinnedPresentation(
  card: ContentCardViewModel
): ContentCardViewModel {
  const badges = card.badges.includes("pinned")
    ? card.badges
    : (["pinned", ...card.badges] as ContentCardViewModel["badges"]);
  return {
    ...card,
    pinned: true,
    badges,
    layoutVariant: card.layoutVariant ?? "featured",
  };
}

/**
 * Normalize pin list: stable order, dedupe by registry/id, soft-cap 1–3.
 * Empty input → empty (rail must hide).
 */
export function normalizePinnedContentCards(
  pins: readonly ContentCardViewModel[] | null | undefined
): ContentCardViewModel[] {
  if (!pins?.length) {
    return [];
  }

  const seen = new Set<string>();
  const out: ContentCardViewModel[] = [];

  for (const card of pins) {
    const key = cardKey(card);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(withPinnedPresentation(card));
    if (out.length >= PROFILE_PINNED_SOFT_CAP) {
      break;
    }
  }

  return out;
}

/**
 * Prefer explicit pinnedContentCards; otherwise cards marked pinned / badge.
 */
export function resolvePinnedContentCards(input: {
  pinned?: readonly ContentCardViewModel[] | null;
  cards?: readonly ContentCardViewModel[] | null;
}): ContentCardViewModel[] {
  const explicit = normalizePinnedContentCards(input.pinned);
  if (explicit.length > 0) {
    return explicit;
  }

  return normalizePinnedContentCards(
    (input.cards ?? []).filter(
      (card) => card.pinned === true || card.badges.includes("pinned")
    )
  );
}

/** Prefer exclude pinned items from chronological All (Creator Space §8). */
export function excludePinnedFromChronology(
  cards: readonly ContentCardViewModel[],
  pinned: readonly ContentCardViewModel[]
): ContentCardViewModel[] {
  if (!pinned.length) {
    return [...cards];
  }
  const keys = new Set(pinned.map(cardKey));
  return cards.filter((card) => !keys.has(cardKey(card)));
}

export function shouldShowPinnedRail(
  pinned: readonly ContentCardViewModel[]
): boolean {
  return pinned.length > 0;
}

export type ProfileAllContentPartition = {
  pinned: ContentCardViewModel[];
  chronology: ContentCardViewModel[];
  showPinnedRail: boolean;
};

export function partitionProfileAllContent(input: {
  cards: readonly ContentCardViewModel[];
  pinned?: readonly ContentCardViewModel[] | null;
}): ProfileAllContentPartition {
  const pinned = resolvePinnedContentCards({
    pinned: input.pinned,
    cards: input.cards,
  });
  const chronology = excludePinnedFromChronology(input.cards, pinned);
  return {
    pinned,
    chronology,
    showPinnedRail: shouldShowPinnedRail(pinned),
  };
}
