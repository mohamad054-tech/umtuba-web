/**
 * Category Taxonomy Seed V1.
 * Trusted SSOT for the launch product_categories seed.
 * Does not auto-publish products or enable physical checkout.
 */

export const CATEGORY_TAXONOMY_SEED_ID =
  "commerce.catalog.category_taxonomy_seed_v1" as const;

export const CATEGORY_TAXONOMY_SEED_MIGRATION =
  "supabase/migrations/20260885_store_catalog_category_taxonomy_seed_v1.sql" as const;

/** Deterministic UUID namespace used by the SQL seed. */
export const CATEGORY_TAXONOMY_SEED_UUID_PREFIX =
  "c47a1000-0001-4000-8000-" as const;

export type CategoryTaxonomySeedRow = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  status: "active";
  sortOrder: number;
  /** Informational — does not gate product_type. */
  launchGroup: "digital" | "services" | "physical";
};

const DIGITAL_ROOT_ID = "c47a1000-0001-4000-8000-000000000001";

/**
 * Minimal launch taxonomy mirrored by migration 20260885.
 * Roots first, then digital children under Digital Products.
 */
export const CATEGORY_TAXONOMY_SEED: readonly CategoryTaxonomySeedRow[] = [
  {
    id: DIGITAL_ROOT_ID,
    parentId: null,
    slug: "digital-products",
    name: "Digital Products",
    status: "active",
    sortOrder: 10,
    launchGroup: "digital",
  },
  {
    id: "c47a1000-0001-4000-8000-000000000002",
    parentId: DIGITAL_ROOT_ID,
    slug: "education-courses",
    name: "Education & Courses",
    status: "active",
    sortOrder: 11,
    launchGroup: "digital",
  },
  {
    id: "c47a1000-0001-4000-8000-000000000003",
    parentId: DIGITAL_ROOT_ID,
    slug: "software-digital-tools",
    name: "Software & Digital Tools",
    status: "active",
    sortOrder: 12,
    launchGroup: "digital",
  },
  {
    id: "c47a1000-0001-4000-8000-000000000004",
    parentId: DIGITAL_ROOT_ID,
    slug: "books-documents",
    name: "Books & Documents",
    status: "active",
    sortOrder: 13,
    launchGroup: "digital",
  },
  {
    id: "c47a1000-0001-4000-8000-000000000005",
    parentId: DIGITAL_ROOT_ID,
    slug: "design-creative-assets",
    name: "Design & Creative Assets",
    status: "active",
    sortOrder: 14,
    launchGroup: "digital",
  },
  {
    id: "c47a1000-0001-4000-8000-000000000010",
    parentId: null,
    slug: "services",
    name: "Services",
    status: "active",
    sortOrder: 20,
    launchGroup: "services",
  },
  {
    id: "c47a1000-0001-4000-8000-000000000020",
    parentId: null,
    slug: "electronics",
    name: "Electronics",
    status: "active",
    sortOrder: 30,
    launchGroup: "physical",
  },
  {
    id: "c47a1000-0001-4000-8000-000000000021",
    parentId: null,
    slug: "fashion",
    name: "Fashion",
    status: "active",
    sortOrder: 40,
    launchGroup: "physical",
  },
  {
    id: "c47a1000-0001-4000-8000-000000000022",
    parentId: null,
    slug: "beauty-personal-care",
    name: "Beauty & Personal Care",
    status: "active",
    sortOrder: 50,
    launchGroup: "physical",
  },
  {
    id: "c47a1000-0001-4000-8000-000000000023",
    parentId: null,
    slug: "home-living",
    name: "Home & Living",
    status: "active",
    sortOrder: 60,
    launchGroup: "physical",
  },
  {
    id: "c47a1000-0001-4000-8000-000000000024",
    parentId: null,
    slug: "sports-outdoors",
    name: "Sports & Outdoors",
    status: "active",
    sortOrder: 70,
    launchGroup: "physical",
  },
  {
    id: "c47a1000-0001-4000-8000-000000000025",
    parentId: null,
    slug: "food-beverage",
    name: "Food & Beverage",
    status: "active",
    sortOrder: 80,
    launchGroup: "physical",
  },
] as const;

export const CATEGORY_TAXONOMY_SEED_BY_SLUG: Readonly<
  Record<string, CategoryTaxonomySeedRow>
> = Object.fromEntries(
  CATEGORY_TAXONOMY_SEED.map((row) => [row.slug, row])
) as Readonly<Record<string, CategoryTaxonomySeedRow>>;

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function listCategoryTaxonomyRoots(): CategoryTaxonomySeedRow[] {
  return CATEGORY_TAXONOMY_SEED.filter((r) => r.parentId == null);
}

export function listCategoryTaxonomyChildren(
  parentId: string
): CategoryTaxonomySeedRow[] {
  return CATEGORY_TAXONOMY_SEED.filter((r) => r.parentId === parentId);
}

export function assertCategoryTaxonomySeedIntegrity():
  | { ok: true }
  | { ok: false; message: string } {
  const ids = new Set<string>();
  const slugs = new Set<string>();

  for (const row of CATEGORY_TAXONOMY_SEED) {
    if (!UUID_RE.test(row.id)) {
      return { ok: false, message: `Invalid category id: ${row.id}` };
    }
    if (!row.id.startsWith(CATEGORY_TAXONOMY_SEED_UUID_PREFIX)) {
      return {
        ok: false,
        message: `Category id outside seed namespace: ${row.id}`,
      };
    }
    if (ids.has(row.id)) {
      return { ok: false, message: `Duplicate category id: ${row.id}` };
    }
    if (slugs.has(row.slug)) {
      return { ok: false, message: `Duplicate category slug: ${row.slug}` };
    }
    if (!SLUG_RE.test(row.slug)) {
      return { ok: false, message: `Invalid category slug: ${row.slug}` };
    }
    if (row.name.trim().length < 1 || row.name.trim().length > 80) {
      return { ok: false, message: `Invalid category name: ${row.name}` };
    }
    if (row.status !== "active") {
      return { ok: false, message: `Seeded category must be active: ${row.slug}` };
    }
    if (
      !Number.isInteger(row.sortOrder) ||
      row.sortOrder < 0 ||
      row.sortOrder > 999999
    ) {
      return { ok: false, message: `Invalid sortOrder for ${row.slug}` };
    }
    ids.add(row.id);
    slugs.add(row.slug);
  }

  for (const row of CATEGORY_TAXONOMY_SEED) {
    if (row.parentId == null) continue;
    if (!ids.has(row.parentId)) {
      return {
        ok: false,
        message: `Missing parent ${row.parentId} for ${row.slug}`,
      };
    }
    if (row.parentId === row.id) {
      return { ok: false, message: `Self-parent category: ${row.slug}` };
    }
  }

  return { ok: true };
}

/**
 * Category portion of submitProductForReview — presence + active status.
 * Does not replace digital/physical publish readiness gates.
 */
export function assertPrimaryCategoryEligibleForReview(input: {
  primaryCategoryId: string | null | undefined;
  /** When provided, category row was loaded; missing row fails closed. */
  categoryFound?: boolean;
  categoryStatus?: string | null;
}): { ok: true } | { ok: false; code: "missing" | "inactive"; message: string } {
  if (!input.primaryCategoryId || !UUID_RE.test(input.primaryCategoryId)) {
    return {
      ok: false,
      code: "missing",
      message: "Add a primary category before submitting for review.",
    };
  }
  if (input.categoryFound === false) {
    return {
      ok: false,
      code: "missing",
      message: "Primary category was not found.",
    };
  }
  if (input.categoryStatus != null && input.categoryStatus !== "active") {
    return {
      ok: false,
      code: "inactive",
      message: "Primary category must be an active catalog category.",
    };
  }
  return { ok: true };
}

/** Deterministic active-category ordering matching listActiveCategories. */
export function compareCategoriesSortOrderThenName(
  a: { sortOrder?: number; sort_order?: number; name: string },
  b: { sortOrder?: number; sort_order?: number; name: string }
): number {
  const ao = a.sortOrder ?? a.sort_order ?? 0;
  const bo = b.sortOrder ?? b.sort_order ?? 0;
  if (ao !== bo) return ao < bo ? -1 : 1;
  if (a.name === b.name) return 0;
  return a.name < b.name ? -1 : 1;
}

export function sortActiveCategoriesDeterministic<
  T extends { sortOrder?: number; sort_order?: number; name: string },
>(rows: readonly T[]): T[] {
  return [...rows].sort(compareCategoriesSortOrderThenName);
}
