/**
 * Provider-neutral Store category foundation.
 * Suitable for future partner feeds. Do not overfit to one provider.
 */

export const UMTUBA_STORE_CATEGORY_SLUGS = [
  "electronics",
  "fashion",
  "home",
  "beauty",
  "sports",
  "books",
  "accessories",
  "kids",
  "automotive-accessories",
  "office",
  "digital-other",
] as const;

export type UmtubaStoreCategorySlug = (typeof UMTUBA_STORE_CATEGORY_SLUGS)[number];

export type UmtubaStoreCategory = {
  slug: UmtubaStoreCategorySlug;
  name: string;
  description: string;
  sortOrder: number;
};

export const UMTUBA_STORE_CATEGORIES: readonly UmtubaStoreCategory[] = [
  {
    slug: "electronics",
    name: "Electronics",
    description: "Devices, audio, computing accessories, and related concepts.",
    sortOrder: 10,
  },
  {
    slug: "fashion",
    name: "Fashion",
    description: "Apparel and footwear concepts.",
    sortOrder: 20,
  },
  {
    slug: "home",
    name: "Home",
    description: "Home, kitchen, and furniture concepts.",
    sortOrder: 30,
  },
  {
    slug: "beauty",
    name: "Beauty",
    description: "Personal care and beauty concepts.",
    sortOrder: 40,
  },
  {
    slug: "sports",
    name: "Sports",
    description: "Fitness and outdoor concepts.",
    sortOrder: 50,
  },
  {
    slug: "books",
    name: "Books",
    description: "Printed and digital reading concepts.",
    sortOrder: 60,
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "Bags, wearables, and small carry concepts.",
    sortOrder: 70,
  },
  {
    slug: "kids",
    name: "Kids",
    description: "Children and family concepts. Not a live toy marketplace.",
    sortOrder: 80,
  },
  {
    slug: "automotive-accessories",
    name: "Automotive Accessories",
    description: "Vehicle interior and care concepts. Not vehicles themselves.",
    sortOrder: 90,
  },
  {
    slug: "office",
    name: "Office",
    description: "Desk, stationery, and workplace concepts.",
    sortOrder: 100,
  },
  {
    slug: "digital-other",
    name: "Digital/Other",
    description: "Digital goods and residual categories that do not fit elsewhere.",
    sortOrder: 110,
  },
];

const ALIASES: Record<UmtubaStoreCategorySlug, readonly string[]> = {
  electronics: [
    "electronics",
    "consumer-electronics",
    "phones",
    "mobile",
    "laptops",
    "computers",
    "audio",
    "headphones",
    "gadgets",
    "tech",
  ],
  fashion: ["fashion", "apparel", "clothing", "clothes", "shoes", "footwear", "wear"],
  home: ["home", "home-garden", "furniture", "kitchen", "lighting", "decor", "household"],
  beauty: ["beauty", "cosmetics", "skincare", "personal-care", "grooming"],
  sports: ["sports", "sporting-goods", "fitness", "outdoor", "athletics"],
  books: ["books", "books-media", "textbooks", "reading", "publications"],
  accessories: ["accessories", "jewelry", "bags", "watches", "carry"],
  kids: ["kids", "children", "baby", "toys", "family"],
  "automotive-accessories": [
    "automotive-accessories",
    "auto",
    "automotive",
    "car-accessories",
    "vehicle-accessories",
    "car",
  ],
  office: ["office", "stationery", "office-supplies", "desk", "workplace"],
  "digital-other": [
    "digital-other",
    "digital",
    "software",
    "digital-goods",
    "other",
    "uncategorized",
    "misc",
    "general",
  ],
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[_/]+/g, "-").replace(/\s+/g, "-");
}

export function isUmtubaStoreCategorySlug(value: string): value is UmtubaStoreCategorySlug {
  return (UMTUBA_STORE_CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function mapProviderCategoryToUmtuba(
  raw: string | null | undefined
): { slug: UmtubaStoreCategorySlug; matched: boolean; providerCategory: string | null } {
  const providerCategory = (raw ?? "").trim() || null;
  if (!providerCategory) {
    return { slug: "digital-other", matched: false, providerCategory };
  }
  const token = normalizeToken(providerCategory);
  if (isUmtubaStoreCategorySlug(token)) {
    return { slug: token, matched: true, providerCategory };
  }
  for (const slug of UMTUBA_STORE_CATEGORY_SLUGS) {
    if (ALIASES[slug].includes(token)) {
      return { slug, matched: true, providerCategory };
    }
  }
  for (const slug of UMTUBA_STORE_CATEGORY_SLUGS) {
    if (ALIASES[slug].some((alias) => token.includes(alias) || alias.includes(token))) {
      return { slug, matched: true, providerCategory };
    }
  }
  return { slug: "digital-other", matched: false, providerCategory };
}

export function listUmtubaStoreCategories(): readonly UmtubaStoreCategory[] {
  return [...UMTUBA_STORE_CATEGORIES].sort((a, b) => a.sortOrder - b.sortOrder);
}
