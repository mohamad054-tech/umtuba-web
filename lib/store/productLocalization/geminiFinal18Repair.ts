import { catalogFactText, extractNumericTokens } from "./facts";
import { applyGeminiCopy, type GeminiCopyOut } from "./geminiBatch";
import {
  estimateGeminiUsd,
  generateGeminiJsonWithRetry,
  geminiFlashModel,
  selectWorkingFlashGenerate,
} from "./geminiLocalizationClient";
import { goldStandardGaps } from "./localComposer";
import { evaluateLocalizationQuality } from "./qualityGate";
import { readLocalizationQaSampleFile } from "./sampleFile";
import type { LocalizedCatalogProduct } from "./types";

export const GEMINI_FINAL_18_MAX_ATTEMPTS = 3;
const INTER_REQUEST_DELAY_MS = 8_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseOne(value: unknown): GeminiCopyOut | null {
  const row = isRecord(value) && isRecord(value.product) ? value.product : isRecord(value) ? value : null;
  if (!row) return null;
  if (typeof row.title_en_clean !== "string" || typeof row.title_ar !== "string") return null;
  if (typeof row.description_en_clean !== "string" || typeof row.description_ar !== "string") return null;
  return {
    i: 1,
    title_en_clean: row.title_en_clean.trim(),
    title_ar: row.title_ar.trim(),
    description_en_clean: row.description_en_clean.trim(),
    description_ar: row.description_ar.trim(),
    specifications_en: asStringArray(row.specifications_en),
    specifications_ar: asStringArray(row.specifications_ar),
    search_keywords_en: asStringArray(row.search_keywords_en),
    search_keywords_ar: asStringArray(row.search_keywords_ar),
  };
}

function fewShot(): string {
  const sample = readLocalizationQaSampleFile();
  return (sample?.products ?? [])
    .slice(0, 2)
    .map((row) =>
      JSON.stringify({
        source_title: row.source_title,
        title_en_clean: row.localized.title_en_clean,
        title_ar: row.localized.title_ar,
        description_en_clean: row.localized.description_en_clean,
        description_ar: row.localized.description_ar,
      })
    )
    .join("\n");
}

function repairSystem(): string {
  return `You repair one UMTUBA Store product listing to the owner-approved gold standard.
Examples:
${fewShot()}

Hard rules:
- Clean English title, maximum 12 words. Natural Modern Standard Arabic. Not literal translation.
- Use only facts present in the source title/description. Do not invent size, model, compatibility, warranty, medical, organic, certified, therapeutic, whitening, or performance claims.
- Never use heal, cure, treat, medical, clinically, FDA, certified, organic, whiten, anti-aging, therapeutic, or Arabic يعالج/يشفي/عضوي/طبي/تبييض unless that exact word is already in the source.
- Digit sequences in the output must be a subset of the allowed source numbers. If a quantity is spelled in English (seven, five, four), keep it spelled — do not convert it to a digit.
- No supplier spam (wholesale, hot sale, kitchen gadgets, makeup tools stuffing).
- Return JSON { "product": { "title_en_clean", "title_ar", "description_en_clean", "description_ar", "specifications_en", "specifications_ar", "search_keywords_en", "search_keywords_ar" } }`;
}

export type Final18RepairResult = {
  products: LocalizedCatalogProduct[];
  repaired: number;
  remaining: number;
  actualCostUsd: number;
  http429Count: number;
  quotaExhausted: boolean;
  lastError: string | null;
  modelUsed: string;
};

export async function repairFinal18Localization(input: {
  products: LocalizedCatalogProduct[];
  apiKey: string;
  costCapUsd: number;
  persist?: (products: LocalizedCatalogProduct[]) => void;
}): Promise<Final18RepairResult> {
  const byId = new Map(input.products.map((row) => [row.cj_product_id, row]));
  const queue = input.products.filter((row) => row.status === "manual_review_required");
  let actualCostUsd = 0;
  let repaired = 0;
  let http429Count = 0;
  let quotaExhausted = false;
  let lastError: string | null = null;
  let modelUsed = geminiFlashModel();

  const selected = await selectWorkingFlashGenerate(input.apiKey, []);
  if (selected.status === 429 || selected.quotaExhausted) {
    return {
      products: input.products,
      repaired: 0,
      remaining: queue.length,
      actualCostUsd: 0,
      http429Count: 1,
      quotaExhausted: true,
      lastError: "gemini_http_429",
      modelUsed,
    };
  }
  if (selected.model) modelUsed = selected.model;

  for (let index = 0; index < queue.length; index += 1) {
    const current = byId.get(queue[index]!.cj_product_id);
    if (!current || current.status !== "manual_review_required") continue;
    if (actualCostUsd + 0.08 > input.costCapUsd) {
      lastError = "cost_cap_would_exceed";
      break;
    }
    const allowedNumbers = extractNumericTokens(current.source_title);
    const source = {
      cj_product_id: current.cj_product_id,
      sku: current.sku,
      source: current.source,
      source_title: current.source_title,
      source_description: current.source_description,
      department: current.department,
      subcategory: current.subcategory,
      retail_price_minor: current.retail_price_minor,
      currency: current.currency,
      cover_url: current.cover_url,
      slug: current.slug,
    };
    let next = current;
    for (let attempt = 1; attempt <= GEMINI_FINAL_18_MAX_ATTEMPTS; attempt += 1) {
      if (actualCostUsd + 0.08 > input.costCapUsd) {
        lastError = "cost_cap_would_exceed";
        break;
      }
      const user = JSON.stringify({
        failure: current.review_reason ?? current.gold_standard_gaps.join(", "),
        gaps: current.gold_standard_gaps,
        allowed_numbers: allowedNumbers,
        department: current.department,
        subcategory: current.subcategory,
        title: current.source_title,
        description: catalogFactText(current.source_title, current.source_description).slice(0, 400),
        attempt,
      });
      const result = await generateGeminiJsonWithRetry({
        apiKey: input.apiKey,
        model: modelUsed,
        apiVersion: selected.apiVersion ?? "v1beta",
        system: repairSystem(),
        user,
      });
      http429Count += result.http429Count;
      if (!result.ok) {
        lastError = result.lastError;
        if (result.quotaExhausted) {
          quotaExhausted = true;
          break;
        }
        if (result.authFailed) throw new Error(result.lastError);
        continue;
      }
      actualCostUsd += estimateGeminiUsd(
        result.result.model,
        result.result.usage.inputTokens,
        result.result.usage.outputTokens
      );
      const draft = parseOne(result.result.json);
      if (!draft) continue;
      const applied = applyGeminiCopy(current, draft);
      const quality = evaluateLocalizationQuality(source, applied.localized);
      const gaps = goldStandardGaps(source, applied.localized);
      if (applied.status === "local_pass" && quality.ok && gaps.length === 0) {
        next = applied;
        repaired += 1;
        break;
      }
      next = applied;
    }
    byId.set(current.cj_product_id, next);
    input.persist?.(input.products.map((row) => byId.get(row.cj_product_id) ?? row));
    if (quotaExhausted) break;
    if (index < queue.length - 1) await sleep(INTER_REQUEST_DELAY_MS);
  }

  const products = input.products.map((row) => byId.get(row.cj_product_id) ?? row);
  return {
    products,
    repaired,
    remaining: products.filter((row) => row.status === "manual_review_required").length,
    actualCostUsd: Number(actualCostUsd.toFixed(4)),
    http429Count,
    quotaExhausted,
    lastError,
    modelUsed,
  };
}
