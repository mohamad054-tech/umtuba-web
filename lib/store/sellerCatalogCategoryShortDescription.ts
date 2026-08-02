/**
 * Seller Catalog Category & Short Description Foundation V1.
 * Presentation + shared validation over existing store_products /
 * product_categories contracts. No parallel taxonomy, no migration.
 */

export const SELLER_CATALOG_CATEGORY_SHORT_DESCRIPTION_ID =
  "commerce.seller.catalog_category_short_description_v1" as const;

/** Card-safe short description limit (aligned with draft/bulk forms). */
export const SELLER_CATALOG_SHORT_DESCRIPTION_MAX = 280;

/** List-row preview truncation (display only; storage keeps full value). */
export const SELLER_CATALOG_SHORT_DESCRIPTION_LIST_PREVIEW = 140;

export type SellerCatalogCategoryOption = {
  id: string;
  name: string;
};

/**
 * Normalize optional short description for create/update.
 * Whitespace-only → null (backward compatible with empty products).
 * Over-length fails closed (no silent truncate).
 */
export function normalizeSellerCatalogShortDescription(
  value: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value == null) {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, message: "Short description must be a string." };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }
  if (trimmed.length > SELLER_CATALOG_SHORT_DESCRIPTION_MAX) {
    return {
      ok: false,
      message: `Short description must be at most ${SELLER_CATALOG_SHORT_DESCRIPTION_MAX} characters.`,
    };
  }
  return { ok: true, value: trimmed };
}

/** Non-empty short description for bulk replace. */
export function requireSellerCatalogShortDescription(
  value: unknown
): { ok: true; value: string } | { ok: false; message: string } {
  const parsed = normalizeSellerCatalogShortDescription(value);
  if (!parsed.ok) return parsed;
  if (parsed.value == null) {
    return { ok: false, message: "Short description cannot be empty." };
  }
  return { ok: true, value: parsed.value };
}

/** Resolve category display name from existing active-category options. */
export function resolveSellerCatalogCategoryLabel(input: {
  primaryCategoryId?: string | null;
  categories: readonly SellerCatalogCategoryOption[];
}): string | null {
  const id = String(input.primaryCategoryId ?? "").trim();
  if (!id) return null;
  const match = input.categories.find((row) => row.id === id);
  return match?.name?.trim() || null;
}

export function formatSellerCatalogShortDescriptionPreview(
  value: string | null | undefined,
  maxChars: number = SELLER_CATALOG_SHORT_DESCRIPTION_LIST_PREVIEW
): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

export function buildSellerCatalogCategoryShortDescriptionDisplay(input: {
  primaryCategoryId?: string | null;
  shortDescription?: string | null;
  categories: readonly SellerCatalogCategoryOption[];
}): {
  categoryLabel: string | null;
  shortDescriptionPreview: string | null;
  hasCategory: boolean;
  hasShortDescription: boolean;
} {
  const categoryLabel = resolveSellerCatalogCategoryLabel({
    primaryCategoryId: input.primaryCategoryId,
    categories: input.categories,
  });
  const shortDescriptionPreview = formatSellerCatalogShortDescriptionPreview(
    input.shortDescription
  );
  return {
    categoryLabel,
    shortDescriptionPreview,
    hasCategory: Boolean(categoryLabel),
    hasShortDescription: Boolean(shortDescriptionPreview),
  };
}
