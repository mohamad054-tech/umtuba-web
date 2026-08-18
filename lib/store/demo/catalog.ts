import type { DemoCategorySlug, DemoProduct, DemoVariant } from "./types";
import {
  DEMO_IMAGE_POLICY,
  DEMO_PRODUCTION_SELLABLE,
  DEMO_PURCHASABLE,
  DEMO_REAL_PROVIDER,
  DEMO_RIGHTS_STATUS,
  DEMO_SOURCE_TYPE,
} from "./types";

type Seed = {
  slug: string;
  title: string;
  short: string;
  category: DemoCategorySlug;
  conceptKind: DemoProduct["conceptKind"];
  tags: string[];
  priceMinor: number;
  variants?: { suffix: string; title: string; options: Record<string, string>; onHand: number }[];
};

const SEEDS: readonly Seed[] = [
  {
    slug: "umtuba-demo-studio-earbuds",
    title: "UMTUBA Demo Studio Earbuds",
    short: "Synthetic audio concept for Electronics filter and PDP QA.",
    category: "electronics",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["audio", "portable"],
    priceMinor: 4999,
    variants: [
      { suffix: "graphite", title: "Graphite", options: { color: "graphite" }, onHand: 6 },
      { suffix: "mist", title: "Mist", options: { color: "mist" }, onHand: 4 },
    ],
  },
  {
    slug: "umtuba-concept-desk-lamp",
    title: "UMTUBA Concept Desk Lamp",
    short: "Owned future lighting concept. Not a partner SKU.",
    category: "electronics",
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["lighting", "desk"],
    priceMinor: 6299,
  },
  {
    slug: "umtuba-demo-canvas-overshirt",
    title: "UMTUBA Demo Canvas Overshirt",
    short: "Synthetic apparel for Fashion size variants.",
    category: "fashion",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["apparel"],
    priceMinor: 3999,
    variants: [
      { suffix: "s", title: "S", options: { size: "S" }, onHand: 3 },
      { suffix: "m", title: "M", options: { size: "M" }, onHand: 5 },
      { suffix: "l", title: "L", options: { size: "L" }, onHand: 2 },
    ],
  },
  {
    slug: "umtuba-concept-everyday-tee",
    title: "UMTUBA Concept Everyday Tee",
    short: "Owned future basics concept for category browsing.",
    category: "fashion",
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["apparel", "basics"],
    priceMinor: 1899,
  },
  {
    slug: "umtuba-demo-ceramic-mug",
    title: "UMTUBA Demo Ceramic Mug",
    short: "Synthetic home good for cart sandbox QA.",
    category: "home",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["kitchen"],
    priceMinor: 1299,
    variants: [
      { suffix: "clay", title: "Clay", options: { color: "clay" }, onHand: 10 },
      { suffix: "ink", title: "Ink", options: { color: "ink" }, onHand: 8 },
    ],
  },
  {
    slug: "umtuba-concept-shelf-riser",
    title: "UMTUBA Concept Shelf Riser",
    short: "Owned future home organization concept.",
    category: "home",
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["organization"],
    priceMinor: 2799,
  },
  {
    slug: "umtuba-demo-linen-throw",
    title: "UMTUBA Demo Linen Throw",
    short: "Synthetic textile for Home search tokens.",
    category: "home",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["textile"],
    priceMinor: 3499,
  },
  {
    slug: "umtuba-demo-lip-balm-tin",
    title: "UMTUBA Demo Lip Balm Tin",
    short: "Synthetic personal-care concept. No real formula claims.",
    category: "beauty",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["personal-care"],
    priceMinor: 799,
  },
  {
    slug: "umtuba-concept-grooming-kit",
    title: "UMTUBA Concept Grooming Kit",
    short: "Owned future beauty-kit concept for PDP layout.",
    category: "beauty",
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["kit"],
    priceMinor: 2499,
  },
  {
    slug: "umtuba-demo-resistance-band",
    title: "UMTUBA Demo Resistance Band",
    short: "Synthetic fitness band for Sports filters.",
    category: "sports",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["fitness"],
    priceMinor: 1599,
    variants: [
      { suffix: "light", title: "Light", options: { resistance: "light" }, onHand: 7 },
      { suffix: "medium", title: "Medium", options: { resistance: "medium" }, onHand: 7 },
    ],
  },
  {
    slug: "umtuba-concept-studio-mat",
    title: "UMTUBA Concept Studio Mat",
    short: "Owned future sports-mat concept.",
    category: "sports",
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["fitness"],
    priceMinor: 4299,
  },
  {
    slug: "umtuba-demo-field-notes",
    title: "UMTUBA Demo Field Notes",
    short: "Synthetic notebook listed under Books for catalog spread.",
    category: "books",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["notebook"],
    priceMinor: 999,
  },
  {
    slug: "umtuba-concept-platform-handbook",
    title: "UMTUBA Concept Platform Handbook",
    short: "Owned future first-party handbook concept. Not an external textbook.",
    category: "books",
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["handbook"],
    priceMinor: 2199,
  },
  {
    slug: "umtuba-demo-canvas-tote",
    title: "UMTUBA Demo Canvas Tote",
    short: "Synthetic tote for Accessories variants and favorites.",
    category: "accessories",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["bag"],
    priceMinor: 2499,
    variants: [
      { suffix: "navy", title: "Navy", options: { color: "navy" }, onHand: 8 },
      { suffix: "sand", title: "Sand", options: { color: "sand" }, onHand: 4 },
    ],
  },
  {
    slug: "umtuba-concept-card-sleeve",
    title: "UMTUBA Concept Card Sleeve",
    short: "Owned future carry concept.",
    category: "accessories",
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["carry"],
    priceMinor: 1499,
  },
  {
    slug: "umtuba-demo-soft-block",
    title: "UMTUBA Demo Soft Block",
    short: "Synthetic kids play-block concept. Not a licensed toy brand.",
    category: "kids",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["play"],
    priceMinor: 1799,
  },
  {
    slug: "umtuba-concept-story-cards",
    title: "UMTUBA Concept Story Cards",
    short: "Owned future kids activity concept.",
    category: "kids",
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["activity"],
    priceMinor: 1599,
  },
  {
    slug: "umtuba-demo-seat-hook",
    title: "UMTUBA Demo Seat Hook",
    short: "Synthetic automotive accessory. Not a vehicle listing.",
    category: "automotive-accessories",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["interior"],
    priceMinor: 1199,
  },
  {
    slug: "umtuba-concept-trunk-organizer",
    title: "UMTUBA Concept Trunk Organizer",
    short: "Owned future car-organization concept.",
    category: "automotive-accessories",
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["organization"],
    priceMinor: 3299,
  },
  {
    slug: "umtuba-demo-desk-tray",
    title: "UMTUBA Demo Desk Tray",
    short: "Synthetic office tray for Office filters.",
    category: "office",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["desk"],
    priceMinor: 1899,
  },
  {
    slug: "umtuba-concept-cable-clips",
    title: "UMTUBA Concept Cable Clips",
    short: "Owned future office-cable concept.",
    category: "office",
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["desk"],
    priceMinor: 899,
  },
  {
    slug: "umtuba-demo-print-pack",
    title: "UMTUBA Demo Print Pack",
    short: "Synthetic digital download concept. Not a live file store.",
    category: "digital-other",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["digital"],
    priceMinor: 599,
  },
  {
    slug: "umtuba-concept-icon-set",
    title: "UMTUBA Concept Icon Set",
    short: "Owned future digital-asset concept.",
    category: "digital-other",
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["digital"],
    priceMinor: 1299,
  },
  {
    slug: "umtuba-demo-travel-pouch",
    title: "UMTUBA Demo Travel Pouch",
    short: "Synthetic pouch to fill Accessories search and empty-filter contrast.",
    category: "accessories",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["travel"],
    priceMinor: 1699,
  },
  {
    slug: "umtuba-demo-water-bottle",
    title: "UMTUBA Demo Water Bottle",
    short: "Synthetic bottle for Sports plus Home-adjacent tags.",
    category: "sports",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["hydrate"],
    priceMinor: 2199,
  },
  {
    slug: "umtuba-demo-bookmark-set",
    title: "UMTUBA Demo Bookmark Set",
    short: "Synthetic reading accessory listed under Books.",
    category: "books",
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["reading"],
    priceMinor: 699,
  },
];

function variantsFor(seed: Seed): DemoVariant[] {
  const rows =
    seed.variants ??
    [{ suffix: "default", title: "Default", options: {}, onHand: 5 }];
  return rows.map((row) => ({
    id: `${seed.slug}-${row.suffix}`,
    sku: `DEMO-${seed.slug.toUpperCase().replace(/UMTUBA-/, "")}-${row.suffix.toUpperCase()}`.slice(0, 64),
    title: row.title,
    optionValues: row.options,
    priceMinor: seed.priceMinor,
    currency: "USD",
    onHand: row.onHand,
  }));
}

function toProduct(seed: Seed, index: number): DemoProduct {
  return {
    id: `demo-${String(index + 1).padStart(2, "0")}-${seed.slug}`,
    slug: seed.slug,
    title: seed.title,
    shortDescription: seed.short,
    description: `${seed.short} SOURCE_TYPE=DEMO. RIGHTS_STATUS=DEMO_ONLY. PURCHASABLE=NO. PRODUCTION_SELLABLE=NO. REAL_PROVIDER=NONE. Neutral UMTUBA placeholder image only. This item cannot look like unauthorized marketplace inventory and cannot become a live checkout.`,
    category: seed.category,
    productType: seed.category === "digital-other" ? "digital" : "physical",
    sourceType: DEMO_SOURCE_TYPE,
    rightsStatus: DEMO_RIGHTS_STATUS,
    purchasable: DEMO_PURCHASABLE,
    productionSellable: DEMO_PRODUCTION_SELLABLE,
    realProvider: DEMO_REAL_PROVIDER,
    conceptKind: seed.conceptKind,
    tags: seed.tags,
    variants: variantsFor(seed),
    imageAlt: `${seed.title} (UMTUBA demo placeholder, not a partner product)`,
    imageRole: "cover",
    imagePolicy: DEMO_IMAGE_POLICY,
  };
}

export const UMTUBA_DEMO_PRODUCTS: readonly DemoProduct[] = SEEDS.map(toProduct);

export function listUmtubaDemoProducts(): readonly DemoProduct[] {
  return UMTUBA_DEMO_PRODUCTS;
}

export { DEMO_CATEGORY_SLUGS } from "./types";

export function getUmtubaDemoProduct(idOrSlug: string): DemoProduct | null {
  return (
    UMTUBA_DEMO_PRODUCTS.find((product) => product.id === idOrSlug || product.slug === idOrSlug) ??
    null
  );
}
