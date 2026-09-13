import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadStoreBrowseCatalog } from "../../services/cj/expansionBrowse";
import {
  CJ_EXPANSION_JSON_RELATIVE_PATH,
  CJ_STORE_LAUNCH_JSON_RELATIVE_PATH,
  loadLocalizationCatalogSources,
} from "./catalogSource";
import {
  evaluateCatalogQa,
  flagDuplicateGroups,
} from "./catalogQa";
import {
  EXPECTED_STORE_PRODUCT_COUNT,
  LOCALIZATION_CATALOG_JSON_RELATIVE_PATH,
  LOCALIZATION_FINAL_CATALOG_JSON_RELATIVE_PATH,
  LOCALIZATION_QA_SAMPLE_JSON_RELATIVE_PATH,
  PRODUCT_LOCALIZATION_532_TASK_ID,
  PRODUCT_LOCALIZATION_FULL_CATALOG_TASK_ID,
  PRODUCT_LOCALIZATION_GEMINI_198_TASK_ID,
  PRODUCT_LOCALIZATION_GEMINI_RETRY_V2_TASK_ID,
  PRODUCT_LOCALIZATION_FINAL_18_TASK_ID,
  PRODUCT_LOCALIZATION_GEMINI_CURRENT_198_TASK_ID,
  PRODUCT_LOCALIZATION_FINAL_22_TASK_ID,
  PRODUCT_LOCALIZATION_NEXT_ALL_LOCALES_TASK_ID,
  PRODUCT_LOCALIZATION_STORE_13_TASK_ID,
} from "./constants";
import { refreshLocalizedTaxonomy } from "./copyFactory";
import { editorialApproved59CopyFor } from "./editorialApproved59";
import { composeLocalCopy, goldStandardGaps } from "./localComposer";
import { frozenGoldCopy, isGoldStandardId } from "./goldStandard";
import { evaluateLocalizationQuality } from "./qualityGate";
import type {
  LocalizationCatalogFile,
  LocalizationCatalogMetrics,
  LocalizationSourceProduct,
  LocalizedCatalogProduct,
  LocalizedProductCopy,
  PaidAiEstimate,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function localizationCatalogPath(rootDir = process.cwd()): string {
  return join(rootDir, LOCALIZATION_CATALOG_JSON_RELATIVE_PATH);
}

const ACCEPTED_TASK_IDS = new Set<string>([
  PRODUCT_LOCALIZATION_FULL_CATALOG_TASK_ID,
  PRODUCT_LOCALIZATION_532_TASK_ID,
  PRODUCT_LOCALIZATION_GEMINI_198_TASK_ID,
  PRODUCT_LOCALIZATION_GEMINI_RETRY_V2_TASK_ID,
  PRODUCT_LOCALIZATION_FINAL_18_TASK_ID,
  PRODUCT_LOCALIZATION_GEMINI_CURRENT_198_TASK_ID,
  PRODUCT_LOCALIZATION_FINAL_22_TASK_ID,
  PRODUCT_LOCALIZATION_NEXT_ALL_LOCALES_TASK_ID,
  PRODUCT_LOCALIZATION_STORE_13_TASK_ID,
]);

export function localizationFinalCatalogPath(rootDir = process.cwd()): string {
  return join(rootDir, LOCALIZATION_FINAL_CATALOG_JSON_RELATIVE_PATH);
}

export function refreshCatalogMetrics(products: LocalizedCatalogProduct[]): LocalizationCatalogMetrics {
  return metricsFor(products);
}

function emptyCopy(): LocalizedProductCopy {
  return {
    title_en_clean: "",
    title_ar: "",
    description_en_clean: "",
    description_ar: "",
    specifications_en: [],
    specifications_ar: [],
    department_en: "",
    department_ar: "",
    subcategory_en: "",
    subcategory_ar: "",
    search_keywords_en: [],
    search_keywords_ar: [],
  };
}

function estimatePaidAi(products: number): PaidAiEstimate {
  const estimated_input_tokens = products * 700;
  const estimated_output_tokens = products * 550;
  const gemini_flash_usd =
    (estimated_input_tokens / 1_000_000) * 0.15 + (estimated_output_tokens / 1_000_000) * 0.6;
  const gemini_pro_usd =
    (estimated_input_tokens / 1_000_000) * 1.25 + (estimated_output_tokens / 1_000_000) * 10;
  return {
    products,
    estimated_input_tokens,
    estimated_output_tokens,
    gemini_flash_usd: Number(gemini_flash_usd.toFixed(2)),
    gemini_pro_usd: Number(gemini_pro_usd.toFixed(2)),
    note: "Estimate only. No paid API was called. Owner GO required before any spend.",
  };
}

function metricsFor(products: LocalizedCatalogProduct[]): LocalizationCatalogMetrics {
  const localized = products.filter((row) => row.status !== "manual_review_required" && row.localized);
  const qaFlags = (flag: string) =>
    products.filter((row) => row.catalog_qa?.some((item) => item.flag === flag)).length;
  return {
    total_products: products.length,
    gold_standard_preserved: products.filter((row) => row.status === "gold_standard").length,
    local_pass: products.filter((row) => row.status === "local_pass").length,
    titles_complete: localized.filter((row) => row.localized.title_ar.trim()).length,
    descriptions_complete: localized.filter((row) => row.localized.description_ar.trim()).length,
    english_titles_cleaned: localized.filter((row) => row.localized.title_en_clean.trim()).length,
    specifications_complete: localized.filter(
      (row) => row.localized.specifications_ar.length > 0 && row.localized.specifications_en.length > 0
    ).length,
    departments_localized: localized.filter((row) => row.localized.department_ar.trim()).length,
    subcategories_localized: localized.filter((row) => row.localized.subcategory_ar.trim()).length,
    numeric_facts_preserved: localized.filter(
      (row) =>
        !row.quality.findings.some((finding) =>
          ["lost_quantity", "lost_dimension", "changed_numeric_value"].includes(finding.code)
        )
    ).length,
    untranslated_artifacts: products.filter((row) =>
      row.quality.findings.some((finding) =>
        ["untranslated_supplier_spam", "suspicious_mt_artifact", "identical_arabic_english_title"].includes(
          finding.code
        )
      )
    ).length,
    unsupported_claims: products.filter((row) =>
      row.quality.findings.some((finding) => finding.code === "unsupported_claim")
    ).length,
    manual_review_required: products.filter((row) => row.status === "manual_review_required").length,
    duplicates_flagged: products.filter((row) =>
      row.catalog_qa?.some((item) => item.reason.startsWith("Near-duplicate"))
    ).length,
    localization_review: qaFlags("LOCALIZATION_REVIEW"),
    product_data_review: qaFlags("PRODUCT_DATA_REVIEW"),
    ip_review: qaFlags("IP_REVIEW"),
    price_review: qaFlags("PRICE_REVIEW"),
    shipping_review: qaFlags("SHIPPING_REVIEW"),
    unavailable: qaFlags("UNAVAILABLE"),
  };
}

function readPriorShippedCopies(rootDir: string): Map<string, LocalizedProductCopy> {
  const map = new Map<string, LocalizedProductCopy>();
  try {
    const parsed: unknown = JSON.parse(readFileSync(localizationCatalogPath(rootDir), "utf8"));
    if (!isRecord(parsed) || !Array.isArray(parsed.products)) return map;
    for (const row of parsed.products) {
      if (!isRecord(row)) continue;
      if (row.status !== "gold_standard" && row.status !== "local_pass") continue;
      if (typeof row.cj_product_id !== "string" || !isRecord(row.localized)) continue;
      map.set(row.cj_product_id, row.localized as LocalizedProductCopy);
    }
  } catch {
    /* first generation has no prior file */
  }
  return map;
}

export function resolveCatalogLocalization(
  source: LocalizationSourceProduct,
  priorCopies: Map<string, LocalizedProductCopy> = new Map()
): LocalizedCatalogProduct {
  if (isGoldStandardId(source.cj_product_id)) {
    const localized = frozenGoldCopy(source.cj_product_id);
    if (!localized) {
      throw new Error(`Gold-standard copy missing for ${source.cj_product_id}`);
    }
    const quality = evaluateLocalizationQuality(source, localized);
    return {
      ...source,
      localized,
      quality,
      status: "gold_standard",
      review_reason: null,
      gold_standard_gaps: goldStandardGaps(source, localized),
    };
  }

  const approved = editorialApproved59CopyFor(source.cj_product_id);
  if (approved) {
    const localized = refreshLocalizedTaxonomy(approved, source.department, source.subcategory);
    const quality = evaluateLocalizationQuality(source, localized);
    const gaps = goldStandardGaps(source, localized);
    if (quality.ok && gaps.length === 0) {
      return {
        ...source,
        localized,
        quality,
        status: "local_pass",
        review_reason: null,
        gold_standard_gaps: [],
      };
    }
    return {
      ...source,
      localized: emptyCopy(),
      quality,
      status: "manual_review_required",
      review_reason: `Approved-59 editorial failed gold-standard gate: ${gaps.join(", ") || "quality"}`,
      gold_standard_gaps: gaps,
    };
  }

  const prior = priorCopies.get(source.cj_product_id);
  if (prior) {
    const localized = refreshLocalizedTaxonomy(prior, source.department, source.subcategory);
    const quality = evaluateLocalizationQuality(source, localized);
    const gaps = goldStandardGaps(source, localized);
    if (quality.ok && gaps.length === 0) {
      return {
        ...source,
        localized,
        quality,
        status: "local_pass",
        review_reason: null,
        gold_standard_gaps: [],
      };
    }
  }

  const composed = composeLocalCopy(source);
  if (composed.status === "local_pass" && composed.copy) {
    const quality = evaluateLocalizationQuality(source, composed.copy);
    return {
      ...source,
      localized: composed.copy,
      quality,
      status: "local_pass",
      review_reason: null,
      gold_standard_gaps: [],
    };
  }
  return {
    ...source,
    localized: emptyCopy(),
    quality: { ok: false, findings: [] },
    status: "manual_review_required",
    review_reason: composed.reason,
    gold_standard_gaps: ["manual_review_required"],
  };
}

export function buildLocalizationCatalogFile(
  generatedAt = new Date().toISOString(),
  rootDir = process.cwd()
): LocalizationCatalogFile {
  const { products, expansionCount } = loadLocalizationCatalogSources(rootDir);
  const priorCopies = readPriorShippedCopies(rootDir);
  const browse = loadStoreBrowseCatalog(rootDir);
  const browseById = new Map(browse.items.map((row) => [row.identity.cj_product_id, row]));
  const duplicates = flagDuplicateGroups(products);
  const rows = products.map((source) => {
    const resolved = resolveCatalogLocalization(source, priorCopies);
    const qa = evaluateCatalogQa({
      source,
      browse: browseById.get(source.cj_product_id),
      localized: resolved,
    });
    const dup = duplicates.get(source.cj_product_id);
    if (dup) qa.push({ flag: "PRODUCT_DATA_REVIEW", reason: dup });
    return { ...resolved, catalog_qa: qa };
  });
  const metrics = metricsFor(rows);
  const estimate = estimatePaidAi(metrics.manual_review_required);
  return {
    task_id: PRODUCT_LOCALIZATION_532_TASK_ID,
    generated_at: generatedAt,
    provider: "local",
    paid_ai_used: false,
    arabic_localization_owner_pass: true,
    gold_standard_sample: LOCALIZATION_QA_SAMPLE_JSON_RELATIVE_PATH,
    catalog_sources: {
      approved_59: CJ_STORE_LAUNCH_JSON_RELATIVE_PATH,
      expansion: CJ_EXPANSION_JSON_RELATIVE_PATH,
      expansion_products_available: expansionCount,
      note: `Owner PASS on the 20-product gold sample. Catalog target ${EXPECTED_STORE_PRODUCT_COUNT}. Local pipeline only; unmatched titles stay in review instead of lowering quality.`,
    },
    metrics,
    paid_ai_required: metrics.manual_review_required > 0,
    paid_ai_estimate: estimate,
    recommended_provider: "gemini",
    next_action:
      metrics.manual_review_required > 0
        ? "Owner visual review of shipped copy, then GO before any paid-AI spend on the review queue."
        : "Owner visual review of the fully localized 532-product Store before production GO.",
    products: rows,
  };
}

export function writeLocalizationCatalogFile(
  file: LocalizationCatalogFile = buildLocalizationCatalogFile(),
  rootDir = process.cwd()
): string {
  const path = localizationCatalogPath(rootDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return path;
}

function parseCatalogFile(parsed: unknown): LocalizationCatalogFile | null {
  if (!isRecord(parsed)) return null;
  if (typeof parsed.task_id !== "string" || !ACCEPTED_TASK_IDS.has(parsed.task_id)) return null;
  if (!Array.isArray(parsed.products)) return null;
  return parsed as LocalizationCatalogFile;
}

export function readLocalizationCatalogFileFromPath(
  filePath: string
): LocalizationCatalogFile | null {
  try {
    return parseCatalogFile(JSON.parse(readFileSync(filePath, "utf8")));
  } catch {
    return null;
  }
}

export function readLocalizationCatalogFile(
  rootDir = process.cwd()
): LocalizationCatalogFile | null {
  for (const path of [localizationFinalCatalogPath(rootDir), localizationCatalogPath(rootDir)]) {
    try {
      const parsed = parseCatalogFile(JSON.parse(readFileSync(path, "utf8")));
      if (parsed) return parsed;
    } catch {
      /* try next artifact */
    }
  }
  return null;
}

export function customerSafeLocalizedCopy(
  cjProductId: string,
  rootDir = process.cwd()
): LocalizedProductCopy | null {
  const catalog = readLocalizationCatalogFile(rootDir);
  const row = catalog?.products.find((item) => item.cj_product_id === cjProductId);
  if (!row || row.status === "manual_review_required") return null;
  return row.localized;
}
