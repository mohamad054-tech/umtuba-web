import type { StoreDepartment } from "../../services/cj/expansionTaxonomy";
import type { ProductLocalizationProviderId } from "./constants";
import type { StoreLocale } from "./requiredLocales";

export type LocalizationCatalogSource = "approved_59" | "expansion";

export type LocalizationSourceProduct = {
  cj_product_id: string;
  sku: string | null;
  source: LocalizationCatalogSource;
  source_title: string;
  source_description: string;
  department: StoreDepartment;
  subcategory: string;
  retail_price_minor: number;
  currency: "USD";
  cover_url: string | null;
  slug: string | null;
};

export type LocaleProductCopy = {
  title: string;
  description: string;
  specifications: string[];
  department: string;
  subcategory: string;
  search_keywords: string[];
};

export type LocalizedProductCopy = {
  title_en_clean: string;
  title_ar: string;
  description_en_clean: string;
  description_ar: string;
  specifications_en: string[];
  specifications_ar: string[];
  department_en: string;
  department_ar: string;
  subcategory_en: string;
  subcategory_ar: string;
  search_keywords_en: string[];
  search_keywords_ar: string[];
  /** Per-locale customer copy. Original 532 may omit this until 13-locale backfill. */
  by_locale?: Partial<Record<StoreLocale, LocaleProductCopy>>;
};

export type QualityGateCode =
  | "empty_arabic_title"
  | "identical_arabic_english_title"
  | "untranslated_supplier_spam"
  | "suspicious_mt_artifact"
  | "lost_quantity"
  | "lost_dimension"
  | "changed_numeric_value"
  | "unsupported_claim"
  | "malformed_rtl";

export type QualityGateFinding = {
  code: QualityGateCode;
  severity: "error" | "warning";
  message: string;
  field?: keyof LocalizedProductCopy;
};

export type QualityGateResult = {
  ok: boolean;
  findings: QualityGateFinding[];
};

export type LocalizedQaProduct = {
  cj_product_id: string;
  sku: string | null;
  source: LocalizationCatalogSource;
  source_title: string;
  source_description: string;
  department: StoreDepartment;
  subcategory: string;
  retail_price_minor: number;
  currency: "USD";
  cover_url: string | null;
  slug: string | null;
  localized: LocalizedProductCopy;
  quality: QualityGateResult;
};

export type LocalizationQaSampleFile = {
  task_id: "UMTUBA_STORE_PRODUCT_LOCALIZATION_V1";
  generated_at: string;
  provider: ProductLocalizationProviderId;
  paid_ai_used: false;
  sample_size: number;
  catalog_sources: {
    approved_59: string;
    expansion: string;
    expansion_products_available: number;
    note: string;
  };
  quality_gate: {
    status: "PASS" | "FAIL";
    error_count: number;
    warning_count: number;
  };
  paid_ai_required_for_full_catalog: boolean;
  recommended_provider: ProductLocalizationProviderId;
  next_action: string;
  products: LocalizedQaProduct[];
};

export type LocalizationRowStatus = "gold_standard" | "local_pass" | "manual_review_required";

export type CatalogQaFlag =
  | "LOCALIZATION_REVIEW"
  | "PRODUCT_DATA_REVIEW"
  | "IP_REVIEW"
  | "PRICE_REVIEW"
  | "SHIPPING_REVIEW"
  | "UNAVAILABLE";

export type CatalogQaFinding = {
  flag: CatalogQaFlag;
  reason: string;
};

export type LocalizedCatalogProduct = LocalizedQaProduct & {
  status: LocalizationRowStatus;
  review_reason: string | null;
  gold_standard_gaps: string[];
  catalog_qa?: CatalogQaFinding[];
};

export type LocalizationCatalogMetrics = {
  total_products: number;
  gold_standard_preserved: number;
  local_pass: number;
  titles_complete: number;
  descriptions_complete: number;
  english_titles_cleaned: number;
  specifications_complete: number;
  departments_localized: number;
  subcategories_localized: number;
  numeric_facts_preserved: number;
  untranslated_artifacts: number;
  unsupported_claims: number;
  manual_review_required: number;
  duplicates_flagged: number;
  localization_review: number;
  product_data_review: number;
  ip_review: number;
  price_review: number;
  shipping_review: number;
  unavailable: number;
};

export type PaidAiEstimate = {
  products: number;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  gemini_flash_usd: number;
  gemini_pro_usd: number;
  note: string;
};

export type LocalizationCatalogFile = {
  task_id:
    | "UMTUBA_STORE_PRODUCT_LOCALIZATION_FULL_CATALOG_V1"
    | "UMTUBA_STORE_532_FULL_LOCALIZATION_AND_CATALOG_QA_V1"
    | "UMTUBA_STORE_GEMINI_198_LOCALIZATION_COMPLETION_V1"
    | "UMTUBA_STORE_GEMINI_198_LOCALIZATION_RETRY_V2"
    | "UMTUBA_STORE_GEMINI_FINAL_18_REPAIR_AND_COMMERCIAL_HOLDS_V1"
    | "UMTUBA_STORE_GEMINI_CURRENT_198_NEW_LOCALIZATION_V1"
    | "UMTUBA_STORE_FINAL_22_LOCALIZATION_REVIEW_V1"
    | "UMTUBA_STORE_NEXT_CATALOG_EXPANSION_ALL_LANGUAGES_V1"
    | "UMTUBA_STORE_13_LOCALE_BACKFILL_AND_EXPANSION_V1";
  generated_at: string;
  provider: ProductLocalizationProviderId;
  paid_ai_used: boolean;
  arabic_localization_owner_pass: true;
  gold_standard_sample: string;
  catalog_sources: LocalizationQaSampleFile["catalog_sources"];
  metrics: LocalizationCatalogMetrics;
  paid_ai_required: boolean;
  paid_ai_estimate?: PaidAiEstimate;
  recommended_provider: ProductLocalizationProviderId;
  next_action: string;
  products: LocalizedCatalogProduct[];
};

export interface ProductLocalizationProvider {
  readonly id: ProductLocalizationProviderId;
  localize(product: LocalizationSourceProduct): LocalizedProductCopy;
}
