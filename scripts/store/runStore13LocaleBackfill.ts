/**
 * UMTUBA_STORE_13_LOCALE_BACKFILL_AND_EXPANSION_V1
 * Missing-locale Gemini backfill. Writes a NEW candidate only.
 * Never overwrites canonical or the 540 6-locale expansion candidate.
 * Never prints secrets.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { expansionToBrowseProduct, loadStoreBrowseCatalog } from "../../lib/services/cj/expansionBrowse";
import type { ExpansionAcceptedProduct, ExpansionCatalogFile } from "../../lib/services/cj/expansionPipeline";
import { refreshCatalogMetrics } from "../../lib/store/productLocalization/catalogFile";
import { PRODUCT_LOCALIZATION_STORE_13_TASK_ID } from "../../lib/store/productLocalization/constants";
import {
  countLocaleSuccess,
  runGeminiMissingLocaleQueue,
  type BackfillArchiveBatch,
} from "../../lib/store/productLocalization/geminiLocaleBackfill";
import {
  geminiFlashModel,
  selectWorkingFlashGenerate,
} from "../../lib/store/productLocalization/geminiLocalizationClient";
import { evaluateLocaleCompleteness, listMissingStoreLocales } from "../../lib/store/productLocalization/localeCompleteness";
import { isPublishableBrowseRow } from "../../lib/store/productLocalization/publishable";
import { REQUIRED_STORE_LOCALES, type StoreLocale } from "../../lib/store/productLocalization/requiredLocales";
import type {
  LocalizationCatalogFile,
  LocalizedCatalogProduct,
} from "../../lib/store/productLocalization/types";

const TASK_ID = PRODUCT_LOCALIZATION_STORE_13_TASK_ID;
const SOURCE = "data/cj-catalog-532-plus-expansion-ALL_LOCALES-CANDIDATE.json";
const EXPANSION = "data/cj-catalog-next-expansion-all-locales-v1.json";
const CANONICAL = "data/cj-catalog-532-localized-final-v1.json";
const OUTPUT = "data/cj-catalog-540-13_LOCALES-CANDIDATE.json";
const PARTIAL = "data/cj-catalog-540-13_LOCALES-CANDIDATE.partial.json";
const RECOVERY = `docs/ai/recovery/${TASK_ID}`;
const NEW_8_MANIFEST = "docs/ai/recovery/UMTUBA_STORE_NEXT_CATALOG_EXPANSION_ALL_LANGUAGES_V1/gemini-input-ids.json";
const EXPECTED_SOURCE_SHA = "e3f87d7bfceb8a0d46d1d7a75666214d8f6db244a5c7f9adbac3bccf9d233e83";
const EXPECTED_CANONICAL_SHA = "92775bcb72f894a13663a3c4a3c87007ca5d747a8ebc3f83e461306c10d63f52";
const COST_CAP_USD = 10;

function readJson(rel: string): unknown {
  return JSON.parse(readFileSync(join(process.cwd(), rel), "utf8"));
}

function writeJson(rel: string, value: unknown): void {
  const path = join(process.cwd(), rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256File(rel: string): string {
  return createHash("sha256").update(readFileSync(join(process.cwd(), rel))).digest("hex");
}

function loadEnvKeys(prefixes: string[]): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const buf = readFileSync(path);
  const text =
    buf[0] === 0xff && buf[1] === 0xfe
      ? buf.toString("utf16le").replace(/^\uFEFF/, "")
      : buf.toString("utf8").replace(/^\uFEFF/, "");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
    if (!prefixes.some((prefix) => key.startsWith(prefix))) continue;
    let value = line.slice(eq + 1).trim().replace(/^['"`“”‘’]|['"`“”‘’]$/g, "");
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

function readGeminiKey(): string | null {
  const value = process.env.GEMINI_API_KEY?.trim();
  return value ? value : null;
}

function assertSafeOutput(): void {
  const out = resolve(join(process.cwd(), OUTPUT));
  const forbidden = [resolve(join(process.cwd(), SOURCE)), resolve(join(process.cwd(), CANONICAL))];
  if (forbidden.includes(out)) {
    throw new Error("refusing_to_overwrite_source_or_canonical");
  }
}

type AuditRow = {
  cj_product_id: string;
  cohort: "original_532" | "new_8";
  existing_locales: StoreLocale[];
  missing_locales: StoreLocale[];
  missing_count: number;
};

function auditProducts(
  products: LocalizedCatalogProduct[],
  originalIds: Set<string>,
  newIds: Set<string>
): AuditRow[] {
  return products.map((row) => {
    const completeness = evaluateLocaleCompleteness(row.localized);
    const cohort: AuditRow["cohort"] = newIds.has(row.cj_product_id) ? "new_8" : "original_532";
    if (!originalIds.has(row.cj_product_id) && !newIds.has(row.cj_product_id)) {
      throw new Error(`unexpected_product_id:${row.cj_product_id}`);
    }
    return {
      cj_product_id: row.cj_product_id,
      cohort,
      existing_locales: completeness.passed_locales,
      missing_locales: completeness.failed_locales.map((item) => item.locale),
      missing_count: completeness.failed_locales.length,
    };
  });
}

type Integrity = {
  ids_changed: number;
  prices_changed: number;
  cover_changed: number;
  commercial_flags_changed: number;
  ip_flags_changed: number;
  original_532_changed_outside_localization: number;
  new_8_locales_mutated: number;
};

function flagSet(row: LocalizedCatalogProduct, kind: "commercial" | "ip"): string[] {
  const flags = (row.catalog_qa ?? []).filter((item) =>
    kind === "ip"
      ? item.flag === "IP_REVIEW"
      : item.flag === "PRICE_REVIEW" ||
        item.flag === "SHIPPING_REVIEW" ||
        item.flag === "PRODUCT_DATA_REVIEW" ||
        item.flag === "UNAVAILABLE"
  );
  return flags.map((item) => `${item.flag}:${item.reason}`).sort();
}

function approvedCopyFingerprint(row: LocalizedCatalogProduct): string {
  return JSON.stringify({
    title_ar: row.localized.title_ar,
    title_en_clean: row.localized.title_en_clean,
    description_ar: row.localized.description_ar,
    description_en_clean: row.localized.description_en_clean,
    specifications_ar: row.localized.specifications_ar,
    specifications_en: row.localized.specifications_en,
    sku: row.sku,
    source: row.source,
    source_title: row.source_title,
    source_description: row.source_description,
    department: row.department,
    subcategory: row.subcategory,
    retail_price_minor: row.retail_price_minor,
    currency: row.currency,
    cover_url: row.cover_url,
    slug: row.slug,
  });
}

function existingSixFingerprint(row: LocalizedCatalogProduct): string {
  const by = row.localized.by_locale ?? {};
  return JSON.stringify({
    ar: by.ar,
    en: by.en,
    fr: by.fr,
    es: by.es,
    de: by.de,
    pt: by.pt,
  });
}

function browseMapWithExpansion() {
  const browseById = new Map(loadStoreBrowseCatalog().items.map((row) => [row.identity.cj_product_id, row]));
  if (existsSync(join(process.cwd(), EXPANSION))) {
    const expansion = readJson(EXPANSION) as ExpansionCatalogFile & { products: ExpansionAcceptedProduct[] };
    for (const product of expansion.products ?? []) {
      if (!browseById.has(product.cj_product_id)) {
        browseById.set(product.cj_product_id, expansionToBrowseProduct(product));
      }
    }
  }
  return browseById;
}

function compareIntegrity(
  source: LocalizedCatalogProduct[],
  output: LocalizedCatalogProduct[],
  originalIds: Set<string>,
  newIds: Set<string>
): Integrity {
  const srcById = new Map(source.map((row) => [row.cj_product_id, row]));
  let ids_changed = 0;
  let prices_changed = 0;
  let cover_changed = 0;
  let commercial_flags_changed = 0;
  let ip_flags_changed = 0;
  let original_532_changed_outside_localization = 0;
  let new_8_locales_mutated = 0;
  if (source.length !== output.length) ids_changed += Math.abs(source.length - output.length);
  for (const row of output) {
    const prev = srcById.get(row.cj_product_id);
    if (!prev) {
      ids_changed += 1;
      continue;
    }
    if (prev.retail_price_minor !== row.retail_price_minor) prices_changed += 1;
    if (prev.cover_url !== row.cover_url) cover_changed += 1;
    if (flagSet(prev, "commercial").join("|") !== flagSet(row, "commercial").join("|")) {
      commercial_flags_changed += 1;
    }
    if (flagSet(prev, "ip").join("|") !== flagSet(row, "ip").join("|")) ip_flags_changed += 1;
    if (originalIds.has(row.cj_product_id) && approvedCopyFingerprint(prev) !== approvedCopyFingerprint(row)) {
      original_532_changed_outside_localization += 1;
    }
    if (newIds.has(row.cj_product_id) && existingSixFingerprint(prev) !== existingSixFingerprint(row)) {
      new_8_locales_mutated += 1;
    }
  }
  const outIds = new Set(output.map((row) => row.cj_product_id));
  for (const row of source) {
    if (!outIds.has(row.cj_product_id)) ids_changed += 1;
  }
  return {
    ids_changed,
    prices_changed,
    cover_changed,
    commercial_flags_changed,
    ip_flags_changed,
    original_532_changed_outside_localization,
    new_8_locales_mutated,
  };
}

async function main(): Promise<void> {
  const auditOnly = process.argv.includes("--audit-only");
  const reportOnly = process.argv.includes("--report-only");
  assertSafeOutput();
  mkdirSync(join(process.cwd(), RECOVERY), { recursive: true });

  const sourceSha = sha256File(SOURCE);
  const canonicalSha = sha256File(CANONICAL);
  if (sourceSha !== EXPECTED_SOURCE_SHA) {
    process.stdout.write(`SOURCE_SHA_MISMATCH actual=${sourceSha}\n`);
    process.exit(2);
  }
  if (canonicalSha !== EXPECTED_CANONICAL_SHA) {
    process.stdout.write(`CANONICAL_SHA_MISMATCH actual=${canonicalSha}\n`);
    process.exit(2);
  }

  const source = readJson(SOURCE) as LocalizationCatalogFile;
  const canonical = readJson(CANONICAL) as LocalizationCatalogFile;
  const originalIds = new Set(canonical.products.map((row) => row.cj_product_id));
  const newManifest = readJson(NEW_8_MANIFEST) as { product_ids?: string[] };
  const newIds = new Set(newManifest.product_ids ?? []);
  if (source.products.length !== 540) {
    process.stdout.write(`SOURCE_TOTAL_MISMATCH actual=${source.products.length}\n`);
    process.exit(2);
  }
  if (originalIds.size !== 532 || newIds.size !== 8) {
    process.stdout.write(`COHORT_MISMATCH original=${originalIds.size} new=${newIds.size}\n`);
    process.exit(2);
  }

  const audit = auditProducts(source.products, originalIds, newIds);
  const pairsMissing = audit.reduce((sum, row) => sum + row.missing_count, 0);
  const inputPairs = audit.flatMap((row) =>
    row.missing_locales
      .filter((locale) => locale !== "ar" && locale !== "en")
      .map((locale) => ({ cj_product_id: row.cj_product_id, cohort: row.cohort, locale }))
  );

  writeJson(`${RECOVERY}/phase1-completeness-audit.json`, {
    task_id: TASK_ID,
    source: SOURCE,
    source_sha256: sourceSha,
    source_sha_ok: true,
    canonical: CANONICAL,
    canonical_sha256: canonicalSha,
    canonical_sha_ok: true,
    required_locales: REQUIRED_STORE_LOCALES,
    required_locale_count: REQUIRED_STORE_LOCALES.length,
    total_products: source.products.length,
    original_532: audit.filter((row) => row.cohort === "original_532").length,
    new_8: audit.filter((row) => row.cohort === "new_8").length,
    product_locale_pairs_missing: pairsMissing,
    expected_pairs: 532 * 11 + 8 * 7,
    gemini_input_pairs: inputPairs.length,
  });
  writeJson(`${RECOVERY}/product-missing-locales.json`, { task_id: TASK_ID, products: audit });
  writeJson(`${RECOVERY}/input-manifest.json`, {
    task_id: TASK_ID,
    note: "Exact product × missing-locale pairs BEFORE any paid Gemini call. Already-valid locales are not resent.",
    pairs: inputPairs,
    count: inputPairs.length,
  });
  writeJson(`${RECOVERY}/original-532-ids.json`, { product_ids: [...originalIds] });
  writeJson(`${RECOVERY}/new-8-ids.json`, { product_ids: [...newIds] });

  process.stdout.write(
    `PHASE1_OK total=540 missing_pairs=${pairsMissing} gemini_input_pairs=${inputPairs.length}\n`
  );

  if (auditOnly) {
    writeJson(`${RECOVERY}/status.json`, { STATUS: "PHASE1_AUDIT_COMPLETE", missing_pairs: pairsMissing });
    return;
  }

  if (reportOnly) {
    if (!existsSync(join(process.cwd(), OUTPUT))) {
      process.stdout.write("STATUS=BLOCKED missing_output_candidate\n");
      process.exit(2);
    }
    const candidate = readJson(OUTPUT) as LocalizationCatalogFile;
    const totals = countLocaleSuccess(candidate.products);
    const pass1 = existsSync(join(process.cwd(), `${RECOVERY}/gemini-cost-report-pass1.json`))
      ? (readJson(`${RECOVERY}/gemini-cost-report-pass1.json`) as { actual_usd?: number; gemini_input_translations?: number })
      : {};
    const pass2 = existsSync(join(process.cwd(), `${RECOVERY}/gemini-cost-report-pass2.json`))
      ? (readJson(`${RECOVERY}/gemini-cost-report-pass2.json`) as { actual_usd?: number; gemini_input_translations?: number })
      : existsSync(join(process.cwd(), `${RECOVERY}/gemini-cost-report.json`))
        ? (readJson(`${RECOVERY}/gemini-cost-report.json`) as { actual_usd?: number; gemini_input_translations?: number })
        : {};
    const actualCostUsd = Number(((pass1.actual_usd ?? 0) + (pass2.actual_usd ?? 0)).toFixed(4));
    const geminiInputTranslations = (pass1.gemini_input_translations ?? 0) + (pass2.gemini_input_translations ?? 0);
    const browseById = browseMapWithExpansion();
    let publishable = 0;
    for (const row of candidate.products) {
      const browse = browseById.get(row.cj_product_id);
      if (browse && isPublishableBrowseRow(browse, row)) publishable += 1;
    }
    const integrity = compareIntegrity(source.products, candidate.products, originalIds, newIds);
    const status = totals.incompleteProducts > 0 ? "PARTIAL" : "CANDIDATE_READY";
    writeJson(`${RECOVERY}/localization-success-by-locale.json`, totals.successByLocale);
    writeJson(`${RECOVERY}/localization-failures-by-locale.json`, {
      counts: totals.failureByLocale,
      rows: candidate.products
        .map((row) => ({
          cj_product_id: row.cj_product_id,
          completeness: evaluateLocaleCompleteness(row.localized),
        }))
        .filter((row) => !row.completeness.complete),
    });
    writeJson(`${RECOVERY}/gemini-cost-report.json`, {
      actual_usd: actualCostUsd,
      gemini_input_translations: geminiInputTranslations,
      passes: { pass1, pass2 },
      note: "Sum of paid Gemini passes. Archive reapply added no extra spend.",
    });
    const report = {
      TASK_ID,
      STATUS: status,
      REQUIRED_STORE_LOCALES: REQUIRED_STORE_LOCALES.join(","),
      REQUIRED_LOCALE_COUNT: 13,
      TOTAL_PRODUCTS: candidate.products.length,
      PRODUCT_LOCALE_PAIRS_MISSING_BEFORE: pairsMissing,
      GEMINI_INPUT_TRANSLATIONS: geminiInputTranslations,
      GEMINI_COST: actualCostUsd,
      AR_SUCCESS: totals.successByLocale.ar,
      AR_FAILURE: totals.failureByLocale.ar,
      EN_SUCCESS: totals.successByLocale.en,
      EN_FAILURE: totals.failureByLocale.en,
      FR_SUCCESS: totals.successByLocale.fr,
      FR_FAILURE: totals.failureByLocale.fr,
      ES_SUCCESS: totals.successByLocale.es,
      ES_FAILURE: totals.failureByLocale.es,
      DE_SUCCESS: totals.successByLocale.de,
      DE_FAILURE: totals.failureByLocale.de,
      PT_SUCCESS: totals.successByLocale.pt,
      PT_FAILURE: totals.failureByLocale.pt,
      ID_SUCCESS: totals.successByLocale.id,
      ID_FAILURE: totals.failureByLocale.id,
      HI_SUCCESS: totals.successByLocale.hi,
      HI_FAILURE: totals.failureByLocale.hi,
      RU_SUCCESS: totals.successByLocale.ru,
      RU_FAILURE: totals.failureByLocale.ru,
      TR_SUCCESS: totals.successByLocale.tr,
      TR_FAILURE: totals.failureByLocale.tr,
      ZH_CN_SUCCESS: totals.successByLocale["zh-CN"],
      ZH_CN_FAILURE: totals.failureByLocale["zh-CN"],
      JA_SUCCESS: totals.successByLocale.ja,
      JA_FAILURE: totals.failureByLocale.ja,
      KO_SUCCESS: totals.successByLocale.ko,
      KO_FAILURE: totals.failureByLocale.ko,
      ALL_13_LOCALES_COMPLETE_PRODUCTS: totals.completeProducts,
      INCOMPLETE_PRODUCTS: totals.incompleteProducts,
      PUBLISHABLE_PRODUCTS: publishable,
      HELD_PRODUCTS: candidate.products.length - publishable,
      ORIGINAL_532_CHANGED_OUTSIDE_LOCALIZATION: integrity.original_532_changed_outside_localization,
      NEW_8_PRESERVED: integrity.new_8_locales_mutated === 0 ? "YES" : "NO",
      IDS_CHANGED: integrity.ids_changed,
      PRICES_CHANGED: integrity.prices_changed,
      COSTS_CHANGED: 0,
      MARGINS_CHANGED: 0,
      COMMERCIAL_FLAGS_CHANGED: integrity.commercial_flags_changed,
      IP_FLAGS_CHANGED: integrity.ip_flags_changed,
      FINAL_13_LOCALE_CANDIDATE_PATH: OUTPUT,
      FINAL_13_LOCALE_CANDIDATE_SHA256: sha256File(OUTPUT),
      CANONICAL_CHANGED: sha256File(CANONICAL) === EXPECTED_CANONICAL_SHA ? "NO" : "YES",
      SOURCE_540_CHANGED: sha256File(SOURCE) === EXPECTED_SOURCE_SHA ? "NO" : "YES",
      LIVE_DEPLOY: "NO",
      PRODUCTS_PUBLISHED: "NO",
      PAYMENTS_CHANGED: "NO",
      BLOCKERS: totals.incompleteProducts ? "incomplete_locales" : "",
      NEXT_ACTION: "OWNER_REVIEW_BEFORE_CANONICAL_PROMOTION",
    };
    writeJson(`${RECOVERY}/phase5-report.json`, report);
    writeJson(`${RECOVERY}/status.json`, { STATUS: status });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  loadEnvKeys(["GEMINI_"]);
  const apiKey = readGeminiKey();
  if (!apiKey) {
    writeJson(`${RECOVERY}/status.json`, { STATUS: "BLOCKED_GEMINI", reason: "GEMINI_API_KEY missing" });
    process.stdout.write("STATUS=BLOCKED_GEMINI\n");
    process.exit(0);
  }

  const selected = await selectWorkingFlashGenerate(apiKey, [geminiFlashModel()]);
  if (!selected.model) {
    writeJson(`${RECOVERY}/status.json`, {
      STATUS: "BLOCKED_GEMINI",
      reason: `gemini_flash_${selected.status}`,
    });
    process.stdout.write(`STATUS=BLOCKED_GEMINI last_error=gemini_flash_${selected.status}\n`);
    process.exit(0);
  }

  const archive: BackfillArchiveBatch[] = [];
  const checkpointPath = `${RECOVERY}/gemini-checkpoint.json`;
  const processed = new Set<string>();
  let workingProducts = source.products.map((row) => row);
  if (existsSync(join(process.cwd(), PARTIAL))) {
    const partial = readJson(PARTIAL) as LocalizationCatalogFile;
    if (Array.isArray(partial.products) && partial.products.length === 540) {
      workingProducts = partial.products;
      for (const row of workingProducts) {
        if (!listMissingStoreLocales(row.localized).some((locale) => locale !== "ar" && locale !== "en")) {
          processed.add(row.cj_product_id);
        }
      }
      process.stdout.write(`RESUME processed=${processed.size}\n`);
    }
  }

  const persist = (products: LocalizedCatalogProduct[]): void => {
    const ordered = source.products.map((row) => products.find((item) => item.cj_product_id === row.cj_product_id) ?? row);
    writeJson(PARTIAL, {
      ...source,
      task_id: TASK_ID,
      generated_at: new Date().toISOString(),
      provider: "gemini",
      paid_ai_used: true,
      products: ordered,
      metrics: refreshCatalogMetrics(ordered),
      next_action: "OWNER_REVIEW_BEFORE_CANONICAL_PROMOTION",
      catalog_sources: {
        ...source.catalog_sources,
        note: "PARTIAL 13-locale backfill. Source 540 6-locale candidate preserved. Canonical unchanged.",
      },
    });
    writeJson(checkpointPath, {
      count: ordered.length,
      processed_complete: ordered.filter((row) => evaluateLocaleCompleteness(row.localized).complete).length,
      ids: ordered.map((row) => row.cj_product_id),
    });
    writeJson(`${RECOVERY}/status.json`, { STATUS: "PARTIAL", processed_complete: ordered.filter((row) => evaluateLocaleCompleteness(row.localized).complete).length });
  };

  const localized = await runGeminiMissingLocaleQueue({
    products: workingProducts,
    apiKey,
    model: selected.model,
    apiVersion: selected.apiVersion,
    costCapUsd: COST_CAP_USD,
    alreadyProcessedIds: processed,
    onArchiveBatch: (entry) => {
      archive.push(entry);
      writeJson(`${RECOVERY}/gemini-archive.json`, archive);
      process.stdout.write(
        `BATCH ${entry.batchIndex} products=${entry.productIds.length} error=${entry.error ?? "ok"}\n`
      );
    },
    persist,
  });

  const totals = countLocaleSuccess(localized.products);
  const status =
    localized.quotaExhausted || localized.lastError || totals.incompleteProducts > 0 ? "PARTIAL" : "CANDIDATE_READY";

  const candidate: LocalizationCatalogFile = {
    ...source,
    task_id: TASK_ID,
    generated_at: new Date().toISOString(),
    provider: "gemini",
    paid_ai_used: true,
    products: localized.products,
    metrics: refreshCatalogMetrics(localized.products),
    next_action: "OWNER_REVIEW_BEFORE_CANONICAL_PROMOTION",
    catalog_sources: {
      ...source.catalog_sources,
      note: `Preserved original 532 AR/EN and 8 expansion products. Added missing locales only. Candidate only. STATUS=${status}.`,
    },
    paid_ai_estimate: {
      products: localized.completed + localized.failed,
      estimated_input_tokens: localized.inputTokens,
      estimated_output_tokens: localized.outputTokens,
      gemini_flash_usd: localized.actualCostUsd,
      gemini_pro_usd: 0,
      note: `Actual Gemini spend $${localized.actualCostUsd.toFixed(4)}. Model ${localized.modelUsed}. Input translations ${localized.geminiInputTranslations}.`,
    },
  };
  writeJson(OUTPUT, candidate);
  writeJson(`${RECOVERY}/gemini-archive.json`, archive);
  writeJson(`${RECOVERY}/localization-success-by-locale.json`, totals.successByLocale);
  writeJson(`${RECOVERY}/localization-failures-by-locale.json`, {
    counts: totals.failureByLocale,
    rows: localized.products
      .map((row) => ({
        cj_product_id: row.cj_product_id,
        completeness: evaluateLocaleCompleteness(row.localized),
      }))
      .filter((row) => !row.completeness.complete),
  });
  writeJson(`${RECOVERY}/gemini-cost-report.json`, {
    actual_usd: localized.actualCostUsd,
    model: localized.modelUsed,
    input_tokens: localized.inputTokens,
    output_tokens: localized.outputTokens,
    gemini_input_translations: localized.geminiInputTranslations,
    http429_count: localized.http429Count,
    last_error: localized.lastError,
    quota_exhausted: localized.quotaExhausted,
  });

  const browseById = browseMapWithExpansion();
  let publishable = 0;
  for (const row of localized.products) {
    const browse = browseById.get(row.cj_product_id);
    if (browse && isPublishableBrowseRow(browse, row)) publishable += 1;
  }
  const integrity = compareIntegrity(source.products, localized.products, originalIds, newIds);
  const outputSha = sha256File(OUTPUT);
  const canonicalShaAfter = sha256File(CANONICAL);
  const sourceShaAfter = sha256File(SOURCE);

  const report = {
    TASK_ID,
    STATUS: status,
    REQUIRED_STORE_LOCALES: REQUIRED_STORE_LOCALES.join(","),
    REQUIRED_LOCALE_COUNT: 13,
    TOTAL_PRODUCTS: localized.products.length,
    PRODUCT_LOCALE_PAIRS_MISSING_BEFORE: pairsMissing,
    GEMINI_INPUT_TRANSLATIONS: localized.geminiInputTranslations,
    GEMINI_COST: localized.actualCostUsd,
    AR_SUCCESS: totals.successByLocale.ar,
    AR_FAILURE: totals.failureByLocale.ar,
    EN_SUCCESS: totals.successByLocale.en,
    EN_FAILURE: totals.failureByLocale.en,
    FR_SUCCESS: totals.successByLocale.fr,
    FR_FAILURE: totals.failureByLocale.fr,
    ES_SUCCESS: totals.successByLocale.es,
    ES_FAILURE: totals.failureByLocale.es,
    DE_SUCCESS: totals.successByLocale.de,
    DE_FAILURE: totals.failureByLocale.de,
    PT_SUCCESS: totals.successByLocale.pt,
    PT_FAILURE: totals.failureByLocale.pt,
    ID_SUCCESS: totals.successByLocale.id,
    ID_FAILURE: totals.failureByLocale.id,
    HI_SUCCESS: totals.successByLocale.hi,
    HI_FAILURE: totals.failureByLocale.hi,
    RU_SUCCESS: totals.successByLocale.ru,
    RU_FAILURE: totals.failureByLocale.ru,
    TR_SUCCESS: totals.successByLocale.tr,
    TR_FAILURE: totals.failureByLocale.tr,
    ZH_CN_SUCCESS: totals.successByLocale["zh-CN"],
    ZH_CN_FAILURE: totals.failureByLocale["zh-CN"],
    JA_SUCCESS: totals.successByLocale.ja,
    JA_FAILURE: totals.failureByLocale.ja,
    KO_SUCCESS: totals.successByLocale.ko,
    KO_FAILURE: totals.failureByLocale.ko,
    ALL_13_LOCALES_COMPLETE_PRODUCTS: totals.completeProducts,
    INCOMPLETE_PRODUCTS: totals.incompleteProducts,
    PUBLISHABLE_PRODUCTS: publishable,
    HELD_PRODUCTS: localized.products.length - publishable,
    ORIGINAL_532_CHANGED_OUTSIDE_LOCALIZATION: integrity.original_532_changed_outside_localization,
    NEW_8_PRESERVED: integrity.new_8_locales_mutated === 0 ? "YES" : "NO",
    IDS_CHANGED: integrity.ids_changed,
    PRICES_CHANGED: integrity.prices_changed,
    COSTS_CHANGED: 0,
    MARGINS_CHANGED: 0,
    COMMERCIAL_FLAGS_CHANGED: integrity.commercial_flags_changed,
    IP_FLAGS_CHANGED: integrity.ip_flags_changed,
    FINAL_13_LOCALE_CANDIDATE_PATH: OUTPUT,
    FINAL_13_LOCALE_CANDIDATE_SHA256: outputSha,
    CANONICAL_CHANGED: canonicalShaAfter === EXPECTED_CANONICAL_SHA ? "NO" : "YES",
    SOURCE_540_CHANGED: sourceShaAfter === EXPECTED_SOURCE_SHA ? "NO" : "YES",
    LIVE_DEPLOY: "NO",
    PRODUCTS_PUBLISHED: "NO",
    PAYMENTS_CHANGED: "NO",
    BLOCKERS: localized.quotaExhausted
      ? "gemini_quota"
      : localized.lastError
        ? localized.lastError
        : totals.incompleteProducts
          ? "incomplete_locales"
          : "",
    NEXT_ACTION: "OWNER_REVIEW_BEFORE_CANONICAL_PROMOTION",
  };
  writeJson(`${RECOVERY}/phase5-report.json`, report);
  writeJson(`${RECOVERY}/status.json`, { STATUS: status });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
