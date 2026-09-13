/**
 * Phases 2–6 for UMTUBA_STORE_NEXT_CATALOG_EXPANSION_ALL_LANGUAGES_V1.
 * Does not overwrite canonical. Never prints secrets.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { expansionToBrowseProduct } from "../../lib/services/cj/expansionBrowse";
import type { ExpansionAcceptedProduct, ExpansionCatalogFile } from "../../lib/services/cj/expansionPipeline";
import { loadStoreBrowseCatalog } from "../../lib/services/cj/expansionBrowse";
import { auditCommercialHolds } from "../../lib/store/productLocalization/commercialHoldAudit";
import {
  PRODUCT_LOCALIZATION_NEXT_ALL_LOCALES_TASK_ID,
} from "../../lib/store/productLocalization/constants";
import { refreshCatalogMetrics } from "../../lib/store/productLocalization/catalogFile";
import { runGeminiAllLocalesQueue } from "../../lib/store/productLocalization/geminiAllLocales";
import {
  geminiFlashModel,
  selectWorkingFlashGenerate,
} from "../../lib/store/productLocalization/geminiLocalizationClient";
import { evaluateLocaleCompleteness } from "../../lib/store/productLocalization/localeCompleteness";
import { gateNewExpansionProducts } from "../../lib/store/productLocalization/nextExpansionPreGate";
import { isPublishableBrowseRow, isPublishableLocalizedRow } from "../../lib/store/productLocalization/publishable";
import { REQUIRED_STORE_LOCALES } from "../../lib/store/productLocalization/requiredLocales";
import type {
  LocalizationCatalogFile,
  LocalizedCatalogProduct,
} from "../../lib/store/productLocalization/types";

const TASK_ID = PRODUCT_LOCALIZATION_NEXT_ALL_LOCALES_TASK_ID;
const CANONICAL = "data/cj-catalog-532-localized-final-v1.json";
const EXPANSION = "data/cj-catalog-next-expansion-all-locales-v1.json";
const CANDIDATE = "data/cj-catalog-532-plus-expansion-ALL_LOCALES-CANDIDATE.json";
const RECOVERY = `docs/ai/recovery/${TASK_ID}`;
const EXPECTED_CANONICAL_SHA = "92775bcb72f894a13663a3c4a3c87007ca5d747a8ebc3f83e461306c10d63f52";

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

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
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

function emptyCopy(): LocalizedCatalogProduct["localized"] {
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

function toQueuedRow(product: ExpansionAcceptedProduct): LocalizedCatalogProduct {
  return {
    cj_product_id: product.cj_product_id,
    sku: product.sku,
    source: "expansion",
    source_title: product.title,
    source_description: product.description,
    department: product.department,
    subcategory: product.subcategory,
    retail_price_minor: product.retail_price_minor,
    currency: "USD",
    cover_url: product.image_urls.find((url) => url.startsWith("https://")) ?? null,
    slug: null,
    localized: emptyCopy(),
    quality: { ok: false, findings: [] },
    status: "manual_review_required",
    review_reason: "queued_all_locales",
    gold_standard_gaps: ["manual_review_required"],
    catalog_qa: [{ flag: "LOCALIZATION_REVIEW", reason: "Queued for all-locale Gemini localization." }],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

async function main(): Promise<void> {
  const canonicalSha = sha256File(CANONICAL);
  if (canonicalSha !== EXPECTED_CANONICAL_SHA) {
    process.stdout.write(`CANONICAL_SHA_MISMATCH actual=${canonicalSha}\n`);
    process.exit(2);
  }
  const canonical = readJson(CANONICAL) as LocalizationCatalogFile;
  const originalProducts = canonical.products;
  const originalIds = new Set(originalProducts.map((row) => row.cj_product_id));
  const originalHash = sha256Json(originalProducts);

  if (!existsSync(join(process.cwd(), EXPANSION))) {
    process.stdout.write("STATUS=BLOCKED_NO_SAFE_SOURCE missing_expansion_file\n");
    process.exit(2);
  }
  const expansion = readJson(EXPANSION) as ExpansionCatalogFile & { products: ExpansionAcceptedProduct[] };
  const unusedLocalPath = `${RECOVERY}/unused-local-inventory-rejects.json`;
  const unusedLocalRejects = existsSync(join(process.cwd(), unusedLocalPath))
    ? readJson(unusedLocalPath)
    : { note: "no unused-local reject manifest" };

  const gated = gateNewExpansionProducts({
    candidates: expansion.products ?? [],
    existing: originalProducts,
  });
  mkdirSync(join(process.cwd(), RECOVERY), { recursive: true });
  writeJson(`${RECOVERY}/discovered.json`, {
    task_id: TASK_ID,
    source: EXPANSION,
    discovered: gated.discovered,
    accepted_for_gemini: gated.accepted.map((row) => ({
      cj_product_id: row.cj_product_id,
      sku: row.sku,
      title: row.title,
      department: row.department,
      subcategory: row.subcategory,
      classification: row.classification,
      retail_price_minor: row.retail_price_minor,
      landed_cost_minor: row.landed_cost_minor,
      gross_margin: row.gross_margin,
    })),
  });
  writeJson(`${RECOVERY}/rejected-before-Gemini.json`, {
    task_id: TASK_ID,
    unused_local_inventory: unusedLocalRejects,
    live_expansion_rejected: gated.rejected.map((row) => ({
      cj_product_id: row.product.cj_product_id,
      title: row.product.title,
      reasons: row.reasons,
    })),
  });

  if (!gated.accepted.length) {
    writeJson(`${RECOVERY}/gemini-input-ids.json`, { product_ids: [] });
    process.stdout.write(
      JSON.stringify(
        {
          STATUS: "BLOCKED_NO_SAFE_SOURCE",
          NEW_PRODUCTS_DISCOVERED: gated.discovered,
          REJECTED_BEFORE_GEMINI: gated.rejected.length,
          NEW_PRODUCTS_SENT_TO_GEMINI: 0,
        },
        null,
        2
      ) + "\n"
    );
    process.exit(0);
  }

  loadEnvKeys(["GEMINI_"]);
  const apiKey = readGeminiKey();
  writeJson(`${RECOVERY}/gemini-input-ids.json`, {
    product_ids: gated.accepted.map((row) => row.cj_product_id),
  });

  const queued = gated.accepted.map(toQueuedRow);
  if (!apiKey) {
    writeJson(`${RECOVERY}/localization-success-by-locale.json`, {});
    writeJson(`${RECOVERY}/localization-failures-by-locale.json`, {
      reason: "GEMINI_API_KEY missing",
    });
    process.stdout.write(
      JSON.stringify(
        {
          STATUS: "BLOCKED_GEMINI",
          NEW_PRODUCTS_DISCOVERED: gated.discovered,
          REJECTED_BEFORE_GEMINI: gated.rejected.length,
          NEW_PRODUCTS_SENT_TO_GEMINI: 0,
          GEMINI_INPUT: 0,
        },
        null,
        2
      ) + "\n"
    );
    process.exit(0);
  }

  const selected = await selectWorkingFlashGenerate(apiKey, [geminiFlashModel()]);
  if (!selected.model) {
    process.stdout.write(
      JSON.stringify(
        {
          STATUS: "BLOCKED_GEMINI",
          NEW_PRODUCTS_DISCOVERED: gated.discovered,
          REJECTED_BEFORE_GEMINI: gated.rejected.length,
          NEW_PRODUCTS_SENT_TO_GEMINI: 0,
          GEMINI_INPUT: 0,
          last_error: `gemini_flash_${selected.status}`,
        },
        null,
        2
      ) + "\n"
    );
    process.exit(0);
  }

  const archive: unknown[] = [];
  const localized = await runGeminiAllLocalesQueue({
    products: queued,
    apiKey,
    model: selected.model,
    apiVersion: selected.apiVersion,
    costCapUsd: 5,
    onArchiveBatch: (entry) => archive.push(entry),
    persist: (products) => {
      writeJson(`${RECOVERY}/gemini-checkpoint.json`, {
        count: products.length,
        ids: products.map((row) => row.cj_product_id),
      });
    },
  });
  writeJson(`${RECOVERY}/gemini-archive.json`, archive);
  writeJson(`${RECOVERY}/localization-success-by-locale.json`, localized.successByLocale);
  writeJson(`${RECOVERY}/localization-failures-by-locale.json`, {
    counts: localized.failureByLocale,
    rows: localized.products
      .map((row) => ({
        cj_product_id: row.cj_product_id,
        completeness: evaluateLocaleCompleteness(row.localized),
        review_reason: row.review_reason,
      }))
      .filter((row) => !row.completeness.complete),
  });

  const browseExisting = loadStoreBrowseCatalog();
  const browseById = new Map(browseExisting.items.map((row) => [row.identity.cj_product_id, row]));
  for (const product of gated.accepted) {
    browseById.set(product.cj_product_id, expansionToBrowseProduct(product));
  }

  const auditedNew = auditCommercialHolds(localized.products, browseById);
  const newPublishable: string[] = [];
  const newHeld: string[] = [];
  for (const row of auditedNew) {
    const browse = browseById.get(row.cj_product_id);
    const complete = evaluateLocaleCompleteness(row.localized).complete;
    const publishable = Boolean(browse && isPublishableBrowseRow(browse, row) && complete);
    if (publishable) newPublishable.push(row.cj_product_id);
    else newHeld.push(row.cj_product_id);
  }
  writeJson(`${RECOVERY}/final-publishable-new-products.json`, { product_ids: newPublishable });
  writeJson(`${RECOVERY}/new-HOLD-products.json`, { product_ids: newHeld });

  const candidateProducts = [...originalProducts, ...auditedNew];
  const candidate: LocalizationCatalogFile = {
    ...canonical,
    task_id: TASK_ID,
    generated_at: new Date().toISOString(),
    provider: "gemini",
    paid_ai_used: true,
    products: candidateProducts,
    metrics: refreshCatalogMetrics(candidateProducts),
    catalog_sources: {
      ...canonical.catalog_sources,
      note: `Preserved original 532 unchanged. Appended ${auditedNew.length} new all-locale expansion products. Candidate only.`,
    },
    next_action: "OWNER_REVIEW",
    paid_ai_estimate: {
      products: localized.completed + localized.failed,
      estimated_input_tokens: localized.inputTokens,
      estimated_output_tokens: localized.outputTokens,
      gemini_flash_usd: localized.actualCostUsd,
      gemini_pro_usd: 0,
      note: `Actual Gemini spend $${localized.actualCostUsd.toFixed(4)}. Model ${localized.modelUsed}.`,
    },
  };
  writeJson(CANDIDATE, candidate);

  const candidateParsed = readJson(CANDIDATE) as LocalizationCatalogFile;
  const preserved = candidateParsed.products.filter((row) => originalIds.has(row.cj_product_id));
  const preservedChanged = sha256Json(preserved) === originalHash ? 0 : preserved.length;
  const newRows = candidateParsed.products.filter((row) => !originalIds.has(row.cj_product_id));
  const allNewPublishableCovered = newPublishable.every((id) => {
    const row = newRows.find((item) => item.cj_product_id === id);
    return row ? evaluateLocaleCompleteness(row.localized).complete : false;
  });

  let originalPublishable = 0;
  for (const row of originalProducts) {
    const browse = browseById.get(row.cj_product_id);
    if (browse && isPublishableBrowseRow(browse, row)) originalPublishable += 1;
  }
  let candidatePublishable = 0;
  for (const row of candidateParsed.products) {
    const browse = browseById.get(row.cj_product_id);
    if (browse && isPublishableBrowseRow(browse, row)) candidatePublishable += 1;
  }

  const report = {
    TASK_ID,
    STATUS: "CANDIDATE_READY",
    REQUIRED_STORE_LOCALES,
    REQUIRED_LOCALE_COUNT: REQUIRED_STORE_LOCALES.length,
    ORIGINAL_PRODUCTS: 532,
    ORIGINAL_PRODUCTS_CHANGED: preservedChanged,
    ORIGINAL_PUBLISHABLE: originalPublishable,
    ORIGINAL_HELD: 532 - originalPublishable,
    NEW_PRODUCTS_DISCOVERED: gated.discovered,
    REJECTED_BEFORE_GEMINI: gated.rejected.length,
    NEW_PRODUCTS_SENT_TO_GEMINI: queued.length,
    GEMINI_SUCCESS_BY_LOCALE: localized.successByLocale,
    GEMINI_FAILURE_BY_LOCALE: localized.failureByLocale,
    GEMINI_COST: localized.actualCostUsd,
    NEW_PRODUCTS_FULLY_LOCALIZED: newRows.filter((row) => evaluateLocaleCompleteness(row.localized).complete).length,
    NEW_PRODUCTS_INCOMPLETE_LOCALIZATION: newRows.filter((row) => !evaluateLocaleCompleteness(row.localized).complete)
      .length,
    NEW_PUBLISHABLE_PRODUCTS: newPublishable.length,
    NEW_HELD_PRODUCTS: newHeld.length,
    CANDIDATE_TOTAL_PRODUCTS: candidateParsed.products.length,
    CANDIDATE_PUBLISHABLE_TOTAL: candidatePublishable,
    CANDIDATE_HELD_TOTAL: candidateParsed.products.length - candidatePublishable,
    ALL_NEW_PUBLISHABLE_HAVE_100_PERCENT_LOCALE_COVERAGE: allNewPublishableCovered ? "YES" : "NO",
    CANDIDATE_PATH: CANDIDATE,
    CANDIDATE_SHA256: sha256File(CANDIDATE),
    INPUT_MANIFEST: `${RECOVERY}/gemini-input-ids.json`,
    LOCALIZATION_MANIFEST: `${RECOVERY}/localization-success-by-locale.json`,
    FAILURE_MANIFEST: `${RECOVERY}/localization-failures-by-locale.json`,
    CANONICAL_CHANGED: "NO",
    EXISTING_532_CHANGED: preservedChanged,
    LIVE_DEPLOY: "NO",
    PRODUCTS_PUBLISHED: "NO",
    PAYMENTS_CHANGED: "NO",
    CANONICAL_SHA256: canonicalSha,
    BLOCKERS: localized.quotaExhausted ? "gemini_quota" : localized.lastError,
    NEXT_ACTION: "OWNER_REVIEW",
  };
  writeJson(`${RECOVERY}/phase6-report.json`, report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  void isPublishableLocalizedRow;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
