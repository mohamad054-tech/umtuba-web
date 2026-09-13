import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadStoreBrowseCatalog } from "../../lib/services/cj/expansionBrowse";
import {
  localizationCatalogPath,
  localizationFinalCatalogPath,
  readLocalizationCatalogFileFromPath,
  refreshCatalogMetrics,
} from "../../lib/store/productLocalization/catalogFile";
import { PRODUCT_LOCALIZATION_FINAL_22_TASK_ID } from "../../lib/store/productLocalization/constants";
import { applyGeminiCopy, type GeminiCopyOut } from "../../lib/store/productLocalization/geminiBatch";
import { publishableStats } from "../../lib/store/productLocalization/publishable";
import type { LocalizationCatalogFile, LocalizedCatalogProduct } from "../../lib/store/productLocalization/types";

const TASK_ID = PRODUCT_LOCALIZATION_FINAL_22_TASK_ID;
const EXPECTED_CANONICAL_SHA256 = "0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb";
const EXPECTED_SOURCE_SHA256 = "c07179cddf978093acc9e188293bd269942db1657cab3b12cec828d56eeb3168";
const EXPECTED_TOTAL = 532;
const EXPECTED_REVIEW = 22;
const SOURCE_RELATIVE = "data/cj-catalog-532-localized-final-v1.GEMINI_198_CANDIDATE.json";
const OUTPUT_RELATIVE = "data/cj-catalog-532-localized-final-v1.FINAL_22_CANDIDATE.json";
const PRIOR_FAILURE_RELATIVE =
  "docs/ai/recovery/UMTUBA_STORE_GEMINI_CURRENT_198_NEW_LOCALIZATION_V1/failure-ids.json";
const RECOVERY_RELATIVE = "docs/ai/recovery/UMTUBA_STORE_FINAL_22_LOCALIZATION_REVIEW_V1";

const INPUT_IDS = [
  "1359044603478675456",
  "1360080266508505088",
  "1376513937130000384",
  "1392067844971302912",
  "1404623861760266240",
  "1405434203297943552",
  "1429317075750490112",
  "1447901045861781504",
  "1467092240978546688",
  "1594961358263693312",
  "1753982835490304000",
  "1796518153233633280",
  "19583873-3C62-48C5-BE3E-B01791CC71E2",
  "20B24E49-68D5-4A7E-A17A-C4580004C59F",
  "2406180737491620300",
  "2408150612121603200",
  "52022F6B-104F-453E-A1E6-73797FF89B87",
  "6393DCAD-3885-42D4-B6BC-ADF846AB8CB2",
  "8800BE41-B655-4594-8BFD-6BF53003231F",
  "C0080972-C4DC-47BD-BDA5-B6F0B4484C42",
  "C9052A90-6D89-419A-8A7C-BC34FA08B426",
  "EE1DC650-D8A1-477D-83D5-A5EFEA81FEB2",
] as const;

type GapBucket = "unsupported_claim" | "changed_numeric_value" | "suspicious_mt_artifact" | "title_spam";

const INPUT_BUCKETS: Record<(typeof INPUT_IDS)[number], GapBucket> = {
  "1359044603478675456": "unsupported_claim",
  "1360080266508505088": "unsupported_claim",
  "1376513937130000384": "unsupported_claim",
  "1392067844971302912": "unsupported_claim",
  "1404623861760266240": "unsupported_claim",
  "1405434203297943552": "changed_numeric_value",
  "1429317075750490112": "suspicious_mt_artifact",
  "1447901045861781504": "changed_numeric_value",
  "1467092240978546688": "changed_numeric_value",
  "1594961358263693312": "unsupported_claim",
  "1753982835490304000": "unsupported_claim",
  "1796518153233633280": "title_spam",
  "19583873-3C62-48C5-BE3E-B01791CC71E2": "suspicious_mt_artifact",
  "20B24E49-68D5-4A7E-A17A-C4580004C59F": "unsupported_claim",
  "2406180737491620300": "unsupported_claim",
  "2408150612121603200": "changed_numeric_value",
  "52022F6B-104F-453E-A1E6-73797FF89B87": "unsupported_claim",
  "6393DCAD-3885-42D4-B6BC-ADF846AB8CB2": "unsupported_claim",
  "8800BE41-B655-4594-8BFD-6BF53003231F": "unsupported_claim",
  "C0080972-C4DC-47BD-BDA5-B6F0B4484C42": "unsupported_claim",
  "C9052A90-6D89-419A-8A7C-BC34FA08B426": "unsupported_claim",
  "EE1DC650-D8A1-477D-83D5-A5EFEA81FEB2": "unsupported_claim",
};

type IntegrityCounts = {
  product_ids_changed: number;
  prices_changed: number;
  costs_changed: number;
  margins_changed: number;
  commercial_flags_changed: number;
  ip_flags_changed: number;
};

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assertSafeOutputPath(outputPath: string, extraForbidden: string[]): void {
  const resolved = resolve(outputPath);
  const forbidden = extraForbidden.map((path) => resolve(path));
  if (forbidden.includes(resolved)) {
    throw new Error("refusing_to_write_canonical_live_or_source_candidate_path");
  }
}

function localizationReviewRows(products: LocalizedCatalogProduct[]): LocalizedCatalogProduct[] {
  return products.filter((row) => (row.catalog_qa ?? []).some((item) => item.flag === "LOCALIZATION_REVIEW"));
}

function commercialFlagKey(row: LocalizedCatalogProduct): string {
  return (row.catalog_qa ?? [])
    .filter((item) => item.flag !== "LOCALIZATION_REVIEW")
    .map((item) => `${item.flag}:${item.reason}`)
    .sort()
    .join("|");
}

function ipFlagKey(row: LocalizedCatalogProduct): string {
  return (row.catalog_qa ?? [])
    .filter((item) => item.flag === "IP_REVIEW")
    .map((item) => item.reason)
    .sort()
    .join("|");
}

function compareIntegrity(
  before: LocalizedCatalogProduct[],
  after: LocalizedCatalogProduct[]
): IntegrityCounts {
  const beforeById = new Map(before.map((row) => [row.cj_product_id, row]));
  const afterIds = new Set(after.map((row) => row.cj_product_id));
  let product_ids_changed = 0;
  if (before.length !== after.length) product_ids_changed += Math.abs(before.length - after.length);
  for (const row of before) {
    if (!afterIds.has(row.cj_product_id)) product_ids_changed += 1;
  }
  for (const row of after) {
    if (!beforeById.has(row.cj_product_id)) product_ids_changed += 1;
  }
  let prices_changed = 0;
  let costs_changed = 0;
  let margins_changed = 0;
  let commercial_flags_changed = 0;
  let ip_flags_changed = 0;
  for (const next of after) {
    const prev = beforeById.get(next.cj_product_id);
    if (!prev) continue;
    if (prev.retail_price_minor !== next.retail_price_minor || prev.currency !== next.currency) {
      prices_changed += 1;
    }
    const prevRecord = prev as unknown as Record<string, unknown>;
    const nextRecord = next as unknown as Record<string, unknown>;
    for (const key of ["landed_cost_minor", "supplier_cost_minor", "cost_minor"]) {
      if (prevRecord[key] !== nextRecord[key] && (key in prevRecord || key in nextRecord)) {
        costs_changed += 1;
        break;
      }
    }
    for (const key of ["gross_margin", "margin"]) {
      if (prevRecord[key] !== nextRecord[key] && (key in prevRecord || key in nextRecord)) {
        margins_changed += 1;
        break;
      }
    }
    if (commercialFlagKey(prev) !== commercialFlagKey(next)) commercial_flags_changed += 1;
    if (ipFlagKey(prev) !== ipFlagKey(next)) ip_flags_changed += 1;
  }
  return {
    product_ids_changed,
    prices_changed,
    costs_changed,
    margins_changed,
    commercial_flags_changed,
    ip_flags_changed,
  };
}

function draft(partial: Omit<GeminiCopyOut, "i">): GeminiCopyOut {
  return { i: 1, ...partial };
}

const SURGICAL_DRAFTS: Record<string, GeminiCopyOut> = {
  "1359044603478675456": draft({
    title_en_clean: "Makeup Brush Set",
    title_ar: "طقم فرش مكياج",
    description_en_clean:
      "A makeup brush set listed as a full set of makeup tools. Brush materials and piece count are not supplied.",
    description_ar:
      "طقم فرش مكياج مذكور كمجموعة كاملة من أدوات المكياج. عدد القطع وخامات الفرش غير مذكورة في عنوان المورّد.",
    specifications_en: [
      "Product: makeup brush set",
      "Listed as: full set of makeup tools",
      "Piece count: not supplied",
    ],
    specifications_ar: [
      "المنتج: طقم فرش مكياج",
      "الوصف المذكور: مجموعة كاملة من أدوات المكياج",
      "عدد القطع: غير مذكور",
    ],
    search_keywords_en: ["makeup brush set", "makeup tools"],
    search_keywords_ar: ["طقم فرش مكياج", "أدوات مكياج"],
  }),
  "1360080266508505088": draft({
    title_en_clean: "Clip-In False Bang Hair Piece",
    title_ar: "خصلة غرة شعر مستعارة بمشبك",
    description_en_clean:
      "A clip-in false bang hair piece. Listed color options are black, brown, and auburn red. The supplier title includes the word Natural as a style label only.",
    description_ar:
      "خصلة غرة شعر مستعارة تُثبَّت بمشبك. الألوان المذكورة هي الأسود والبني والأحمر الكستنائي. يظهر في عنوان المورّد وصف Natural كنعت للمظهر فقط.",
    specifications_en: [
      "Attachment: clip-in",
      "Style: false bangs",
      "Colors listed: black, brown, auburn red",
    ],
    specifications_ar: [
      "التثبيت: مشبك",
      "النمط: غرة مستعارة",
      "الألوان المذكورة: أسود، بني، أحمر كستنائي",
    ],
    search_keywords_en: ["clip in false bangs", "false hair bang"],
    search_keywords_ar: ["غرة شعر مستعارة", "خصلة بمشبك"],
  }),
  "1376513937130000384": draft({
    title_en_clean: "Bite-Resistant Slow Food Leakage Ball",
    title_ar: "كرة تسريب طعام بطيء مقاومة للعض",
    description_en_clean:
      "A bite-resistant food leakage ball for dogs and cats. Listed as a slow pet food toy that releases food during play.",
    description_ar:
      "كرة تسريب طعام مقاومة للعض للكلاب والقطط. مذكورة كلعبة طعام بطيء تُخرج الطعام أثناء اللعب.",
    specifications_en: [
      "Type: food leakage ball",
      "Listed as: bite resistant, slow",
      "For: dogs and cats",
    ],
    specifications_ar: ["النوع: كرة تسريب طعام", "المذكور: مقاومة للعض وبطيئة", "للكلاب والقطط"],
    search_keywords_en: ["food leakage ball", "slow feeding dog toy"],
    search_keywords_ar: ["كرة تسريب طعام", "لعبة كلاب بطيئة"],
  }),
  "1392067844971302912": draft({
    title_en_clean: "Hands-Free Dog Leash with Waist Bag",
    title_ar: "حبل مشي للكلاب مع حقيبة خصر",
    description_en_clean:
      "A hands-free dog training leash with a waist bag for outdoor walking and running. Storage is listed for dog food, a water cup, and bags.",
    description_ar:
      "حبل تدريب للكلاب يُستخدم دون اليدين مع حقيبة خصر للمشي والجري في الخارج. التخزين المذكور يشمل طعام الكلب وكوب الماء والأكياس.",
    specifications_en: [
      "Type: hands-free leash with waist bag",
      "Listed use: training, walking, running",
      "Storage listed: dog food, water cup, bags",
    ],
    specifications_ar: [
      "النوع: حبل مشي مع حقيبة خصر",
      "الاستخدام المذكور: تدريب ومشي وجري",
      "التخزين المذكور: طعام الكلب وكوب ماء وأكياس",
    ],
    search_keywords_en: ["hands free dog leash", "dog waist bag"],
    search_keywords_ar: ["حبل مشي للكلاب", "حقيبة خصر للكلاب"],
  }),
  "1404623861760266240": draft({
    title_en_clean: "Small Pet Carrier",
    title_ar: "حقيبة نقل حيوانات أليفة صغيرة",
    description_en_clean:
      "A small-size pet carrier. Other dimensions, materials, and uses are not supplied beyond the title.",
    description_ar:
      "حقيبة نقل للحيوانات الأليفة بمقاس صغير. الأبعاد والخامات والاستخدامات الأخرى غير مذكورة بما يتجاوز عنوان المورّد.",
    specifications_en: ["Product: pet carrier", "Size listed: small"],
    specifications_ar: ["المنتج: حقيبة نقل حيوانات أليفة", "المقاس المذكور: صغير"],
    search_keywords_en: ["small pet carrier", "pet carrier bag"],
    search_keywords_ar: ["حقيبة نقل حيوانات", "حقيبة صغيرة للحيوانات"],
  }),
  "1405434203297943552": draft({
    title_en_clean: "KW310 Car Diagnostic Scanner",
    title_ar: "جهاز فحص سيارات KW310",
    description_en_clean:
      "A KW310 car diagnostic scanner listed as a barcode reader tool. No extra connector type is supplied in the title.",
    description_ar:
      "جهاز فحص سيارات طراز KW310 مذكور أيضاً كأداة قراءة باركود. نوع الموصل الإضافي غير مذكور في عنوان المورّد.",
    specifications_en: [
      "Model: KW310",
      "Type: car diagnostic scanner",
      "Also listed: barcode reader tool",
    ],
    specifications_ar: ["الطراز: KW310", "النوع: جهاز فحص سيارات", "أيضاً: أداة قراءة باركود"],
    search_keywords_en: ["KW310 scanner", "car diagnostic scanner"],
    search_keywords_ar: ["جهاز فحص KW310", "ماسح سيارات"],
  }),
  "1429317075750490112": draft({
    title_en_clean: "Foldable Storage Pet Dog Stairs",
    title_ar: "درج قابل للطي للكلاب مع تخزين",
    description_en_clean:
      "Foldable pet dog stairs with storage. The listing does not add height, step count, or extra uses beyond the supplier title.",
    description_ar:
      "درج قابل للطي للكلاب مع مساحة تخزين. لا تضيف هذه البطاقة ارتفاعاً أو عدد درجات أو استخدامات غير مذكورة في عنوان المورّد.",
    specifications_en: ["Product: pet dog stairs", "Design listed: foldable storage"],
    specifications_ar: ["المنتج: درج للكلاب", "التصميم المذكور: قابل للطي مع تخزين"],
    search_keywords_en: ["foldable pet stairs", "dog stairs storage"],
    search_keywords_ar: ["درج كلاب قابل للطي", "درج حيوانات مع تخزين"],
  }),
  "1447901045861781504": draft({
    title_en_clean: "Five-Piece 280mL Standard Mouth PP Bottle Set",
    title_ar: "طقم رضّاعات فم قياسي بسعة 280 مل",
    description_en_clean: "A five-piece PP baby bottle set. Each listed bottle is 280mL with a standard mouth.",
    description_ar:
      "طقم رضّاعات أطفال من البولي بروبيلين مكوّن من خمس قطع. السعة المذكورة 280 مل بفم قياسي.",
    specifications_en: [
      "Quantity listed: five-piece",
      "Capacity: 280mL",
      "Material: PP",
      "Mouth: standard",
    ],
    specifications_ar: [
      "الكمية المذكورة: خمس قطع",
      "السعة: 280 مل",
      "الخامة: بولي بروبيلين PP",
      "الفم: قياسي",
    ],
    search_keywords_en: ["280ml baby bottle set", "standard mouth PP bottles"],
    search_keywords_ar: ["طقم رضاعات 280 مل", "رضاعات فم قياسي"],
  }),
  "1467092240978546688": draft({
    title_en_clean: "Seven-Piece Clip-In Hair Set",
    title_ar: "طقم وصلات شعر بمشابك من سبع قطع",
    description_en_clean:
      "A seven-piece clip-in hair set. Materials, length, and color are not supplied beyond the title.",
    description_ar:
      "طقم وصلات شعر بمشابك مكوّن من سبع قطع. الخامة والطول واللون غير مذكورة بما يتجاوز عنوان المورّد.",
    specifications_en: ["Quantity listed: seven-piece", "Attachment: clip"],
    specifications_ar: ["الكمية المذكورة: سبع قطع", "التثبيت: مشابك"],
    search_keywords_en: ["clip in hair set", "seven piece hair clips"],
    search_keywords_ar: ["طقم وصلات شعر", "مشابك شعر"],
  }),
  "1594961358263693312": draft({
    title_en_clean: "14-Piece Wooden Handle Makeup Brush Set",
    title_ar: "طقم فرش مكياج بمقابض خشبية – 14 قطعة",
    description_en_clean:
      "A 14-piece makeup brush set with wooden handles. Brush bristle materials are not supplied.",
    description_ar: "طقم فرش مكياج من 14 قطعة بمقابض خشبية. خامات الشعيرات غير مذكورة في عنوان المورّد.",
    specifications_en: ["Quantity: 14 pieces", "Handle material: wood", "Type: makeup brush set"],
    specifications_ar: ["الكمية: 14 قطعة", "خامة المقبض: خشب", "النوع: طقم فرش مكياج"],
    search_keywords_en: ["14 piece makeup brushes", "wooden handle brushes"],
    search_keywords_ar: ["طقم فرش مكياج 14", "فرش بمقبض خشبي"],
  }),
  "1753982835490304000": draft({
    title_en_clean: "Interactive Tumbler Slow Food Dog Toy",
    title_ar: "لعبة بهلوان لتوزيع طعام الكلاب ببطء",
    description_en_clean:
      "An interactive tumbler and leaky food ball for dogs. Listed as a puzzle toy for slower feeding. Health or intelligence claims from the supplier title are omitted.",
    description_ar:
      "لعبة بهلوان وكرة تسريب طعام تفاعلية للكلاب. مذكورة كلعبة أحجية لتناول الطعام ببطء. لم تُنقل عبارات صحية أو ذهنية من عنوان المورّد.",
    specifications_en: [
      "Type: tumbler leaky food ball",
      "Listed as: interactive puzzle, slow feeding",
      "For: dogs and pets",
    ],
    specifications_ar: [
      "النوع: كرة بهلوان لتسريب الطعام",
      "المذكور: أحجية تفاعلية وتغذية بطيئة",
      "للكلاب والحيوانات الأليفة",
    ],
    search_keywords_en: ["dog tumbler food toy", "slow food puzzle ball"],
    search_keywords_ar: ["لعبة توزيع طعام الكلاب", "كرة طعام بطيئة"],
  }),
  "1796518153233633280": draft({
    title_en_clean: "Thickened Automatic Packing Garbage Bags",
    title_ar: "أكياس نفايات سميكة بتعبئة تلقائية",
    description_en_clean:
      "Household thickened garbage bags listed for smart inductive ashbin packing. Model codes on the title are T1T1ST and AirT3.",
    description_ar:
      "أكياس نفايات منزلية سميكة مذكورة لتعبئة سلة مهملات ذكية حساسة. رموز الطراز في العنوان هي T1T1ST و AirT3.",
    specifications_en: [
      "Type: thickened automatic packing garbage bag",
      "Listed context: household smart inductive ashbin",
      "Model codes listed: T1T1ST, AirT3",
    ],
    specifications_ar: [
      "النوع: كيس نفايات سميك بتعبئة تلقائية",
      "السياق المذكور: سلة منزلية ذكية حساسة",
      "رموز الطراز: T1T1ST و AirT3",
    ],
    search_keywords_en: ["automatic packing garbage bags", "T1T1ST AirT3 bags"],
    search_keywords_ar: ["أكياس نفايات سميكة", "أكياس تعبئة تلقائية"],
  }),
  "19583873-3C62-48C5-BE3E-B01791CC71E2": draft({
    title_en_clean: "Glossy Black 5D Carbon Fiber Vinyl Wrap",
    title_ar: "فيلم فينيل ألياف كربون 5D أسود لامع",
    description_en_clean:
      "A glossy black 5D carbon fiber vinyl film listed for car wrap. No length or width is supplied in the title.",
    description_ar:
      "فيلم فينيل بنمط ألياف الكربون 5D باللون الأسود اللامع، مذكور لتغليف السيارات. الطول والعرض غير مذكورين في عنوان المورّد.",
    specifications_en: ["Pattern: 5D carbon fiber", "Finish: glossy black", "Type: vinyl wrap film"],
    specifications_ar: ["النمط: ألياف كربون 5D", "المظهر: أسود لامع", "النوع: فيلم فينيل للتغليف"],
    search_keywords_en: ["5D carbon fiber vinyl", "glossy black wrap film"],
    search_keywords_ar: ["فينيل ألياف كربون", "تغليف سيارات أسود لامع"],
  }),
  "20B24E49-68D5-4A7E-A17A-C4580004C59F": draft({
    title_en_clean: "Parrot Nibble Toy",
    title_ar: "لعبة نقر للببغاء",
    description_en_clean: "A nibble toy listed for parrots. Materials and size are not supplied beyond the title.",
    description_ar: "لعبة نقر مذكورة للببغاء. الخامة والمقاس غير مذكورين بما يتجاوز عنوان المورّد.",
    specifications_en: ["Product: nibble toy", "Listed for: parrots"],
    specifications_ar: ["المنتج: لعبة نقر", "المذكور: للببغاء"],
    search_keywords_en: ["parrot nibble toy", "parrot chew toy"],
    search_keywords_ar: ["لعبة ببغاء", "لعبة نقر للطيور"],
  }),
  "2406180737491620300": draft({
    title_en_clean: "Children Doctor Play Set with Stethoscope",
    title_ar: "طقم لعب دكتور للأطفال مع سماعة",
    description_en_clean:
      "A children's play-house doctor toy suit with a toy stethoscope. Listed as an educational play set.",
    description_ar: "طقم لعب منزل الأطفال على هيئة دكتور مع سماعة لعب. مذكور كطقم تعليمي للأطفال.",
    specifications_en: [
      "Type: children doctor play suit",
      "Includes listed: toy stethoscope",
      "Listed as: educational play house toy",
    ],
    specifications_ar: [
      "النوع: طقم لعب دكتور للأطفال",
      "يشمل المذكور: سماعة لعب",
      "المذكور: لعبة منزل أطفال تعليمية",
    ],
    search_keywords_en: ["children doctor play set", "toy stethoscope"],
    search_keywords_ar: ["طقم لعب دكتور", "سماعة لعب للأطفال"],
  }),
  "2408150612121603200": draft({
    title_en_clean: "OBD to 6 Pin Delphi Motorcycle Cable",
    title_ar: "كابل OBD إلى 6 أسنان للدراجات",
    description_en_clean: "An OBD to 6 pin cable listed for Delphi motorcycle use. No extra pin count is supplied.",
    description_ar: "كابل من منفذ OBD إلى 6 أسنان مذكور لدراجات دلفي. لا يُذكر عدد أسنان إضافي في العنوان.",
    specifications_en: ["Connector listed: OBD to 6 pin", "Listed for: Delphi motorcycle"],
    specifications_ar: ["الموصل المذكور: OBD إلى 6 أسنان", "المذكور: دراجة دلفي"],
    search_keywords_en: ["OBD 6 pin motorcycle", "Delphi motorcycle cable"],
    search_keywords_ar: ["كابل OBD دراجة", "محول 6 أسنان"],
  }),
  "52022F6B-104F-453E-A1E6-73797FF89B87": draft({
    title_en_clean: "12-Piece Makeup Brush Set",
    title_ar: "طقم فرش مكياج – 12 قطعة",
    description_en_clean:
      "A 12-piece makeup brush set. Brush materials and individual brush types are not supplied beyond the title.",
    description_ar: "طقم فرش مكياج من 12 قطعة. خامات الفرش وأنواعها التفصيلية غير مذكورة بما يتجاوز عنوان المورّد.",
    specifications_en: ["Quantity: 12 pieces", "Type: makeup brush set"],
    specifications_ar: ["الكمية: 12 قطعة", "النوع: طقم فرش مكياج"],
    search_keywords_en: ["12 piece makeup brushes", "makeup brush set"],
    search_keywords_ar: ["طقم فرش مكياج", "فرش مكياج 12"],
  }),
  "6393DCAD-3885-42D4-B6BC-ADF846AB8CB2": draft({
    title_en_clean: "Pet Casino Treasure Hunt Food Puzzle",
    title_ar: "لعبة أحجية كنز كازينو لتوزيع الطعام",
    description_en_clean:
      "A pet casino treasure-hunt puzzle toy that spills food. No extra size or mechanism is supplied beyond the title.",
    description_ar:
      "لعبة أحجية للحيوانات الأليفة بطابع كنز الكازينو لتسريب الطعام. المقاس والآلية الإضافية غير مذكورين بما يتجاوز عنوان المورّد.",
    specifications_en: [
      "Type: food spill puzzle toy",
      "Theme listed: casino treasure hunt",
      "For: pets",
    ],
    specifications_ar: ["النوع: لعبة أحجية تسريب طعام", "الثيمة المذكورة: كنز كازينو", "لحيوانات أليفة"],
    search_keywords_en: ["pet food puzzle", "casino treasure hunt toy"],
    search_keywords_ar: ["لعبة أحجية طعام", "لعبة كنز للحيوانات"],
  }),
  "8800BE41-B655-4594-8BFD-6BF53003231F": draft({
    title_en_clean: "Makeup Box Set",
    title_ar: "طقم مكياج مع علبة",
    description_en_clean: "A makeup box make-up set. Piece count, shades, and volume are not supplied in the title.",
    description_ar: "طقم مكياج مع علبة. عدد القطع والدرجات والحجم غير مذكورة في عنوان المورّد.",
    specifications_en: ["Product: makeup box set", "Volume and piece count: not supplied"],
    specifications_ar: ["المنتج: طقم مكياج مع علبة", "الحجم وعدد القطع: غير مذكور"],
    search_keywords_en: ["makeup box set", "makeup set"],
    search_keywords_ar: ["طقم مكياج", "علبة مكياج"],
  }),
  "C0080972-C4DC-47BD-BDA5-B6F0B4484C42": draft({
    title_en_clean: "Lamped Manicure Pedicure Support Plate",
    title_ar: "لوح إسناد مانيكير وباديكير مع ضوء",
    description_en_clean:
      "A lamped manicure support plate also listed as a professional pedicure nail plate. No size is supplied.",
    description_ar: "لوح إسناد للمانيكير مع ضوء، مذكور أيضاً كلوح أظافر للباديكير الاحترافي. المقاس غير مذكور.",
    specifications_en: [
      "Type: lamped manicure support plate",
      "Also listed: professional pedicure nail plate",
    ],
    specifications_ar: ["النوع: لوح إسناد مانيكير مع ضوء", "أيضاً: لوح باديكير احترافي"],
    search_keywords_en: ["manicure support plate", "lamped pedicure plate"],
    search_keywords_ar: ["لوح مانيكير", "لوح باديكير مع ضوء"],
  }),
  "C9052A90-6D89-419A-8A7C-BC34FA08B426": draft({
    title_en_clean: "12-Piece Makeup Brush Set with Eye Brush",
    title_ar: "طقم فرش مكياج مع فرشاة عيون – 12 قطعة",
    description_en_clean:
      "A 12-piece makeup brush set that includes an eye brush. Other brush types and materials are not supplied.",
    description_ar: "طقم فرش مكياج من 12 قطعة يشمل فرشاة للعيون. باقي أنواع الفرش والخامات غير مذكورة.",
    specifications_en: ["Quantity: 12 pieces", "Includes listed: eye brush", "Type: makeup brush set"],
    specifications_ar: ["الكمية: 12 قطعة", "يشمل المذكور: فرشاة عيون", "النوع: طقم فرش مكياج"],
    search_keywords_en: ["12 piece makeup brushes", "eye brush set"],
    search_keywords_ar: ["طقم فرش مكياج 12", "فرشاة عيون"],
  }),
  "EE1DC650-D8A1-477D-83D5-A5EFEA81FEB2": draft({
    title_en_clean: "Rubber Mint Feeding Ball with Food Bin",
    title_ar: "كرة تغذية مطاطية بالنعناع مع حجيرة طعام",
    description_en_clean:
      "A rubber mint feeding ball with a built-in food storage bin. Size and color are not supplied in the title.",
    description_ar:
      "كرة تغذية مطاطية برائحة النعناع مع حجيرة مدمجة لتخزين الطعام. المقاس واللون غير مذكورين في عنوان المورّد.",
    specifications_en: ["Material: rubber", "Scent listed: mint", "Design: built-in food storage bin"],
    specifications_ar: ["الخامة: مطاط", "الرائحة المذكورة: نعناع", "التصميم: حجيرة طعام مدمجة"],
    search_keywords_en: ["rubber mint feeding ball", "food storage ball"],
    search_keywords_ar: ["كرة تغذية مطاطية", "كرة طعام بالنعناع"],
  }),
};

function bucketCounts(ids: string[]): Record<GapBucket, number> {
  const counts: Record<GapBucket, number> = {
    unsupported_claim: 0,
    changed_numeric_value: 0,
    suspicious_mt_artifact: 0,
    title_spam: 0,
  };
  for (const id of ids) {
    const bucket = INPUT_BUCKETS[id as (typeof INPUT_IDS)[number]];
    if (bucket) counts[bucket] += 1;
  }
  return counts;
}

function main(): void {
  const sourcePath = join(process.cwd(), SOURCE_RELATIVE);
  const outputPath = join(process.cwd(), OUTPUT_RELATIVE);
  const canonicalPath = localizationFinalCatalogPath();
  const pairedPath = localizationCatalogPath();
  const priorFailurePath = join(process.cwd(), PRIOR_FAILURE_RELATIVE);
  const recoveryDir = join(process.cwd(), RECOVERY_RELATIVE);
  const inputPath = join(recoveryDir, "input-22-ids.json");
  const successPath = join(recoveryDir, "success-ids.json");
  const remainingPath = join(recoveryDir, "remaining-review-ids.json");
  const archivePath = join(recoveryDir, "review-archive.json");
  const auditPath = join(recoveryDir, "candidate-audit.json");

  assertSafeOutputPath(outputPath, [canonicalPath, pairedPath, sourcePath]);

  const sourceHash = sha256File(sourcePath);
  const canonicalHash = sha256File(canonicalPath);
  if (sourceHash !== EXPECTED_SOURCE_SHA256) {
    process.stdout.write(
      `${JSON.stringify({
        status: "BLOCKED_PREFLIGHT",
        reason: "source_candidate_sha256_mismatch",
        source_sha256: sourceHash,
        expected: EXPECTED_SOURCE_SHA256,
      })}\n`
    );
    process.exit(2);
  }
  if (canonicalHash !== EXPECTED_CANONICAL_SHA256) {
    process.stdout.write(
      `${JSON.stringify({
        status: "BLOCKED_PREFLIGHT",
        reason: "canonical_sha256_mismatch",
        canonical_sha256: canonicalHash,
        expected: EXPECTED_CANONICAL_SHA256,
      })}\n`
    );
    process.exit(2);
  }

  const catalog = readLocalizationCatalogFileFromPath(sourcePath);
  if (!catalog || catalog.products.length !== EXPECTED_TOTAL) {
    process.stdout.write(
      `${JSON.stringify({
        status: "BLOCKED_PREFLIGHT",
        reason: "catalog_missing_or_not_532",
      })}\n`
    );
    process.exit(2);
  }

  const reviewRows = localizationReviewRows(catalog.products);
  const localizedCount = catalog.products.filter((row) => row.status !== "manual_review_required").length;
  if (
    reviewRows.length !== EXPECTED_REVIEW ||
    catalog.metrics.localization_review !== EXPECTED_REVIEW ||
    localizedCount !== 510
  ) {
    process.stdout.write(
      `${JSON.stringify({
        status: "BLOCKED_PREFLIGHT",
        reason: "counts_not_532_510_22",
        total: catalog.products.length,
        localized: localizedCount,
        localization_review: reviewRows.length,
        metrics_localization_review: catalog.metrics.localization_review,
      })}\n`
    );
    process.exit(2);
  }

  const reviewIds = reviewRows.map((row) => row.cj_product_id).sort();
  const expectedIds = [...INPUT_IDS].sort();
  if (JSON.stringify(reviewIds) !== JSON.stringify(expectedIds)) {
    process.stdout.write(
      `${JSON.stringify({
        status: "BLOCKED_PREFLIGHT",
        reason: "review_ids_mismatch_expected_22",
        reviewIds,
        expectedIds,
      })}\n`
    );
    process.exit(2);
  }

  const priorFailure = JSON.parse(readFileSync(priorFailurePath, "utf8")) as {
    products?: Array<{ id?: string }>;
  };
  const priorIds = (priorFailure.products ?? []).map((row) => row.id).filter(Boolean).sort();
  if (JSON.stringify(priorIds) !== JSON.stringify(expectedIds)) {
    process.stdout.write(
      `${JSON.stringify({
        status: "BLOCKED_PREFLIGHT",
        reason: "prior_failure_ids_mismatch",
        priorIds,
        expectedIds,
      })}\n`
    );
    process.exit(2);
  }

  const inputRows = reviewRows
    .map((row) => ({
      id: row.cj_product_id,
      cj_product_id: row.cj_product_id,
      sku: row.sku,
      review_reason: row.review_reason,
      gold_standard_gaps: row.gold_standard_gaps,
      bucket: INPUT_BUCKETS[row.cj_product_id as (typeof INPUT_IDS)[number]],
    }))
    .sort((a, b) => a.cj_product_id.localeCompare(b.cj_product_id));
  writeJson(inputPath, {
    task_id: TASK_ID,
    generated_at: new Date().toISOString(),
    source_candidate: SOURCE_RELATIVE,
    source_candidate_sha256: sourceHash,
    definition: "catalog_qa.flag === LOCALIZATION_REVIEW (same as metrics.localization_review)",
    count: inputRows.length,
    products: inputRows,
  });

  const intactBefore = new Map<string, string>();
  for (const row of catalog.products) {
    if (INPUT_IDS.includes(row.cj_product_id as (typeof INPUT_IDS)[number])) continue;
    intactBefore.set(row.cj_product_id, sha256Text(JSON.stringify(row.localized)));
  }

  const archiveApplied: Array<{
    cj_product_id: string;
    bucket: GapBucket;
    method: "surgical_local_edit";
    status: LocalizedCatalogProduct["status"];
    review_reason: string | null;
    gold_standard_gaps: string[];
    quality_findings: LocalizedCatalogProduct["quality"]["findings"];
    draft: GeminiCopyOut;
  }> = [];

  const nextProducts = catalog.products.map((row) => {
    if (!INPUT_IDS.includes(row.cj_product_id as (typeof INPUT_IDS)[number])) return row;
    const copy = SURGICAL_DRAFTS[row.cj_product_id];
    if (!copy) {
      throw new Error(`missing_surgical_draft ${row.cj_product_id}`);
    }
    const applied = applyGeminiCopy(row, copy);
    archiveApplied.push({
      cj_product_id: row.cj_product_id,
      bucket: INPUT_BUCKETS[row.cj_product_id as (typeof INPUT_IDS)[number]],
      method: "surgical_local_edit",
      status: applied.status,
      review_reason: applied.review_reason,
      gold_standard_gaps: applied.gold_standard_gaps,
      quality_findings: applied.quality.findings,
      draft: copy,
    });
    return applied;
  });

  let intactChanged = 0;
  for (const row of nextProducts) {
    if (INPUT_IDS.includes(row.cj_product_id as (typeof INPUT_IDS)[number])) continue;
    const before = intactBefore.get(row.cj_product_id);
    if (!before || before !== sha256Text(JSON.stringify(row.localized))) intactChanged += 1;
  }

  const metrics = refreshCatalogMetrics(nextProducts);
  const snapshot: LocalizationCatalogFile = {
    ...catalog,
    task_id: TASK_ID,
    generated_at: new Date().toISOString(),
    provider: "local",
    paid_ai_used: false,
    products: nextProducts,
    metrics,
    paid_ai_required: metrics.manual_review_required > 0,
    paid_ai_estimate: {
      products: 22,
      estimated_input_tokens: 0,
      estimated_output_tokens: 0,
      gemini_flash_usd: 0,
      gemini_pro_usd: 0,
      note: "Surgical local edits only for the 22 review IDs. No additional Gemini call.",
    },
    next_action: "OWNER_REVIEW_FOR_CANONICAL_PROMOTION",
  };
  writeJson(outputPath, snapshot);

  const success = snapshot.products.filter(
    (row) => INPUT_IDS.includes(row.cj_product_id as (typeof INPUT_IDS)[number]) && row.status === "local_pass"
  );
  const remaining = snapshot.products.filter(
    (row) =>
      INPUT_IDS.includes(row.cj_product_id as (typeof INPUT_IDS)[number]) &&
      row.status === "manual_review_required"
  );
  writeJson(successPath, {
    task_id: TASK_ID,
    count: success.length,
    products: success
      .map((row) => ({
        id: row.cj_product_id,
        cj_product_id: row.cj_product_id,
        sku: row.sku,
        bucket: INPUT_BUCKETS[row.cj_product_id as (typeof INPUT_IDS)[number]],
        review_reason: row.review_reason,
      }))
      .sort((a, b) => a.cj_product_id.localeCompare(b.cj_product_id)),
  });
  writeJson(remainingPath, {
    task_id: TASK_ID,
    count: remaining.length,
    products: remaining
      .map((row) => ({
        id: row.cj_product_id,
        cj_product_id: row.cj_product_id,
        sku: row.sku,
        bucket: INPUT_BUCKETS[row.cj_product_id as (typeof INPUT_IDS)[number]],
        review_reason: row.review_reason,
        gold_standard_gaps: row.gold_standard_gaps,
      }))
      .sort((a, b) => a.cj_product_id.localeCompare(b.cj_product_id)),
  });

  const successIds = success.map((row) => row.cj_product_id);
  const remainingIds = remaining.map((row) => row.cj_product_id);
  writeJson(archivePath, {
    task_id: TASK_ID,
    method: "surgical_local_edit",
    additional_gemini_cost_usd: 0,
    input_ids: [...INPUT_IDS],
    success_ids: successIds,
    remaining_review_ids: remainingIds,
    bucket_fixed: bucketCounts(successIds),
    bucket_still_review: bucketCounts(remainingIds),
    applied: archiveApplied.sort((a, b) => a.cj_product_id.localeCompare(b.cj_product_id)),
  });

  const browse = loadStoreBrowseCatalog();
  const browseById = new Map(browse.items.map((row) => [row.identity.cj_product_id, row]));
  const stats = publishableStats(snapshot.products, browseById);
  const integrity = compareIntegrity(catalog.products, snapshot.products);
  const canonicalAfter = sha256File(canonicalPath);
  const sourceAfter = sha256File(sourcePath);
  writeJson(auditPath, {
    task_id: TASK_ID,
    source_candidate_path: sourcePath,
    source_candidate_sha256: sourceAfter,
    source_candidate_unchanged: sourceAfter === EXPECTED_SOURCE_SHA256,
    candidate_path: outputPath,
    candidate_sha256: sha256File(outputPath),
    total_products: snapshot.products.length,
    localized_total: snapshot.products.filter((row) => row.status !== "manual_review_required").length,
    localization_review: snapshot.metrics.localization_review,
    manual_review_required: snapshot.metrics.manual_review_required,
    publishable: stats.publishable,
    held: stats.held,
    avg_publishable_margin: stats.avgMargin,
    integrity,
    original_510_localizations_changed: intactChanged,
    canonical_sha256_after: canonicalAfter,
    canonical_unchanged: canonicalAfter === EXPECTED_CANONICAL_SHA256,
  });

  if (!existsSync(outputPath)) {
    throw new Error("candidate_not_written");
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "REVIEW_COMPLETE",
        source_candidate_sha256_verified: sourceAfter === EXPECTED_SOURCE_SHA256,
        input_products: 22,
        fixed_total: success.length,
        still_review_total: remaining.length,
        unsupported_claim_fixed: bucketCounts(successIds).unsupported_claim,
        unsupported_claim_still_review: bucketCounts(remainingIds).unsupported_claim,
        numeric_value_fixed: bucketCounts(successIds).changed_numeric_value,
        numeric_value_still_review: bucketCounts(remainingIds).changed_numeric_value,
        mt_artifact_fixed: bucketCounts(successIds).suspicious_mt_artifact,
        mt_artifact_still_review: bucketCounts(remainingIds).suspicious_mt_artifact,
        title_spam_fixed: bucketCounts(successIds).title_spam,
        title_spam_still_review: bucketCounts(remainingIds).title_spam,
        additional_gemini_cost: 0,
        final_candidate_path: outputPath,
        final_candidate_sha256: sha256File(outputPath),
        total_products: snapshot.products.length,
        localized_total: snapshot.products.filter((row) => row.status !== "manual_review_required").length,
        localization_review: snapshot.metrics.localization_review,
        publishable_products: stats.publishable,
        held_products: stats.held,
        avg_publishable_margin: stats.avgMargin,
        ids_changed: integrity.product_ids_changed,
        prices_changed: integrity.prices_changed,
        costs_changed: integrity.costs_changed,
        margins_changed: integrity.margins_changed,
        commercial_flags_changed: integrity.commercial_flags_changed,
        ip_flags_changed: integrity.ip_flags_changed,
        original_510_localizations_changed: intactChanged,
        canonical_file_changed: canonicalAfter === EXPECTED_CANONICAL_SHA256 ? "NO" : "YES",
        remaining_review: remaining.map((row) => ({
          id: row.cj_product_id,
          reason: row.review_reason,
          gaps: row.gold_standard_gaps,
        })),
      },
      null,
      2
    )}\n`
  );
}

main();
