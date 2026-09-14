export const VISUAL_DEMO_NOTICE =
  "VISUAL DEMO — local fixtures only. Not production inventory, not a live payment, not an approved seller.";

export const VISUAL_DEMO_FINANCIAL = {
  REAL_PAYMENT_CAPTURE: "DISABLED",
  REAL_SELLER_PAYOUT: "DISABLED",
  PAYMENT_PROVIDER_CONNECTED: "NO",
} as const;

export type VisualCategory =
  | "Electronics"
  | "Fashion"
  | "Home"
  | "Beauty"
  | "Sports"
  | "Kids"
  | "Accessories"
  | "Creator Gear"
  | "Books/Learning";

export type VisualMotif = "orb" | "grid" | "wave" | "leaf" | "type" | "lens" | "thread" | "spark";

export type VisualSeller = {
  slug: string;
  name: string;
  city: string;
  country: string;
  tagline: string;
  trust: string;
  hue: number;
};

export type VisualProduct = {
  slug: string;
  title: string;
  sellerSlug: string;
  category: VisualCategory;
  priceMinor: number;
  compareAtMinor: number | null;
  rating: number;
  reviewCount: number;
  stock: number;
  hue: number;
  motif: VisualMotif;
  blurb: string;
};

export type VisualReview = {
  id: string;
  productSlug: string;
  name: string;
  rating: number;
  text: string;
};

export type VisualOrder = {
  id: string;
  productTitle: string;
  buyer: string;
  status: string;
  amountMinor: number;
};

export const VISUAL_SELLERS: VisualSeller[] = [
  {
    slug: "harbor-pulse",
    name: "Harbor Pulse",
    city: "Alexandria",
    country: "EG",
    tagline: "Signal-clean electronics for late nights.",
    trust: "Verified studio · 2-year care",
    hue: 212,
  },
  {
    slug: "nova-loom",
    name: "Nova Loom",
    city: "Amman",
    country: "JO",
    tagline: "Tailored movement. Quiet luxury.",
    trust: "Atelier-finished · Size guarantee",
    hue: 268,
  },
  {
    slug: "atelier-dune",
    name: "Atelier Dune",
    city: "Marrakech",
    country: "MA",
    tagline: "Home objects with desert light.",
    trust: "Small-batch · Traceable materials",
    hue: 28,
  },
  {
    slug: "lumen-veil",
    name: "Lumen Veil",
    city: "Beirut",
    country: "LB",
    tagline: "Skin rituals, not theater.",
    trust: "Dermatology-reviewed formulas",
    hue: 312,
  },
  {
    slug: "ridge-current",
    name: "Ridge Current",
    city: "Cape Town",
    country: "ZA",
    tagline: "Gear that survives the climb.",
    trust: "Field-tested · Repair desk",
    hue: 152,
  },
  {
    slug: "little-orbit",
    name: "Little Orbit",
    city: "Kuala Lumpur",
    country: "MY",
    tagline: "Curious tools for growing minds.",
    trust: "Safety-checked · Parent notes",
    hue: 42,
  },
  {
    slug: "thread-signal",
    name: "Thread & Signal",
    city: "Istanbul",
    country: "TR",
    tagline: "Everyday metal, quietly loud.",
    trust: "Lifetime clasp care",
    hue: 198,
  },
  {
    slug: "studio-relay",
    name: "Studio Relay",
    city: "Berlin",
    country: "DE",
    tagline: "Creator desks without the clutter.",
    trust: "Creator-owned · 30-day trial",
    hue: 248,
  },
  {
    slug: "quiet-margin",
    name: "Quiet Margin",
    city: "Lisbon",
    country: "PT",
    tagline: "Paper, ink, and room to think.",
    trust: "Archival papers · Local press",
    hue: 188,
  },
];

export const VISUAL_PRODUCTS: VisualProduct[] = [
  {
    slug: "aurora-buds",
    title: "Aurora Buds",
    sellerSlug: "harbor-pulse",
    category: "Electronics",
    priceMinor: 8900,
    compareAtMinor: 11900,
    rating: 4.7,
    reviewCount: 128,
    stock: 24,
    hue: 212,
    motif: "orb",
    blurb: "Open-air listening with a navy charge case that disappears in a jacket pocket.",
  },
  {
    slug: "signal-dock",
    title: "Signal Dock 4K",
    sellerSlug: "harbor-pulse",
    category: "Electronics",
    priceMinor: 15900,
    compareAtMinor: null,
    rating: 4.6,
    reviewCount: 64,
    stock: 11,
    hue: 226,
    motif: "grid",
    blurb: "A single-cable desk hub with a violet idle glow and honest port labels.",
  },
  {
    slug: "nightline-jacket",
    title: "Nightline Jacket",
    sellerSlug: "nova-loom",
    category: "Fashion",
    priceMinor: 18400,
    compareAtMinor: 22000,
    rating: 4.8,
    reviewCount: 91,
    stock: 7,
    hue: 268,
    motif: "thread",
    blurb: "Water-shedding wool blend cut for evening commutes, not runways.",
  },
  {
    slug: "dune-pleat-trouser",
    title: "Dune Pleat Trouser",
    sellerSlug: "nova-loom",
    category: "Fashion",
    priceMinor: 9800,
    compareAtMinor: null,
    rating: 4.5,
    reviewCount: 47,
    stock: 18,
    hue: 280,
    motif: "wave",
    blurb: "Soft structure with a deep navy drape that works seated or standing.",
  },
  {
    slug: "ember-bowl-set",
    title: "Ember Bowl Set",
    sellerSlug: "atelier-dune",
    category: "Home",
    priceMinor: 6400,
    compareAtMinor: 7900,
    rating: 4.9,
    reviewCount: 73,
    stock: 15,
    hue: 22,
    motif: "leaf",
    blurb: "Hand-glazed stoneware that holds heat for late dinners.",
  },
  {
    slug: "harbor-lamp",
    title: "Harbor Line Lamp",
    sellerSlug: "atelier-dune",
    category: "Home",
    priceMinor: 11200,
    compareAtMinor: null,
    rating: 4.4,
    reviewCount: 38,
    stock: 9,
    hue: 36,
    motif: "lens",
    blurb: "A low, architectural wash of light for reading corners.",
  },
  {
    slug: "veil-serum",
    title: "Veil Night Serum",
    sellerSlug: "lumen-veil",
    category: "Beauty",
    priceMinor: 4800,
    compareAtMinor: 5600,
    rating: 4.6,
    reviewCount: 156,
    stock: 40,
    hue: 312,
    motif: "orb",
    blurb: "A quiet peptide ritual in a violet glass dropper — no celebrity claims.",
  },
  {
    slug: "tide-cleanser",
    title: "Tide Cleanser",
    sellerSlug: "lumen-veil",
    category: "Beauty",
    priceMinor: 2900,
    compareAtMinor: null,
    rating: 4.3,
    reviewCount: 88,
    stock: 52,
    hue: 300,
    motif: "wave",
    blurb: "Low-foam cleanse that leaves skin settled, not stripped.",
  },
  {
    slug: "ridge-run-pack",
    title: "Ridge Run Pack",
    sellerSlug: "ridge-current",
    category: "Sports",
    priceMinor: 13200,
    compareAtMinor: 15400,
    rating: 4.7,
    reviewCount: 61,
    stock: 13,
    hue: 152,
    motif: "grid",
    blurb: "Twelve-liter trail pack with a quiet hip belt and night-blue ripstop.",
  },
  {
    slug: "current-mat",
    title: "Current Studio Mat",
    sellerSlug: "ridge-current",
    category: "Sports",
    priceMinor: 7200,
    compareAtMinor: null,
    rating: 4.5,
    reviewCount: 44,
    stock: 21,
    hue: 168,
    motif: "wave",
    blurb: "Dense, closed-cell mat with a grip that does not smell like a gym.",
  },
  {
    slug: "orbit-story-kit",
    title: "Orbit Story Kit",
    sellerSlug: "little-orbit",
    category: "Kids",
    priceMinor: 3600,
    compareAtMinor: 4200,
    rating: 4.8,
    reviewCount: 102,
    stock: 30,
    hue: 42,
    motif: "spark",
    blurb: "Magnetic story tiles for inventing cities on the kitchen table.",
  },
  {
    slug: "soft-horizon-plush",
    title: "Soft Horizon Plush",
    sellerSlug: "little-orbit",
    category: "Kids",
    priceMinor: 2400,
    compareAtMinor: null,
    rating: 4.9,
    reviewCount: 77,
    stock: 26,
    hue: 18,
    motif: "orb",
    blurb: "A small companion stitched in dusk-blue cotton, no licensed faces.",
  },
  {
    slug: "signal-cuff",
    title: "Signal Cuff",
    sellerSlug: "thread-signal",
    category: "Accessories",
    priceMinor: 5400,
    compareAtMinor: 6800,
    rating: 4.6,
    reviewCount: 59,
    stock: 16,
    hue: 198,
    motif: "thread",
    blurb: "Brushed steel cuff with a hidden clasp and a single indigo inlay.",
  },
  {
    slug: "night-folio",
    title: "Night Folio",
    sellerSlug: "thread-signal",
    category: "Accessories",
    priceMinor: 7800,
    compareAtMinor: null,
    rating: 4.4,
    reviewCount: 33,
    stock: 12,
    hue: 220,
    motif: "grid",
    blurb: "Slim folio for passport, cards, and a folded note.",
  },
  {
    slug: "relay-arm",
    title: "Relay Boom Arm",
    sellerSlug: "studio-relay",
    category: "Creator Gear",
    priceMinor: 9800,
    compareAtMinor: 11800,
    rating: 4.7,
    reviewCount: 84,
    stock: 10,
    hue: 248,
    motif: "lens",
    blurb: "A silent boom arm that stays put when you lean into a story.",
  },
  {
    slug: "desk-halo",
    title: "Desk Halo Key",
    sellerSlug: "studio-relay",
    category: "Creator Gear",
    priceMinor: 6200,
    compareAtMinor: null,
    rating: 4.5,
    reviewCount: 51,
    stock: 19,
    hue: 258,
    motif: "spark",
    blurb: "Stream deck-adjacent keys with navy legends you can actually read.",
  },
  {
    slug: "margin-notebook",
    title: "Margin Field Notebook",
    sellerSlug: "quiet-margin",
    category: "Books/Learning",
    priceMinor: 1800,
    compareAtMinor: 2200,
    rating: 4.8,
    reviewCount: 140,
    stock: 80,
    hue: 188,
    motif: "type",
    blurb: "Dot-grid pages with a wide outer margin for second thoughts.",
  },
  {
    slug: "ink-primer",
    title: "Ink Primer — Thinking in Systems",
    sellerSlug: "quiet-margin",
    category: "Books/Learning",
    priceMinor: 3200,
    compareAtMinor: null,
    rating: 4.6,
    reviewCount: 69,
    stock: 34,
    hue: 200,
    motif: "type",
    blurb: "A compact original on mapping messy problems without the jargon fog.",
  },
];

export const VISUAL_REVIEWS: VisualReview[] = [
  {
    id: "r1",
    productSlug: "aurora-buds",
    name: "Lina M.",
    rating: 5,
    text: "They disappear on a walk. Case color matches a night jacket, which is a silly thing to love.",
  },
  {
    id: "r2",
    productSlug: "aurora-buds",
    name: "Omar K.",
    rating: 4,
    text: "Clean pairing. Wish the case lid was a touch quieter.",
  },
  {
    id: "r3",
    productSlug: "nightline-jacket",
    name: "Sara H.",
    rating: 5,
    text: "Looks considered, not branded. The lining is the real luxury.",
  },
];

export const VISUAL_ORDERS: VisualOrder[] = [
  {
    id: "VD-1042",
    productTitle: "Aurora Buds",
    buyer: "Buyer · masked",
    status: "PROCESSING",
    amountMinor: 8900,
  },
  {
    id: "VD-1038",
    productTitle: "Nightline Jacket",
    buyer: "Buyer · masked",
    status: "SHIPPED",
    amountMinor: 18400,
  },
  {
    id: "VD-1021",
    productTitle: "Margin Field Notebook",
    buyer: "Buyer · masked",
    status: "DELIVERED",
    amountMinor: 1800,
  },
];

export const VISUAL_CATEGORIES: VisualCategory[] = [
  "Electronics",
  "Fashion",
  "Home",
  "Beauty",
  "Sports",
  "Kids",
  "Accessories",
  "Creator Gear",
  "Books/Learning",
];

export function formatUsd(minor: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(minor / 100);
}

export function findProduct(slug: string): VisualProduct | undefined {
  return VISUAL_PRODUCTS.find((p) => p.slug === slug);
}

export function findSeller(slug: string): VisualSeller | undefined {
  return VISUAL_SELLERS.find((s) => s.slug === slug);
}

export function productsForSeller(slug: string): VisualProduct[] {
  return VISUAL_PRODUCTS.filter((p) => p.sellerSlug === slug);
}

export function productsForCategory(category: VisualCategory): VisualProduct[] {
  return VISUAL_PRODUCTS.filter((p) => p.category === category);
}

export function discountPct(product: VisualProduct): number | null {
  if (!product.compareAtMinor || product.compareAtMinor <= product.priceMinor) {
    return null;
  }
  return Math.round(
    ((product.compareAtMinor - product.priceMinor) / product.compareAtMinor) * 100
  );
}
