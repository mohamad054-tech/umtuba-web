/**
 * Visibility Service — Unified Content Services V2.
 * Normalizes domain privacy into registry-safe visibility.
 * Source RLS remains the final authority.
 */

import type {
  ContentPublishState,
  ContentVisibility,
} from "../contentRegistry";

export type DomainVisibilityHint =
  | "public"
  | "private"
  | "unlisted"
  | "followers"
  | "authenticated"
  | string;

/**
 * Map domain hints → registry visibility allowlist.
 * Unknown / unsupported hints fail closed to private.
 */
export function normalizeVisibility(
  hint: DomainVisibilityHint | null | undefined
): ContentVisibility {
  const raw = String(hint ?? "")
    .trim()
    .toLowerCase();
  if (raw === "public") return "public";
  if (raw === "unlisted") return "unlisted";
  if (raw === "private" || raw === "followers" || raw === "authenticated") {
    return "private";
  }
  return "private";
}

export function visibilityFromPublishState(
  publishState: ContentPublishState
): ContentVisibility {
  return publishState === "published" ? "public" : "private";
}

export function isPublicListingEligible(input: {
  visibility: ContentVisibility;
  publishState: ContentPublishState;
}): boolean {
  return (
    input.visibility === "public" && input.publishState === "published"
  );
}

export function canViewerAccessContent(input: {
  visibility: ContentVisibility;
  publishState: ContentPublishState;
  ownerUserId: string;
  viewerId?: string | null;
}): boolean {
  if (input.viewerId && input.viewerId === input.ownerUserId) {
    return true;
  }
  return isPublicListingEligible(input);
}
