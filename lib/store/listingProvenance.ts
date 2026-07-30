/**
 * Marketplace listing provenance helpers (wishlist / id-PDP / cart continuity).
 *
 * Pure + small adapters. Does not invent payment, shipping, commission, or
 * supplier-portal behavior. Fail closed on ambiguous/invalid listing identity.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeSellerListingId(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return UUID_RE.test(trimmed) ? trimmed : null;
}

/**
 * Reject malformed listing identity when a caller attempted to supply one
 * (non-empty but not a UUID). Empty/absent is allowed (owned path).
 */
export function assertOptionalSellerListingId(
  raw: unknown
):
  | { ok: true; sellerListingId: string | null }
  | { ok: false; message: string } {
  if (raw == null || raw === "") {
    return { ok: true, sellerListingId: null };
  }
  if (typeof raw !== "string") {
    return { ok: false, message: "Listing identity is invalid." };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, sellerListingId: null };
  }
  if (!UUID_RE.test(trimmed)) {
    return { ok: false, message: "Listing identity is invalid." };
  }
  return { ok: true, sellerListingId: trimmed };
}

/** Query-param name for id-based PDP listing provenance. */
export const STORE_PRODUCT_LISTING_QUERY_PARAM = "listing" as const;

/**
 * Build id-based product href, optionally carrying listing provenance so the
 * redirect can resolve the reseller storefront instead of the owner store.
 */
export function buildStoreProductIdHrefWithListing(
  productId: string,
  sellerListingId?: string | null
): string {
  const id = productId.trim();
  const safeId = UUID_RE.test(id) ? id : "";
  const base = `/store/products/${safeId}`;
  const listing = normalizeSellerListingId(sellerListingId ?? null);
  if (!listing) return base;
  return `${base}?${STORE_PRODUCT_LISTING_QUERY_PARAM}=${encodeURIComponent(listing)}`;
}

export function parseSellerListingIdFromSearchParam(
  raw: string | string[] | null | undefined
):
  | { ok: true; sellerListingId: string | null }
  | { ok: false; message: string } {
  if (raw == null) return { ok: true, sellerListingId: null };
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || value === "") {
    return { ok: true, sellerListingId: null };
  }
  // Ambiguous: multiple listing params.
  if (Array.isArray(raw) && raw.length > 1) {
    return { ok: false, message: "Listing identity is ambiguous." };
  }
  return assertOptionalSellerListingId(value);
}

/**
 * Canonical buyer PDP path for a catalog card/detail that already carries
 * store + product slugs (owned or listing-enriched).
 */
export function catalogItemBuyerPdpPath(input: {
  storeSlug: string;
  productSlug: string;
}): string {
  return `/store/${encodeURIComponent(input.storeSlug)}/product/${encodeURIComponent(input.productSlug)}`;
}
