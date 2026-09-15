import type {
  DemoCategorySlug,
  DemoFilterAttributes,
  DemoInventoryKind,
  DemoPriceBand,
  DemoProduct,
  DemoReturnsInfo,
  DemoShippingInfo,
  DemoSpecification,
  DemoStockState,
  DemoTaxonomy,
  DemoVariant,
} from "./types";
import {
  DEMO_IMAGE_POLICY,
  DEMO_PRODUCTION_SELLABLE,
  DEMO_PURCHASABLE,
  DEMO_REAL_PROVIDER,
  DEMO_RIGHTS_STATUS,
  DEMO_SOURCE_TYPE,
} from "./types";

type SeedVariant = {
  suffix: string;
  title: string;
  options: Record<string, string>;
  onHand: number | null;
};

type Seed = {
  slug: string;
  title: string;
  short: string;
  long: string;
  category: DemoCategorySlug;
  taxonomy: DemoTaxonomy;
  conceptKind: DemoProduct["conceptKind"];
  tags: string[];
  searchKeywords: string[];
  filter: Omit<DemoFilterAttributes, "fulfillment" | "priceBand">;
  specifications: DemoSpecification[];
  relatedSlugs: string[];
  priceMinor: number;
  variants?: SeedVariant[];
};

const PHYSICAL_SHIPPING: DemoShippingInfo = {
  mode: "DEMO",
  applicable: true,
  methodLabel: "Sandbox standard",
  etaLabel: "DEMO · not a promise",
  amountMinor: 599,
  note: "Synthetic fulfillment example. Not a carrier commitment.",
};

const DIGITAL_SHIPPING: DemoShippingInfo = {
  mode: "DEMO",
  applicable: false,
  methodLabel: "Digital delivery (demo)",
  etaLabel: "DEMO · instant example · not a promise",
  amountMinor: 0,
  note: "No physical shipment. Synthetic download path only.",
};

const PHYSICAL_RETURNS: DemoReturnsInfo = {
  mode: "DEMO",
  applicable: true,
  windowDays: 30,
  label: "DEMO 30-day example",
  note: "Synthetic returns example. Not a live seller policy.",
};

const DIGITAL_RETURNS: DemoReturnsInfo = {
  mode: "DEMO",
  applicable: false,
  windowDays: null,
  label: "DEMO digital re-issue example",
  note: "Not a live license or refund policy.",
};

const LEGAL_SUFFIX =
  " SOURCE_TYPE=DEMO. RIGHTS_STATUS=DEMO_ONLY. PURCHASABLE=NO. PRODUCTION_SELLABLE=NO. REAL_PROVIDER=NONE. Neutral UMTUBA placeholder image only. This item cannot look like unauthorized marketplace inventory and cannot become a live checkout.";

function taxonomy(
  department: string,
  category: string,
  subcategory: string
): DemoTaxonomy {
  return {
    department,
    category,
    subcategory,
    path: [department, category, subcategory],
  };
}

const SEEDS: readonly Seed[] = [
  {
    slug: "umtuba-demo-studio-earbuds",
    title: "UMTUBA Demo Studio Earbuds",
    short: "Synthetic wireless earbuds for Electronics audio filters and PDP QA.",
    long: "In-ear demo earbuds with a compact charging case. Use Graphite or Mist to exercise color variants, inventory counts, and Electronics search. No audio-performance claim is made.",
    category: "electronics",
    taxonomy: taxonomy("electronics", "audio", "earbuds"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["audio", "portable"],
    searchKeywords: ["earbuds", "earphones", "wireless", "audio", "studio", "electronics"],
    filter: { color: ["graphite", "mist"], size: [], material: ["plastic"], audience: ["adult"] },
    specifications: [
      { name: "Form", value: "In-ear with charging case (synthetic)" },
      { name: "Connectivity", value: "Wireless demo profile" },
      { name: "Color options", value: "Graphite, Mist" },
      { name: "Catalog use", value: "Electronics filter and variant QA" },
    ],
    relatedSlugs: ["umtuba-concept-desk-lamp", "umtuba-concept-cable-clips"],
    priceMinor: 4999,
    variants: [
      { suffix: "graphite", title: "Graphite", options: { color: "graphite" }, onHand: 6 },
      { suffix: "mist", title: "Mist", options: { color: "mist" }, onHand: 4 },
    ],
  },
  {
    slug: "umtuba-concept-desk-lamp",
    title: "UMTUBA Concept Desk Lamp",
    short: "Owned future desk lamp for lighting browse and Office-adjacent QA.",
    long: "A compact clamp-free desk lamp concept with Warm and Cool color-temperature options. Intended for Electronics lighting taxonomy and related-office merchandising. Not a partner lighting SKU.",
    category: "electronics",
    taxonomy: taxonomy("electronics", "lighting", "desk-lamps"),
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["lighting", "desk"],
    searchKeywords: ["lamp", "desk lamp", "lighting", "warm", "cool", "electronics"],
    filter: { color: ["warm", "cool"], size: [], material: ["metal", "plastic"], audience: ["adult"] },
    specifications: [
      { name: "Mount", value: "Freestanding desk (synthetic)" },
      { name: "Temperature options", value: "Warm, Cool" },
      { name: "Power", value: "USB-C demo profile" },
      { name: "Catalog use", value: "Owned lighting concept" },
    ],
    relatedSlugs: ["umtuba-demo-desk-tray", "umtuba-concept-cable-clips"],
    priceMinor: 6299,
    variants: [
      { suffix: "warm", title: "Warm", options: { colorTemperature: "warm" }, onHand: 8 },
      { suffix: "cool", title: "Cool", options: { colorTemperature: "cool" }, onHand: 7 },
    ],
  },
  {
    slug: "umtuba-demo-canvas-overshirt",
    title: "UMTUBA Demo Canvas Overshirt",
    short: "Synthetic canvas overshirt for Fashion size variants and low-stock QA.",
    long: "A mid-weight canvas overshirt used to exercise S/M/L size options and mixed inventory, including a low-stock Large. Neutral apparel — not a licensed brand.",
    category: "fashion",
    taxonomy: taxonomy("fashion", "apparel", "overshirts"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["apparel"],
    searchKeywords: ["overshirt", "shirt", "canvas", "apparel", "fashion", "outerwear"],
    filter: { color: ["canvas"], size: ["S", "M", "L"], material: ["canvas"], audience: ["adult"] },
    specifications: [
      { name: "Fabric", value: "Canvas weave (synthetic)" },
      { name: "Fit", value: "Relaxed overshirt" },
      { name: "Sizes", value: "S, M, L" },
      { name: "Care", value: "Demo care label only" },
    ],
    relatedSlugs: ["umtuba-concept-everyday-tee", "umtuba-demo-canvas-tote"],
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
    short: "Owned future basics tee for Fashion category browsing.",
    long: "A short-sleeve everyday tee concept in S/M/L. Used for Fashion basics taxonomy and related-apparel mapping. Not a third-party brand staple.",
    category: "fashion",
    taxonomy: taxonomy("fashion", "apparel", "t-shirts"),
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["apparel", "basics"],
    searchKeywords: ["tee", "t-shirt", "basics", "apparel", "fashion", "cotton"],
    filter: { color: ["heather"], size: ["S", "M", "L"], material: ["cotton-blend"], audience: ["adult"] },
    specifications: [
      { name: "Cut", value: "Short sleeve crew (synthetic)" },
      { name: "Sizes", value: "S, M, L" },
      { name: "Fabric", value: "Cotton-blend demo profile" },
      { name: "Catalog use", value: "Owned basics concept" },
    ],
    relatedSlugs: ["umtuba-demo-canvas-overshirt", "umtuba-demo-canvas-tote"],
    priceMinor: 1899,
    variants: [
      { suffix: "s", title: "S", options: { size: "S" }, onHand: 4 },
      { suffix: "m", title: "M", options: { size: "M" }, onHand: 6 },
      { suffix: "l", title: "L", options: { size: "L" }, onHand: 5 },
    ],
  },
  {
    slug: "umtuba-demo-ceramic-mug",
    title: "UMTUBA Demo Ceramic Mug",
    short: "Synthetic ceramic mug for Home drinkware and in-stock cart QA.",
    long: "A 350 ml ceramic mug in Clay or Ink. High synthetic on-hand supports the IN_STOCK fixture. Kitchen drinkware only — no food-safety certification is claimed.",
    category: "home",
    taxonomy: taxonomy("home-living", "kitchen", "drinkware"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["kitchen"],
    searchKeywords: ["mug", "cup", "ceramic", "drinkware", "kitchen", "home"],
    filter: { color: ["clay", "ink"], size: ["350ml"], material: ["ceramic"], audience: ["adult"] },
    specifications: [
      { name: "Capacity", value: "350 ml (synthetic)" },
      { name: "Material", value: "Ceramic" },
      { name: "Color options", value: "Clay, Ink" },
      { name: "Dishwasher", value: "Demo label only" },
    ],
    relatedSlugs: ["umtuba-demo-linen-throw", "umtuba-demo-desk-tray"],
    priceMinor: 1299,
    variants: [
      { suffix: "clay", title: "Clay", options: { color: "clay" }, onHand: 10 },
      { suffix: "ink", title: "Ink", options: { color: "ink" }, onHand: 8 },
    ],
  },
  {
    slug: "umtuba-concept-shelf-riser",
    title: "UMTUBA Concept Shelf Riser",
    short: "Owned future shelf riser for Home organization browse.",
    long: "A two-size shelf riser concept (Small / Large) for kitchen or desk organization merchandising. Neutral wood-tone demo — not a furniture-brand SKU.",
    category: "home",
    taxonomy: taxonomy("home-living", "organization", "shelf-accessories"),
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["organization"],
    searchKeywords: ["shelf", "riser", "organizer", "home", "storage", "kitchen"],
    filter: { color: ["oak"], size: ["small", "large"], material: ["wood-composite"], audience: ["adult"] },
    specifications: [
      { name: "Sizes", value: "Small, Large" },
      { name: "Material", value: "Wood-composite demo profile" },
      { name: "Use", value: "Shelf or counter organization" },
      { name: "Catalog use", value: "Owned home-organization concept" },
    ],
    relatedSlugs: ["umtuba-demo-linen-throw", "umtuba-demo-ceramic-mug"],
    priceMinor: 2799,
    variants: [
      { suffix: "small", title: "Small", options: { size: "small" }, onHand: 6 },
      { suffix: "large", title: "Large", options: { size: "large" }, onHand: 4 },
    ],
  },
  {
    slug: "umtuba-demo-linen-throw",
    title: "UMTUBA Demo Linen Throw",
    short: "Synthetic linen throw for Home textile search and color filters.",
    long: "A light throw in Oat or Slate for Home textiles browse. Slate is intentionally low-stock. No luxury-fiber or origin claim is made.",
    category: "home",
    taxonomy: taxonomy("home-living", "textiles", "throws"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["textile"],
    searchKeywords: ["throw", "blanket", "linen", "textile", "home", "living"],
    filter: { color: ["oat", "slate"], size: ["standard"], material: ["linen-blend"], audience: ["adult"] },
    specifications: [
      { name: "Size", value: "Standard throw (synthetic)" },
      { name: "Material", value: "Linen-blend demo profile" },
      { name: "Color options", value: "Oat, Slate" },
      { name: "Catalog use", value: "Home textile search tokens" },
    ],
    relatedSlugs: ["umtuba-demo-ceramic-mug", "umtuba-concept-shelf-riser"],
    priceMinor: 3499,
    variants: [
      { suffix: "oat", title: "Oat", options: { color: "oat" }, onHand: 5 },
      { suffix: "slate", title: "Slate", options: { color: "slate" }, onHand: 3 },
    ],
  },
  {
    slug: "umtuba-demo-lip-balm-tin",
    title: "UMTUBA Demo Lip Balm Tin",
    short: "Synthetic lip-care tin for Beauty personal-care filters.",
    long: "A small tin in Unscented or Mint for Beauty browse. No formula, dermatology, or results claim is made. Personal-care category token only.",
    category: "beauty",
    taxonomy: taxonomy("beauty-personal-care", "personal-care", "lip-care"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["personal-care"],
    searchKeywords: ["lip balm", "tin", "personal care", "beauty", "unscented", "mint"],
    filter: { color: [], size: ["tin"], material: ["balm"], audience: ["adult"] },
    specifications: [
      { name: "Format", value: "Tin (synthetic)" },
      { name: "Scent options", value: "Unscented, Mint" },
      { name: "Claims", value: "None — demo category token only" },
      { name: "Catalog use", value: "Beauty personal-care QA" },
    ],
    relatedSlugs: ["umtuba-concept-grooming-kit", "umtuba-demo-travel-pouch"],
    priceMinor: 799,
    variants: [
      { suffix: "unscented", title: "Unscented", options: { scent: "unscented" }, onHand: 12 },
      { suffix: "mint", title: "Mint", options: { scent: "mint" }, onHand: 9 },
    ],
  },
  {
    slug: "umtuba-concept-grooming-kit",
    title: "UMTUBA Concept Grooming Kit",
    short: "Owned future grooming-kit concept for Beauty PDP layout.",
    long: "A small grooming-kit concept in Standard or Travel. Used for Beauty kit merchandising and related travel-pouch mapping. Contents are unlabeled demo pieces only.",
    category: "beauty",
    taxonomy: taxonomy("beauty-personal-care", "grooming", "kits"),
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["kit"],
    searchKeywords: ["grooming", "kit", "travel", "beauty", "personal care"],
    filter: { color: [], size: ["standard", "travel"], material: ["mixed"], audience: ["adult"] },
    specifications: [
      { name: "Formats", value: "Standard, Travel" },
      { name: "Contents", value: "Unlabeled demo pieces" },
      { name: "Claims", value: "None" },
      { name: "Catalog use", value: "Owned beauty-kit concept" },
    ],
    relatedSlugs: ["umtuba-demo-lip-balm-tin", "umtuba-demo-travel-pouch"],
    priceMinor: 2499,
    variants: [
      { suffix: "standard", title: "Standard", options: { size: "standard" }, onHand: 4 },
      { suffix: "travel", title: "Travel", options: { size: "travel" }, onHand: 5 },
    ],
  },
  {
    slug: "umtuba-demo-resistance-band",
    title: "UMTUBA Demo Resistance Band",
    short: "Synthetic resistance band for Sports fitness filters.",
    long: "A loop resistance band in Light, Medium, or Heavy. Used for Sports fitness taxonomy and related-mat / bottle merchandising. No training-result claim is made.",
    category: "sports",
    taxonomy: taxonomy("sports-outdoors", "fitness", "resistance-training"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["fitness"],
    searchKeywords: ["resistance band", "fitness", "workout", "sports", "light", "medium", "heavy"],
    filter: {
      color: [],
      size: [],
      material: ["latex-free-demo"],
      audience: ["adult"],
    },
    specifications: [
      { name: "Type", value: "Loop band (synthetic)" },
      { name: "Levels", value: "Light, Medium, Heavy" },
      { name: "Length", value: "Standard loop demo profile" },
      { name: "Catalog use", value: "Sports fitness filters" },
    ],
    relatedSlugs: ["umtuba-concept-studio-mat", "umtuba-demo-water-bottle"],
    priceMinor: 1599,
    variants: [
      { suffix: "light", title: "Light", options: { resistance: "light" }, onHand: 7 },
      { suffix: "medium", title: "Medium", options: { resistance: "medium" }, onHand: 7 },
      { suffix: "heavy", title: "Heavy", options: { resistance: "heavy" }, onHand: 1 },
    ],
  },
  {
    slug: "umtuba-concept-studio-mat",
    title: "UMTUBA Concept Studio Mat",
    short: "Owned future studio mat for Sports floor-exercise browse.",
    long: "A rectangular studio mat concept in 4 mm or 6 mm thickness. Used for Sports mats taxonomy. No yoga-brand or studio partnership is implied.",
    category: "sports",
    taxonomy: taxonomy("sports-outdoors", "fitness", "mats"),
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["fitness"],
    searchKeywords: ["mat", "studio mat", "fitness", "sports", "floor", "exercise"],
    filter: { color: ["slate"], size: ["4mm", "6mm"], material: ["foam"], audience: ["adult"] },
    specifications: [
      { name: "Shape", value: "Rectangular (synthetic)" },
      { name: "Thickness options", value: "4 mm, 6 mm" },
      { name: "Surface", value: "Closed-cell foam demo profile" },
      { name: "Catalog use", value: "Owned sports-mat concept" },
    ],
    relatedSlugs: ["umtuba-demo-resistance-band", "umtuba-demo-water-bottle"],
    priceMinor: 4299,
    variants: [
      { suffix: "4mm", title: "4 mm", options: { thickness: "4mm" }, onHand: 5 },
      { suffix: "6mm", title: "6 mm", options: { thickness: "6mm" }, onHand: 3 },
    ],
  },
  {
    slug: "umtuba-demo-field-notes",
    title: "UMTUBA Demo Field Notes",
    short: "Synthetic pocket notebook listed under Books stationery.",
    long: "A pocket notebook in Ruled or Blank. Books-department stationery for catalog spread and related-handbook / bookmark mapping. Not an external publisher title.",
    category: "books",
    taxonomy: taxonomy("books", "stationery", "notebooks"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["notebook"],
    searchKeywords: ["notebook", "field notes", "journal", "ruled", "blank", "stationery"],
    filter: { color: ["kraft"], size: ["pocket"], material: ["paper"], audience: ["adult"] },
    specifications: [
      { name: "Format", value: "Pocket notebook (synthetic)" },
      { name: "Page options", value: "Ruled, Blank" },
      { name: "Binding", value: "Staple demo profile" },
      { name: "Catalog use", value: "Books stationery spread" },
    ],
    relatedSlugs: ["umtuba-concept-platform-handbook", "umtuba-demo-bookmark-set"],
    priceMinor: 999,
    variants: [
      { suffix: "ruled", title: "Ruled", options: { ruling: "ruled" }, onHand: 8 },
      { suffix: "blank", title: "Blank", options: { ruling: "blank" }, onHand: 6 },
    ],
  },
  {
    slug: "umtuba-concept-platform-handbook",
    title: "UMTUBA Concept Platform Handbook",
    short: "Owned future first-party handbook concept. Not an external textbook.",
    long: "A first-party platform handbook concept in Softcover. Books-department handbook for owned-content merchandising. Not a licensed textbook or partner publication.",
    category: "books",
    taxonomy: taxonomy("books", "handbooks", "platform-guides"),
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["handbook"],
    searchKeywords: ["handbook", "guide", "platform", "book", "softcover"],
    filter: { color: [], size: ["softcover"], material: ["paper"], audience: ["adult"] },
    specifications: [
      { name: "Format", value: "Softcover (synthetic)" },
      { name: "Origin", value: "First-party concept copy" },
      { name: "Language", value: "English demo body" },
      { name: "Catalog use", value: "Owned handbook concept" },
    ],
    relatedSlugs: ["umtuba-demo-field-notes", "umtuba-demo-bookmark-set"],
    priceMinor: 2199,
    variants: [{ suffix: "softcover", title: "Softcover", options: { format: "softcover" }, onHand: 4 }],
  },
  {
    slug: "umtuba-demo-canvas-tote",
    title: "UMTUBA Demo Canvas Tote",
    short: "Synthetic canvas tote for Accessories color variants and favorites.",
    long: "An open-top canvas tote in Navy or Sand. Used for Accessories bag taxonomy, two-variant PDP, and related apparel mapping.",
    category: "accessories",
    taxonomy: taxonomy("accessories", "bags", "totes"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["bag"],
    searchKeywords: ["tote", "bag", "canvas", "navy", "sand", "accessories"],
    filter: { color: ["navy", "sand"], size: ["standard"], material: ["canvas"], audience: ["adult"] },
    specifications: [
      { name: "Style", value: "Open-top tote (synthetic)" },
      { name: "Color options", value: "Navy, Sand" },
      { name: "Handles", value: "Shoulder-length demo profile" },
      { name: "Catalog use", value: "Accessories variants and favorites" },
    ],
    relatedSlugs: ["umtuba-demo-travel-pouch", "umtuba-demo-canvas-overshirt"],
    priceMinor: 2499,
    variants: [
      { suffix: "navy", title: "Navy", options: { color: "navy" }, onHand: 8 },
      { suffix: "sand", title: "Sand", options: { color: "sand" }, onHand: 4 },
    ],
  },
  {
    slug: "umtuba-concept-card-sleeve",
    title: "UMTUBA Concept Card Sleeve",
    short: "Owned future slim card sleeve for Accessories carry browse.",
    long: "A slim card sleeve concept in Slate or Tan. Used for Accessories small-goods taxonomy. Not a leather-brand or payment-product SKU.",
    category: "accessories",
    taxonomy: taxonomy("accessories", "small-goods", "card-holders"),
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["carry"],
    searchKeywords: ["card sleeve", "wallet", "sleeve", "carry", "accessories"],
    filter: { color: ["slate", "tan"], size: ["slim"], material: ["synthetic-leather"], audience: ["adult"] },
    specifications: [
      { name: "Slots", value: "Slim sleeve (synthetic)" },
      { name: "Color options", value: "Slate, Tan" },
      { name: "Material", value: "Synthetic-leather demo profile" },
      { name: "Catalog use", value: "Owned carry concept" },
    ],
    relatedSlugs: ["umtuba-demo-canvas-tote", "umtuba-demo-travel-pouch"],
    priceMinor: 1499,
    variants: [
      { suffix: "slate", title: "Slate", options: { color: "slate" }, onHand: 7 },
      { suffix: "tan", title: "Tan", options: { color: "tan" }, onHand: 6 },
    ],
  },
  {
    slug: "umtuba-demo-soft-block",
    title: "UMTUBA Demo Soft Block",
    short: "Synthetic kids play-block set. Not a licensed toy brand.",
    long: "Foam play blocks in a 4-pack or 8-pack for Kids play taxonomy. Neutral shapes only. Not a licensed character or toy-brand product.",
    category: "kids",
    taxonomy: taxonomy("kids", "play", "blocks"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["play"],
    searchKeywords: ["blocks", "soft block", "kids", "play", "foam", "set"],
    filter: { color: ["mixed"], size: ["4-pack", "8-pack"], material: ["foam"], audience: ["kids"] },
    specifications: [
      { name: "Material", value: "Soft foam (synthetic)" },
      { name: "Pack options", value: "4-pack, 8-pack" },
      { name: "Age label", value: "Demo kids category only" },
      { name: "Licensing", value: "None — not a brand toy" },
    ],
    relatedSlugs: ["umtuba-concept-story-cards"],
    priceMinor: 1799,
    variants: [
      { suffix: "4pack", title: "4-pack", options: { pack: "4-pack" }, onHand: 5 },
      { suffix: "8pack", title: "8-pack", options: { pack: "8-pack" }, onHand: 3 },
    ],
  },
  {
    slug: "umtuba-concept-story-cards",
    title: "UMTUBA Concept Story Cards",
    short: "Owned future kids activity cards for prompt-and-play browse.",
    long: "A deck of prompt cards in 24-card or 48-card counts. Kids activities taxonomy. Original demo prompts only — not a licensed story property.",
    category: "kids",
    taxonomy: taxonomy("kids", "activities", "cards"),
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["activity"],
    searchKeywords: ["story cards", "cards", "kids", "activity", "deck", "prompts"],
    filter: { color: [], size: ["24", "48"], material: ["cardstock"], audience: ["kids"] },
    specifications: [
      { name: "Counts", value: "24-card, 48-card" },
      { name: "Content", value: "Original demo prompts" },
      { name: "Finish", value: "Cardstock demo profile" },
      { name: "Catalog use", value: "Owned kids-activity concept" },
    ],
    relatedSlugs: ["umtuba-demo-soft-block"],
    priceMinor: 1599,
    variants: [
      { suffix: "24", title: "24-card", options: { count: "24" }, onHand: 6 },
      { suffix: "48", title: "48-card", options: { count: "48" }, onHand: 4 },
    ],
  },
  {
    slug: "umtuba-demo-seat-hook",
    title: "UMTUBA Demo Seat Hook",
    short: "Synthetic car seat-back hook. Not a vehicle listing.",
    long: "A seat-back hook in Black (in stock) or Chrome (out of stock) for Automotive interior taxonomy and OUT_OF_STOCK QA. Accessory only — not a vehicle or OEM part.",
    category: "automotive-accessories",
    taxonomy: taxonomy("automotive", "interior", "hooks"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["interior"],
    searchKeywords: ["seat hook", "car hook", "automotive", "interior", "headrest"],
    filter: { color: ["black", "chrome"], size: [], material: ["metal"], audience: ["adult"] },
    specifications: [
      { name: "Mount", value: "Seat-back hook (synthetic)" },
      { name: "Color options", value: "Black, Chrome" },
      { name: "Vehicle listing", value: "No — accessory only" },
      { name: "Catalog use", value: "Automotive interior + out-of-stock QA" },
    ],
    relatedSlugs: ["umtuba-concept-trunk-organizer"],
    priceMinor: 1199,
    variants: [
      { suffix: "black", title: "Black", options: { color: "black" }, onHand: 9 },
      { suffix: "chrome", title: "Chrome", options: { color: "chrome" }, onHand: 0 },
    ],
  },
  {
    slug: "umtuba-concept-trunk-organizer",
    title: "UMTUBA Concept Trunk Organizer",
    short: "Owned future trunk organizer for Automotive storage browse.",
    long: "A collapsible trunk organizer concept in Compact or Large. Automotive organization taxonomy. Not an OEM or vehicle-brand accessory.",
    category: "automotive-accessories",
    taxonomy: taxonomy("automotive", "organization", "trunk"),
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["organization"],
    searchKeywords: ["trunk organizer", "car organizer", "automotive", "storage", "boot"],
    filter: { color: ["charcoal"], size: ["compact", "large"], material: ["nylon"], audience: ["adult"] },
    specifications: [
      { name: "Sizes", value: "Compact, Large" },
      { name: "Construction", value: "Collapsible nylon demo profile" },
      { name: "Vehicle listing", value: "No" },
      { name: "Catalog use", value: "Owned car-organization concept" },
    ],
    relatedSlugs: ["umtuba-demo-seat-hook"],
    priceMinor: 3299,
    variants: [
      { suffix: "compact", title: "Compact", options: { size: "compact" }, onHand: 4 },
      { suffix: "large", title: "Large", options: { size: "large" }, onHand: 3 },
    ],
  },
  {
    slug: "umtuba-demo-desk-tray",
    title: "UMTUBA Demo Desk Tray",
    short: "Synthetic desk tray for Office desktop filters.",
    long: "A shallow desk tray in Oak or Graphite for Office desktop taxonomy and related-lamp / cable-clip merchandising.",
    category: "office",
    taxonomy: taxonomy("office", "desktop", "trays"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["desk"],
    searchKeywords: ["desk tray", "tray", "organizer", "office", "oak", "graphite"],
    filter: { color: ["oak", "graphite"], size: ["standard"], material: ["wood-composite"], audience: ["adult"] },
    specifications: [
      { name: "Shape", value: "Shallow rectangle (synthetic)" },
      { name: "Color options", value: "Oak, Graphite" },
      { name: "Use", value: "Desktop catch-all" },
      { name: "Catalog use", value: "Office desktop filters" },
    ],
    relatedSlugs: ["umtuba-concept-desk-lamp", "umtuba-concept-cable-clips"],
    priceMinor: 1899,
    variants: [
      { suffix: "oak", title: "Oak", options: { color: "oak" }, onHand: 6 },
      { suffix: "graphite", title: "Graphite", options: { color: "graphite" }, onHand: 5 },
    ],
  },
  {
    slug: "umtuba-concept-cable-clips",
    title: "UMTUBA Concept Cable Clips",
    short: "Owned future adhesive cable-clip packs for Office cable management.",
    long: "Adhesive cable clips in a 6-pack or 12-pack. Office cable-management taxonomy and related-electronics merchandising. Not a branded cable-system SKU.",
    category: "office",
    taxonomy: taxonomy("office", "cable-management", "clips"),
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["desk"],
    searchKeywords: ["cable clips", "clips", "cables", "office", "desk", "organizer"],
    filter: { color: ["clear"], size: ["6-pack", "12-pack"], material: ["plastic"], audience: ["adult"] },
    specifications: [
      { name: "Pack options", value: "6-pack, 12-pack" },
      { name: "Mount", value: "Adhesive demo profile" },
      { name: "Use", value: "Desktop cable routing" },
      { name: "Catalog use", value: "Owned office-cable concept" },
    ],
    relatedSlugs: ["umtuba-concept-desk-lamp", "umtuba-demo-desk-tray"],
    priceMinor: 899,
    variants: [
      { suffix: "6pack", title: "6-pack", options: { pack: "6-pack" }, onHand: 10 },
      { suffix: "12pack", title: "12-pack", options: { pack: "12-pack" }, onHand: 8 },
    ],
  },
  {
    slug: "umtuba-demo-print-pack",
    title: "UMTUBA Demo Print Pack",
    short: "Synthetic digital printable pack. Not a live file store.",
    long: "A digital printable pack for Digital downloads taxonomy. No physical inventory applies. Not a live file store and not a licensed art collection.",
    category: "digital-other",
    taxonomy: taxonomy("digital-products", "downloads", "printables"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["digital"],
    searchKeywords: ["print pack", "printable", "digital", "download", "pdf"],
    filter: { color: [], size: [], material: [], audience: ["adult"] },
    specifications: [
      { name: "Format", value: "Digital printable (synthetic)" },
      { name: "Delivery", value: "Demo download path only" },
      { name: "Physical stock", value: "Not applicable" },
      { name: "Catalog use", value: "Digital category QA" },
    ],
    relatedSlugs: ["umtuba-concept-icon-set"],
    priceMinor: 599,
    variants: [{ suffix: "digital", title: "Digital license (demo)", options: { format: "digital" }, onHand: null }],
  },
  {
    slug: "umtuba-concept-icon-set",
    title: "UMTUBA Concept Icon Set",
    short: "Owned future digital icon-set concept. Not a partner asset pack.",
    long: "A first-party icon-set concept for Digital creative-assets taxonomy. No physical on-hand. Not a third-party icon foundry product.",
    category: "digital-other",
    taxonomy: taxonomy("digital-products", "downloads", "icon-packs"),
    conceptKind: "UMTUBA_OWNED_FUTURE",
    tags: ["digital"],
    searchKeywords: ["icons", "icon set", "digital", "download", "assets", "svg"],
    filter: { color: [], size: [], material: [], audience: ["adult"] },
    specifications: [
      { name: "Format", value: "Vector icon set (synthetic)" },
      { name: "Delivery", value: "Demo download path only" },
      { name: "Physical stock", value: "Not applicable" },
      { name: "Catalog use", value: "Owned digital-asset concept" },
    ],
    relatedSlugs: ["umtuba-demo-print-pack"],
    priceMinor: 1299,
    variants: [{ suffix: "digital", title: "Digital license (demo)", options: { format: "digital" }, onHand: null }],
  },
  {
    slug: "umtuba-demo-travel-pouch",
    title: "UMTUBA Demo Travel Pouch",
    short: "Synthetic zip pouch for Accessories travel search.",
    long: "A zip travel pouch in Sand or Navy. Accessories travel taxonomy and related tote / card-sleeve mapping.",
    category: "accessories",
    taxonomy: taxonomy("accessories", "travel", "pouches"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["travel"],
    searchKeywords: ["pouch", "travel pouch", "zip", "accessories", "sand", "navy"],
    filter: { color: ["sand", "navy"], size: ["standard"], material: ["nylon"], audience: ["adult"] },
    specifications: [
      { name: "Closure", value: "Zip (synthetic)" },
      { name: "Color options", value: "Sand, Navy" },
      { name: "Use", value: "Small-item travel" },
      { name: "Catalog use", value: "Accessories travel search" },
    ],
    relatedSlugs: ["umtuba-demo-canvas-tote", "umtuba-concept-card-sleeve"],
    priceMinor: 1699,
    variants: [
      { suffix: "sand", title: "Sand", options: { color: "sand" }, onHand: 5 },
      { suffix: "navy", title: "Navy", options: { color: "navy" }, onHand: 4 },
    ],
  },
  {
    slug: "umtuba-demo-water-bottle",
    title: "UMTUBA Demo Water Bottle",
    short: "Synthetic bottle for Sports hydration plus Home-adjacent tags.",
    long: "A reusable bottle in 500 ml or 750 ml. Sports hydration taxonomy. Current list price is a synthetic PRICE_CHANGED example versus a prior fixture price — not a promotion.",
    category: "sports",
    taxonomy: taxonomy("sports-outdoors", "hydration", "bottles"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["hydrate"],
    searchKeywords: ["water bottle", "bottle", "hydrate", "sports", "500ml", "750ml"],
    filter: { color: ["slate"], size: ["500ml", "750ml"], material: ["stainless"], audience: ["adult"] },
    specifications: [
      { name: "Capacities", value: "500 ml, 750 ml" },
      { name: "Material", value: "Stainless demo profile" },
      { name: "Lid", value: "Screw cap (synthetic)" },
      { name: "Catalog use", value: "Sports hydration + price-change fixture" },
    ],
    relatedSlugs: ["umtuba-demo-resistance-band", "umtuba-concept-studio-mat"],
    priceMinor: 2199,
    variants: [
      { suffix: "500ml", title: "500 ml", options: { capacity: "500ml" }, onHand: 6 },
      { suffix: "750ml", title: "750 ml", options: { capacity: "750ml" }, onHand: 4 },
    ],
  },
  {
    slug: "umtuba-demo-bookmark-set",
    title: "UMTUBA Demo Bookmark Set",
    short: "Synthetic bookmark set listed under Books reading accessories.",
    long: "A cardstock bookmark set in a 3-pack or 6-pack. Books reading-accessories taxonomy and related notebook / handbook mapping.",
    category: "books",
    taxonomy: taxonomy("books", "reading", "bookmarks"),
    conceptKind: "SYNTHETIC_DEMO",
    tags: ["reading"],
    searchKeywords: ["bookmark", "bookmarks", "reading", "books", "set"],
    filter: { color: ["mixed"], size: ["3-pack", "6-pack"], material: ["cardstock"], audience: ["adult"] },
    specifications: [
      { name: "Pack options", value: "3-pack, 6-pack" },
      { name: "Material", value: "Cardstock demo profile" },
      { name: "Use", value: "Reading accessory" },
      { name: "Catalog use", value: "Books reading accessories" },
    ],
    relatedSlugs: ["umtuba-demo-field-notes", "umtuba-concept-platform-handbook"],
    priceMinor: 699,
    variants: [
      { suffix: "3pack", title: "3-pack", options: { pack: "3-pack" }, onHand: 8 },
      { suffix: "6pack", title: "6-pack", options: { pack: "6-pack" }, onHand: 7 },
    ],
  },
];

function productSku(slug: string): string {
  const core = slug.replace(/^umtuba-(demo|concept)-/, "").toUpperCase();
  return `DEMO-${core}`;
}

function inventoryKindFor(category: DemoCategorySlug): DemoInventoryKind {
  return category === "digital-other" ? "DIGITAL" : "PHYSICAL";
}

function stockStateFor(onHand: number | null, kind: DemoInventoryKind): DemoStockState {
  if (kind === "DIGITAL") return "DIGITAL_NOT_APPLICABLE";
  if (onHand == null || onHand <= 0) return "OUT_OF_STOCK";
  if (onHand <= 3) return "LOW_STOCK";
  return "IN_STOCK";
}

function priceBandFor(priceMinor: number): DemoPriceBand {
  if (priceMinor < 1500) return "under-15";
  if (priceMinor < 3000) return "15-30";
  if (priceMinor < 5000) return "30-50";
  return "over-50";
}

function variantsFor(seed: Seed): DemoVariant[] {
  const kind = inventoryKindFor(seed.category);
  const rows =
    seed.variants ??
    [
      {
        suffix: "default",
        title: kind === "DIGITAL" ? "Digital license (demo)" : "Standard",
        options: {},
        onHand: kind === "DIGITAL" ? null : 5,
      },
    ];
  return rows.map((row) => ({
    id: `${seed.slug}-${row.suffix}`,
    sku: `${productSku(seed.slug)}-${row.suffix.toUpperCase()}`.slice(0, 64),
    title: row.title,
    optionValues: row.options,
    priceMinor: seed.priceMinor,
    currency: "USD",
    onHand: kind === "DIGITAL" ? null : row.onHand,
    inventoryKind: kind,
    stockState: stockStateFor(kind === "DIGITAL" ? null : row.onHand, kind),
  }));
}

function toProduct(seed: Seed, index: number): DemoProduct {
  const kind = inventoryKindFor(seed.category);
  return {
    id: `demo-${String(index + 1).padStart(2, "0")}-${seed.slug}`,
    slug: seed.slug,
    sku: productSku(seed.slug),
    title: seed.title,
    shortDescription: seed.short,
    description: `${seed.long}${LEGAL_SUFFIX}`,
    category: seed.category,
    taxonomy: seed.taxonomy,
    productType: kind === "DIGITAL" ? "digital" : "physical",
    sourceType: DEMO_SOURCE_TYPE,
    rightsStatus: DEMO_RIGHTS_STATUS,
    purchasable: DEMO_PURCHASABLE,
    productionSellable: DEMO_PRODUCTION_SELLABLE,
    realProvider: DEMO_REAL_PROVIDER,
    conceptKind: seed.conceptKind,
    tags: seed.tags,
    searchKeywords: seed.searchKeywords,
    filterAttributes: {
      ...seed.filter,
      fulfillment: kind === "DIGITAL" ? "digital" : "physical",
      priceBand: priceBandFor(seed.priceMinor),
    },
    specifications: seed.specifications,
    shipping: kind === "DIGITAL" ? DIGITAL_SHIPPING : PHYSICAL_SHIPPING,
    returns: kind === "DIGITAL" ? DIGITAL_RETURNS : PHYSICAL_RETURNS,
    relatedProductSlugs: seed.relatedSlugs,
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

export function getUmtubaDemoProductBySku(sku: string): DemoProduct | null {
  const needle = sku.trim().toUpperCase();
  return (
    UMTUBA_DEMO_PRODUCTS.find(
      (product) =>
        product.sku === needle || product.variants.some((variant) => variant.sku === needle)
    ) ?? null
  );
}
