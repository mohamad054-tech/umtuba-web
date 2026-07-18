/**
 * Video Commerce Shelf V1 — pure domain helpers (timeline + DTO shapes).
 * Playback must stay primary; these helpers never touch the player.
 */

export const VIDEO_COMMERCE_EVENT_TYPES = [
  "badge_shown",
  "badge_opened",
  "product_viewed",
] as const;

export type VideoCommerceEventType = (typeof VIDEO_COMMERCE_EVENT_TYPES)[number];

export type VideoProductAttachmentWindow = {
  startMs: number | null;
  endMs: number | null;
};

export type VideoShopShelfItem = {
  attachmentId: string;
  productId: string;
  sortOrder: number;
  startMs: number | null;
  endMs: number | null;
  title: string;
  storeName: string;
  storeSlug: string;
  productSlug: string;
  coverPath: string | null;
  priceMinor: number | null;
  currency: string | null;
  /** Honest placeholder until a ratings system exists — never fabricated. */
  ratingLabel: string;
  href: string;
};

/**
 * Product is active at `currentTimeMs` when:
 * - start is null or <= current
 * - end is null or > current
 * Null/null window = always available for the video.
 */
export function isAttachmentActiveAtTime(
  window: VideoProductAttachmentWindow,
  currentTimeMs: number
): boolean {
  const t = Number.isFinite(currentTimeMs) ? Math.max(0, currentTimeMs) : 0;
  const start = window.startMs;
  const end = window.endMs;

  if (start != null && t < start) {
    return false;
  }
  if (end != null && t >= end) {
    return false;
  }
  return true;
}

export function filterShelfItemsAtTime<T extends VideoProductAttachmentWindow>(
  items: T[],
  currentTimeMs: number
): T[] {
  return items.filter((item) => isAttachmentActiveAtTime(item, currentTimeMs));
}

export function buildProductHref(storeSlug: string, productSlug: string): string {
  return `/store/${storeSlug}/product/${productSlug}`;
}

export const VIDEO_COMMERCE_NO_RATING_LABEL = "No ratings yet";
