/**
 * Store product localization — first-pass sample only.
 * Full catalog localization waits for owner QA of the 20-sample.
 */

export const PRODUCT_LOCALIZATION_TASK_ID = "UMTUBA_STORE_PRODUCT_LOCALIZATION_V1" as const;
export const PRODUCT_LOCALIZATION_FULL_CATALOG_TASK_ID =
  "UMTUBA_STORE_PRODUCT_LOCALIZATION_FULL_CATALOG_V1" as const;
export const PRODUCT_LOCALIZATION_532_TASK_ID =
  "UMTUBA_STORE_532_FULL_LOCALIZATION_AND_CATALOG_QA_V1" as const;
export const PRODUCT_LOCALIZATION_GEMINI_198_TASK_ID =
  "UMTUBA_STORE_GEMINI_198_LOCALIZATION_COMPLETION_V1" as const;
export const PRODUCT_LOCALIZATION_GEMINI_RETRY_V2_TASK_ID =
  "UMTUBA_STORE_GEMINI_198_LOCALIZATION_RETRY_V2" as const;
export const PRODUCT_LOCALIZATION_FINAL_18_TASK_ID =
  "UMTUBA_STORE_GEMINI_FINAL_18_REPAIR_AND_COMMERCIAL_HOLDS_V1" as const;
export const PRODUCT_LOCALIZATION_GEMINI_CURRENT_198_TASK_ID =
  "UMTUBA_STORE_GEMINI_CURRENT_198_NEW_LOCALIZATION_V1" as const;
export const PRODUCT_LOCALIZATION_FINAL_22_TASK_ID =
  "UMTUBA_STORE_FINAL_22_LOCALIZATION_REVIEW_V1" as const;
export const PRODUCT_LOCALIZATION_NEXT_ALL_LOCALES_TASK_ID =
  "UMTUBA_STORE_NEXT_CATALOG_EXPANSION_ALL_LANGUAGES_V1" as const;
export const PRODUCT_LOCALIZATION_STORE_13_TASK_ID =
  "UMTUBA_STORE_13_LOCALE_BACKFILL_AND_EXPANSION_V1" as const;
export const GEMINI_FINAL_18_REPAIR_COST_CAP_USD = 1;
export const PRIOR_GEMINI_LOCALIZATION_COST_USD = 0.0513;
export const LOCALIZATION_FINAL_CATALOG_JSON_RELATIVE_PATH =
  "data/cj-catalog-532-localized-final-v1.json" as const;
export const EXPECTED_STORE_PRODUCT_COUNT = 532;
export const GEMINI_LOCALIZATION_COST_CAP_USD = 5;
export const LOCALIZATION_QA_SAMPLE_JSON_RELATIVE_PATH =
  "data/cj-localization-qa-sample-v1.json" as const;
export const LOCALIZATION_CATALOG_JSON_RELATIVE_PATH =
  "data/cj-localization-catalog-v1.json" as const;
export const LOCALIZATION_QA_SAMPLE_SIZE = 20;
export const LOCALIZATION_QA_PREVIEW_PATH = "/sandbox/store/cj-localization-qa" as const;

export const PRODUCT_LOCALIZATION_PROVIDER_IDS = ["local", "gemini", "openai"] as const;
export type ProductLocalizationProviderId =
  (typeof PRODUCT_LOCALIZATION_PROVIDER_IDS)[number];

export const DEFAULT_PRODUCT_LOCALIZATION_PROVIDER: ProductLocalizationProviderId = "local";

export const LOCALIZATION_QA_SAMPLE_IDS = [
  "1642738075405537280", // 6-piece silicone food covers
  "1609410194650845184", // 3-piece starfish drain catcher
  "A30259A1-6996-42EF-99A8-8FC5B96D833F", // 6-cell ice ball tray
  "1387692476927709184", // silicone baking spatula
  "2407250234081608100", // silicone cup drainboard
  "1687032314666168320", // stainless steel floating pet bowl
  "1366573785234411520", // 1.5L floating pet bowl
  "2502230435271605900", // folding dog travel bowl
  "1698602629309411328", // portable double silicone bowls
  "EB17DDD6-0A86-431B-95D0-BE4D7D4957F2", // foldable car cup holder
  "7C59DE5B-A511-4920-88A8-C808B21476EE", // windshield phone mount
  "1809888855471312896", // magnetic stainless dashboard holder
  "0B3CAEBF-EDEF-4A34-BBA1-73335846D77E", // 12-piece makeup brushes
  "1600068074185699328", // 13-piece makeup brushes
  "2606150702051624000", // travel bottle brush set
  "EFE5F48E-B94F-4BE3-9CF8-E690A0BDFC9F", // bamboo toothbrush
  "2406270303281629300", // circular ice hockey mold
  "1776504080140087296", // cookie press (expansion)
  "2409200948111604800", // mini burger press (expansion)
  "2503201353261621900", // 48-cube ice bucket (expansion)
] as const;

export const SUPPLIER_TITLE_SPAM = [
  "kitchen gadgets",
  "kitchen gadget",
  "kitchen accessories",
  "kitchen supplies",
  "kitchen accessory",
  "pet products",
  "pet supplies",
  "dog supplies",
  "car styling",
  "stowing tidying",
  "organization storage tool",
  "storage tool",
  "wholesale",
  "new product",
  "hot sale",
  "artifact",
  "essential kitchen gadget",
  "cosmetic beauty tools",
  "beauty tools",
  "make up",
] as const;
