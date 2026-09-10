/**
 * Customer-facing Store departments and subcategories for the 300-product expansion.
 * Exact labels from UMTUBA_STORE_CJ_CATALOG_EXPANSION_300_V1.
 */

export const CJ_EXPANSION_TASK_ID = "UMTUBA_STORE_CJ_CATALOG_EXPANSION_300_V1" as const;
export const CJ_EXPANSION_JSON_RELATIVE_PATH = "data/cj-catalog-expansion-300-v1.json" as const;
export const TARGET_ADDITIONAL_PRODUCTS = 300;

export const STORE_DEPARTMENTS = [
  "HOME",
  "FASHION",
  "BEAUTY & PERSONAL",
  "CAR",
  "PET",
  "TRAVEL",
  "ELECTRONICS & ACCESSORIES",
  "KIDS & TOYS",
  "SPORTS & FITNESS",
  "GARDEN & OUTDOOR",
] as const;
export type StoreDepartment = (typeof STORE_DEPARTMENTS)[number];

export const STORE_SUBCATEGORIES: Record<StoreDepartment, readonly string[]> = {
  HOME: [
    "Kitchen",
    "Baking",
    "Storage & Organization",
    "Cleaning",
    "Bathroom",
    "Lighting",
    "Home Decor",
    "Small Home Accessories",
  ],
  FASHION: [
    "Women",
    "Men",
    "Kids",
    "Bags",
    "Fashion Accessories",
    "Jewellery",
    "Scarves / Hats / Small Accessories",
  ],
  "BEAUTY & PERSONAL": [
    "Makeup Tools",
    "Hair Accessories",
    "Personal Care Tools",
    "Nail Accessories",
    "Beauty Organizers",
  ],
  CAR: [
    "Phone Holders",
    "Interior Organization",
    "Cleaning",
    "Travel Accessories",
    "Small Car Accessories",
  ],
  PET: [
    "Cats",
    "Dogs",
    "Bowls & Feeding",
    "Travel",
    "Grooming",
    "Toys & Accessories",
  ],
  TRAVEL: [
    "Luggage Organization",
    "Packing Accessories",
    "Travel Comfort",
    "Travel Safety",
    "Portable Accessories",
  ],
  "ELECTRONICS & ACCESSORIES": [
    "Phone Accessories",
    "Desk Accessories",
    "Cables / Adapters",
    "Stands / Holders",
    "Small Smart Accessories",
  ],
  "KIDS & TOYS": [
    "Educational Toys",
    "Travel Accessories",
    "Organization",
    "Safe Lightweight Toys",
  ],
  "SPORTS & FITNESS": [
    "Workout Accessories",
    "Resistance / Stretching",
    "Small Fitness Tools",
    "Outdoor Accessories",
  ],
  "GARDEN & OUTDOOR": [
    "Garden Tools",
    "Plant Accessories",
    "Outdoor Organization",
    "Solar / Outdoor Accessories",
  ],
};

export type StoreSubcategory = (typeof STORE_SUBCATEGORIES)[StoreDepartment][number];

export const EXPANSION_SEARCH_KEYWORDS: Record<
  StoreDepartment,
  Partial<Record<string, readonly string[]>>
> = {
  HOME: {
    Kitchen: ["silicone spatula set", "garlic press kitchen", "oil brush basting"],
    Baking: ["silicone baking mat", "measuring spoon set", "cookie cutter set"],
    "Storage & Organization": ["drawer organizer tray", "cable management box", "closet shelf divider"],
    Cleaning: ["lint roller set", "mini dustpan brush", "squeegee window small"],
    Bathroom: ["soap dispenser bathroom", "toothbrush holder", "shower hook rack"],
    Lighting: ["LED night light plug", "closet motion light", "book reading light"],
    "Home Decor": ["photo clip string", "ceramic bud vase", "wall hook decor"],
    "Small Home Accessories": ["door stopper", "adhesive hook set", "key holder wall"],
  },
  FASHION: {
    Women: ["silk scrunchie set", "women satin hair band", "pearl hair pin"],
    Men: ["men leather belt casual", "men wallet slim", "tie clip set"],
    Kids: ["kids hair clip set", "children backpack charm", "kids hair bow"],
    Bags: ["canvas tote bag", "mini crossbody bag", "cosmetic pouch bag"],
    "Fashion Accessories": ["brooch pin set", "belt bag fashion", "keychain charm set"],
    Jewellery: ["stainless steel necklace", "beaded bracelet set", "ear cuff set"],
    "Scarves / Hats / Small Accessories": ["knit beanie hat", "silk scarf square", "bucket hat unisex"],
  },
  "BEAUTY & PERSONAL": {
    "Makeup Tools": ["makeup sponge set", "eyelash comb", "makeup brush cleaner"],
    "Hair Accessories": ["hair claw clip large", "bobby pin box", "hair tie set"],
    "Personal Care Tools": ["foot file pedicure", "nail clipper set", "eyebrow razor"],
    "Nail Accessories": ["nail art brush set", "cuticle pusher", "nail buffer block"],
    "Beauty Organizers": ["makeup organizer tray", "travel cosmetic pouch", "lipstick holder"],
  },
  CAR: {
    "Phone Holders": ["magnetic car phone mount", "vent phone holder", "dashboard phone cradle"],
    "Interior Organization": ["car seat gap organizer", "car trash bin", "backseat organizer"],
    Cleaning: ["car detailing brush", "microfiber car cloth", "car vent cleaner"],
    "Travel Accessories": ["car headrest hook", "car visor organizer", "car tissue holder"],
    "Small Car Accessories": ["car air vent clip", "car cup holder expander", "car seatbelt adjuster"],
  },
  PET: {
    Cats: ["cat toy wand", "catnip toy mouse", "cat scratcher cardboard"],
    Dogs: ["dog poop bag dispenser", "dog rope toy", "dog training clicker"],
    "Bowls & Feeding": ["slow feeder pet bowl", "elevated pet bowl", "pet food scoop"],
    Travel: ["folding pet bowl travel", "pet car seat belt", "pet water bottle travel"],
    Grooming: ["pet grooming glove", "dog slicker brush", "pet nail file"],
    "Toys & Accessories": ["pet treat puzzle", "cat tunnel toy", "pet bandana"],
  },
  TRAVEL: {
    "Luggage Organization": ["packing cube set", "compression packing bag", "shoe bag travel"],
    "Packing Accessories": ["luggage tag set", "toiletry bottle set", "travel bottle funnel"],
    "Travel Comfort": ["travel neck pillow", "eye mask earplug", "travel blanket compact"],
    "Travel Safety": ["passport holder travel", "cable lock luggage", "luggage strap"],
    "Portable Accessories": ["travel toothbrush case", "folding shopping bag", "travel soap case"],
  },
  "ELECTRONICS & ACCESSORIES": {
    "Phone Accessories": ["phone ring holder", "silicone cable protector", "phone lanyard strap"],
    "Desk Accessories": ["desk cable clip", "monitor stand riser", "mouse wrist rest"],
    "Cables / Adapters": ["usb c cable organizer", "multi port usb hub", "cable sleeve wrap"],
    "Stands / Holders": ["phone desk stand", "tablet stand foldable", "laptop book stand"],
    "Small Smart Accessories": ["webcam cover slide", "laptop stand portable", "cable drop clips"],
  },
  "KIDS & TOYS": {
    "Educational Toys": ["wooden puzzle kids", "stacking cups toy", "counting beads toy"],
    "Travel Accessories": ["kids travel activity", "car seat toy strap", "kids snack cup"],
    Organization: ["kids toy storage bin", "crayon organizer", "kids book ends"],
    "Safe Lightweight Toys": ["soft building blocks", "bath toy set", "plush ball kids"],
  },
  "SPORTS & FITNESS": {
    "Workout Accessories": ["yoga strap cotton", "gym towel microfiber", "sweatband set"],
    "Resistance / Stretching": ["resistance band set", "stretching strap", "yoga block foam"],
    "Small Fitness Tools": ["hand grip strengthener", "massage ball set", "jump rope"],
    "Outdoor Accessories": ["running armband", "water bottle holder", "reflective arm band"],
  },
  "GARDEN & OUTDOOR": {
    "Garden Tools": ["garden hand trowel", "pruning shear small", "garden kneeling pad"],
    "Plant Accessories": ["plant watering globe", "nursery pot set", "plant labels"],
    "Outdoor Organization": ["garden tool hanger", "hose holder wall", "garden glove clip"],
    "Solar / Outdoor Accessories": ["solar path light", "outdoor string clip", "garden plant clip"],
  },
};

export function assertTaxonomyComplete(): void {
  if (STORE_DEPARTMENTS.length !== 10) {
    throw new Error("Expected exactly 10 Store departments");
  }
  const home = STORE_SUBCATEGORIES.HOME.length;
  const fashion = STORE_SUBCATEGORIES.FASHION.length;
  if (home !== 8 || fashion !== 7) {
    throw new Error("Department subcategory counts drifted from the brief");
  }
}

export function mapLaunchCategoryToDepartment(
  category: string
): { department: StoreDepartment; subcategory: string } {
  switch (category) {
    case "Pet":
      return { department: "PET", subcategory: "Bowls & Feeding" };
    case "Car":
      return { department: "CAR", subcategory: "Small Car Accessories" };
    case "Travel":
      return { department: "TRAVEL", subcategory: "Packing Accessories" };
    case "Beauty / Personal":
    case "Beauty":
      return { department: "BEAUTY & PERSONAL", subcategory: "Makeup Tools" };
    default:
      return { department: "HOME", subcategory: "Small Home Accessories" };
  }
}

export function familyFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (/\b(kitchen knife|chef knife|knife set)\b/.test(t)) return "kitchen_knife";
  if (/garlic press|garlic crusher|garlic masher|garlic pound/.test(t)) return "garlic_press";
  if (/ice (cube |tray|maker|bucket)/.test(t)) return "ice_tray";
  if (/phone case|iphone case|soft case/.test(t)) return "phone_case";
  if (/bowl|feeder/.test(t)) return "bowl";
  if (/necklace|bracelet|earring|jewellery|jewelry|ring /.test(t)) return "jewellery";
  if (/phone holder|phone mount|phone stand/.test(t)) return "phone_holder";
  if (/packing cube/.test(t)) return "packing_cube";
  if (/makeup brush/.test(t)) return "makeup_brush";
  if (/hair clip|claw clip|scrunchie/.test(t)) return "hair_clip";
  if (/night light/.test(t)) return "night_light";
  if (/resistance band/.test(t)) return "resistance_band";
  if (/sink (drain|strainer|stopper)|hair catcher/.test(t)) return "sink_strainer";
  if (/oil (spray|bottle)|spray press/.test(t)) return "oil_sprayer";
  const tokens = t.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  return tokens.slice(0, 3).join("_") || "general";
}

export const FAMILY_CAPS: Record<string, number> = {
  phone_case: 4,
  bowl: 6,
  jewellery: 5,
  phone_holder: 8,
  packing_cube: 6,
  makeup_brush: 5,
  hair_clip: 6,
  night_light: 5,
  resistance_band: 4,
  garlic_press: 4,
  ice_tray: 3,
  kitchen_knife: 0,
  sink_strainer: 4,
  oil_sprayer: 3,
};
