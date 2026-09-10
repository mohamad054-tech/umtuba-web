import { buildLocalizedCopy } from "./copyFactory";
import { catalogFactText } from "./facts";
import {
  estimateGeminiUsd,
  generateGeminiJsonWithRetry,
  geminiFlashModel,
} from "./geminiLocalizationClient";
import { goldStandardGaps } from "./localComposer";
import { evaluateLocalizationQuality } from "./qualityGate";
import { readLocalizationQaSampleFile } from "./sampleFile";
import type {
  LocalizationCatalogFile,
  LocalizationRowStatus,
  LocalizedCatalogProduct,
  LocalizedProductCopy,
} from "./types";

export const GEMINI_BATCH_SIZE = 5;
export const GEMINI_INTER_REQUEST_DELAY_MS = 12_000;
export const GEMINI_MAX_CONCURRENCY = 1;

type GeminiItem = {
  i: number;
  title: string;
  description: string;
  department: string;
  subcategory: string;
};

export type GeminiCopyOut = {
  i: number;
  title_en_clean: string;
  title_ar: string;
  description_en_clean: string;
  description_ar: string;
  specifications_en: string[];
  specifications_ar: string[];
  search_keywords_en: string[];
  search_keywords_ar: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseCopyList(value: unknown): GeminiCopyOut[] {
  const list = isRecord(value) && Array.isArray(value.products) ? value.products : Array.isArray(value) ? value : [];
  const out: GeminiCopyOut[] = [];
  for (const row of list) {
    if (!isRecord(row) || typeof row.i !== "number") continue;
    if (typeof row.title_en_clean !== "string" || typeof row.title_ar !== "string") continue;
    if (typeof row.description_en_clean !== "string" || typeof row.description_ar !== "string") continue;
    out.push({
      i: row.i,
      title_en_clean: row.title_en_clean.trim(),
      title_ar: row.title_ar.trim(),
      description_en_clean: row.description_en_clean.trim(),
      description_ar: row.description_ar.trim(),
      specifications_en: asStringArray(row.specifications_en),
      specifications_ar: asStringArray(row.specifications_ar),
      search_keywords_en: asStringArray(row.search_keywords_en),
      search_keywords_ar: asStringArray(row.search_keywords_ar),
    });
  }
  return out;
}

function fewShot(): string {
  const sample = readLocalizationQaSampleFile();
  const picks = (sample?.products ?? []).slice(0, 2);
  return picks
    .map((row) =>
      JSON.stringify({
        source_title: row.source_title,
        title_en_clean: row.localized.title_en_clean,
        title_ar: row.localized.title_ar,
        description_en_clean: row.localized.description_en_clean,
        description_ar: row.localized.description_ar,
        specifications_en: row.localized.specifications_en,
        specifications_ar: row.localized.specifications_ar,
      })
    )
    .join("\n");
}

function systemPrompt(): string {
  return `You write UMTUBA Store product copy. Style must match these owner-approved gold examples:
${fewShot()}

Rules:
- Clean professional English titles. Natural Modern Standard Arabic. Not literal translation.
- Preserve every factual number, quantity, dimension, material, color, compatibility, and model name from the source.
- Never invent medical, certification, performance, warranty, safety, or compatibility claims.
- No keyword-spam supplier titles. No Aliexpress/Taobao leftovers.
- Specifications: short factual bullets only.
- Return JSON { "products": [ { "i", "title_en_clean", "title_ar", "description_en_clean", "description_ar", "specifications_en", "specifications_ar", "search_keywords_en", "search_keywords_ar" } ] }
- One output object per input item. Same i values.`;
}

function toSource(row: LocalizedCatalogProduct) {
  return {
    cj_product_id: row.cj_product_id,
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
  };
}

export function selectGeminiReviewQueue(
  products: LocalizedCatalogProduct[],
  productIds?: readonly string[]
): LocalizedCatalogProduct[] {
  const allow = productIds ? new Set(productIds) : null;
  return products.filter((row) => {
    if (row.status !== "manual_review_required") return false;
    if (allow && !allow.has(row.cj_product_id)) return false;
    return true;
  });
}

export type GeminiArchiveItem = {
  cj_product_id: string;
  status: LocalizationRowStatus;
  review_reason: string | null;
  gold_standard_gaps: string[];
  draft: GeminiCopyOut | null;
};

export type GeminiArchiveBatch = {
  batchIndex: number;
  productIds: string[];
  userPayload: unknown;
  parsed: GeminiCopyOut[];
  applied: GeminiArchiveItem[];
  error: string | null;
};

export function applyGeminiCopy(row: LocalizedCatalogProduct, draft: GeminiCopyOut): LocalizedCatalogProduct {
  const copy: LocalizedProductCopy = buildLocalizedCopy({
    department: row.department,
    subcategory: row.subcategory,
    title_en_clean: draft.title_en_clean,
    title_ar: draft.title_ar,
    description_en_clean: draft.description_en_clean,
    description_ar: draft.description_ar,
    specifications_en: draft.specifications_en,
    specifications_ar: draft.specifications_ar,
    search_keywords_en: draft.search_keywords_en.length ? draft.search_keywords_en : [draft.title_en_clean],
    search_keywords_ar: draft.search_keywords_ar.length ? draft.search_keywords_ar : [draft.title_ar],
  });
  const source = toSource(row);
  const quality = evaluateLocalizationQuality(source, copy);
  const gaps = goldStandardGaps(source, copy);
  if (!quality.ok || gaps.length) {
    return {
      ...row,
      status: "manual_review_required",
      review_reason: `MANUAL_LOCALIZATION_REVIEW: ${gaps.join(", ") || "quality"}`,
      gold_standard_gaps: gaps.length ? gaps : ["manual_review_required"],
      quality,
      catalog_qa: [
        ...(row.catalog_qa ?? []).filter((item) => item.flag !== "LOCALIZATION_REVIEW"),
        { flag: "LOCALIZATION_REVIEW", reason: `Gemini output failed validation: ${gaps.join(", ") || "quality"}` },
      ],
    };
  }
  return {
    ...row,
    localized: copy,
    quality,
    status: "local_pass",
    review_reason: null,
    gold_standard_gaps: [],
    catalog_qa: (row.catalog_qa ?? []).filter((item) => item.flag !== "LOCALIZATION_REVIEW"),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function snapshotProducts(
  catalog: LocalizationCatalogFile,
  byId: Map<string, LocalizedCatalogProduct>
): LocalizedCatalogProduct[] {
  return catalog.products.map((row) => byId.get(row.cj_product_id) ?? row);
}

export type GeminiBatchRunResult = {
  catalog: LocalizationCatalogFile;
  completed: number;
  failed: number;
  remaining: number;
  actualCostUsd: number;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  lastError: string | null;
  http429Count: number;
  quotaExhausted: boolean;
};

export async function runGeminiReviewQueue(input: {
  catalog: LocalizationCatalogFile;
  apiKey: string;
  costCapUsd: number;
  model?: string;
  apiVersion?: "v1beta" | "v1";
  productIds?: readonly string[];
  persist?: (products: LocalizedCatalogProduct[]) => void;
  onArchiveBatch?: (entry: GeminiArchiveBatch) => void;
}): Promise<GeminiBatchRunResult> {
  const queue = selectGeminiReviewQueue(input.catalog.products, input.productIds);
  const byId = new Map(input.catalog.products.map((row) => [row.cj_product_id, row]));
  let inputTokens = 0;
  let outputTokens = 0;
  let actualCostUsd = 0;
  let completed = 0;
  let failed = 0;
  let http429Count = 0;
  let quotaExhausted = false;
  const modelUsed = input.model ?? geminiFlashModel();
  let lastError: string | null = null;

  const batches: LocalizedCatalogProduct[][] = [];
  for (let i = 0; i < queue.length; i += GEMINI_BATCH_SIZE) {
    batches.push(queue.slice(i, i + GEMINI_BATCH_SIZE));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex] ?? [];
    if (actualCostUsd + 0.25 > input.costCapUsd) {
      lastError = "cost_cap_would_exceed";
      input.onArchiveBatch?.({
        batchIndex,
        productIds: batch.map((row) => row.cj_product_id),
        userPayload: null,
        parsed: [],
        applied: batch.map((row) => ({
          cj_product_id: row.cj_product_id,
          status: row.status,
          review_reason: row.review_reason,
          gold_standard_gaps: row.gold_standard_gaps,
          draft: null,
        })),
        error: lastError,
      });
      break;
    }
    const items: GeminiItem[] = batch.map((row, index) => ({
      i: index + 1,
      title: row.source_title,
      description: catalogFactText(row.source_title, row.source_description).slice(0, 400),
      department: row.department,
      subcategory: row.subcategory,
    }));
    const user = JSON.stringify({ products: items });
    const attempt = await generateGeminiJsonWithRetry({
      apiKey: input.apiKey,
      model: modelUsed,
      apiVersion: input.apiVersion,
      system: systemPrompt(),
      user,
    });
    http429Count += attempt.http429Count;
    if (!attempt.ok) {
      lastError = attempt.lastError;
      input.onArchiveBatch?.({
        batchIndex,
        productIds: batch.map((row) => row.cj_product_id),
        userPayload: JSON.parse(user) as unknown,
        parsed: [],
        applied: batch.map((row) => ({
          cj_product_id: row.cj_product_id,
          status: row.status,
          review_reason: row.review_reason,
          gold_standard_gaps: row.gold_standard_gaps,
          draft: null,
        })),
        error: lastError,
      });
      if (attempt.authFailed) {
        throw new Error(attempt.lastError);
      }
      if (attempt.quotaExhausted || attempt.lastError === "gemini_http_404") {
        quotaExhausted = attempt.quotaExhausted;
        break;
      }
      failed += batch.length;
      continue;
    }
    inputTokens += attempt.result.usage.inputTokens;
    outputTokens += attempt.result.usage.outputTokens;
    actualCostUsd += estimateGeminiUsd(
      attempt.result.model,
      attempt.result.usage.inputTokens,
      attempt.result.usage.outputTokens
    );
    const parsed = parseCopyList(attempt.result.json);
    const applied = new Set<string>();
    const archiveApplied: GeminiArchiveItem[] = [];
    for (const item of parsed) {
      const row = batch[item.i - 1];
      if (!row || applied.has(row.cj_product_id)) continue;
      if (row.status === "gold_standard" || row.status === "local_pass") continue;
      const next = applyGeminiCopy(row, item);
      byId.set(row.cj_product_id, next);
      applied.add(row.cj_product_id);
      archiveApplied.push({
        cj_product_id: row.cj_product_id,
        status: next.status,
        review_reason: next.review_reason,
        gold_standard_gaps: next.gold_standard_gaps,
        draft: item,
      });
      if (next.status === "local_pass") completed += 1;
      else failed += 1;
    }
    for (const row of batch) {
      if (!applied.has(row.cj_product_id)) {
        failed += 1;
        archiveApplied.push({
          cj_product_id: row.cj_product_id,
          status: row.status,
          review_reason: row.review_reason,
          gold_standard_gaps: row.gold_standard_gaps,
          draft: null,
        });
      }
    }
    input.onArchiveBatch?.({
      batchIndex,
      productIds: batch.map((row) => row.cj_product_id),
      userPayload: JSON.parse(user) as unknown,
      parsed,
      applied: archiveApplied,
      error: null,
    });
    input.persist?.(snapshotProducts(input.catalog, byId));
    if (batchIndex < batches.length - 1) {
      await sleep(GEMINI_INTER_REQUEST_DELAY_MS);
    }
  }

  const products = snapshotProducts(input.catalog, byId);
  const remaining = products.filter((row) => row.status === "manual_review_required").length;
  return {
    catalog: {
      ...input.catalog,
      products,
    },
    completed,
    failed,
    remaining,
    actualCostUsd: Number(actualCostUsd.toFixed(4)),
    modelUsed,
    inputTokens,
    outputTokens,
    lastError,
    http429Count,
    quotaExhausted,
  };
}
