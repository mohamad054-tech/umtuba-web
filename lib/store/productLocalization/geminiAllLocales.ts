import { buildLocalizedCopy } from "./copyFactory";
import {
  catalogFactText,
  claimMatches,
  extractNumericTokens,
} from "./facts";
import {
  estimateGeminiUsd,
  generateGeminiJsonWithRetry,
  geminiFlashModel,
} from "./geminiLocalizationClient";
import { evaluateLocaleCompleteness } from "./localeCompleteness";
import { REQUIRED_STORE_LOCALES, type StoreLocale } from "./requiredLocales";
import { departmentLabel, subcategoryLabel } from "./taxonomyLocale";
import type {
  LocaleProductCopy,
  LocalizedCatalogProduct,
  LocalizedProductCopy,
} from "./types";

export const GEMINI_ALL_LOCALES_BATCH_SIZE = 2;
export const GEMINI_ALL_LOCALES_DELAY_MS = 12_000;

type GeminiLocaleDraft = {
  title: string;
  description: string;
  specifications: string[];
  search_keywords: string[];
};

export type GeminiAllLocalesOut = {
  i: number;
  locales: Partial<Record<StoreLocale, GeminiLocaleDraft>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseDraft(value: unknown): GeminiLocaleDraft | null {
  if (!isRecord(value)) return null;
  if (typeof value.title !== "string" || typeof value.description !== "string") return null;
  return {
    title: value.title.trim(),
    description: value.description.trim(),
    specifications: asStringArray(value.specifications),
    search_keywords: asStringArray(value.search_keywords),
  };
}

export function parseAllLocalesCopyList(value: unknown): GeminiAllLocalesOut[] {
  const list = isRecord(value) && Array.isArray(value.products) ? value.products : Array.isArray(value) ? value : [];
  const out: GeminiAllLocalesOut[] = [];
  for (const row of list) {
    if (!isRecord(row) || typeof row.i !== "number") continue;
    const locales: GeminiAllLocalesOut["locales"] = {};
    const rawLocales = isRecord(row.locales) ? row.locales : row;
    for (const locale of REQUIRED_STORE_LOCALES) {
      const draft = parseDraft(rawLocales[locale]);
      if (draft) locales[locale] = draft;
    }
    out.push({ i: row.i, locales });
  }
  return out;
}

function systemPrompt(): string {
  const localeList = REQUIRED_STORE_LOCALES.join(", ");
  return `You write UMTUBA Store product copy for every customer language: ${localeList}.

Rules:
- Natural native-quality copy in each language. Not literal word-for-word translation.
- English titles: clean and professional. Arabic: Modern Standard Arabic, RTL-capable.
- French, Spanish, German, Portuguese: natural native retail copy, not English leftovers.
- Preserve every factual number, quantity, dimension, material, color, compatibility, and model name from the source.
- Never invent medical, certification, performance, warranty, safety, or compatibility claims.
- No keyword-spam supplier titles. No marketplace leftovers.
- Specifications: short factual bullets only. Same facts in every language.
- Do not translate reusable department/subcategory labels; leave those out.
- Return JSON { "products": [ { "i", "locales": { "ar": { "title", "description", "specifications", "search_keywords" }, "en": {...}, "fr": {...}, "es": {...}, "de": {...}, "pt": {...} } } ] }
- One output object per input item. Same i values. Every listed locale must be present.`;
}

function attachTaxonomy(
  department: LocalizedCatalogProduct["department"],
  subcategory: string,
  locales: GeminiAllLocalesOut["locales"]
): Partial<Record<StoreLocale, LocaleProductCopy>> {
  const byLocale: Partial<Record<StoreLocale, LocaleProductCopy>> = {};
  for (const locale of REQUIRED_STORE_LOCALES) {
    const draft = locales[locale];
    if (!draft) continue;
    byLocale[locale] = {
      title: draft.title,
      description: draft.description,
      specifications: draft.specifications,
      department: departmentLabel(department, locale),
      subcategory: subcategoryLabel(subcategory, locale),
      search_keywords: draft.search_keywords.length ? draft.search_keywords : [draft.title],
    };
  }
  return byLocale;
}

export function applyAllLocalesGeminiCopy(
  row: LocalizedCatalogProduct,
  draft: GeminiAllLocalesOut
): LocalizedCatalogProduct {
  const byLocale = attachTaxonomy(row.department, row.subcategory, draft.locales);
  const en = byLocale.en;
  const ar = byLocale.ar;
  const copy: LocalizedProductCopy = {
    ...buildLocalizedCopy({
      department: row.department,
      subcategory: row.subcategory,
      title_en_clean: en?.title ?? "",
      title_ar: ar?.title ?? "",
      description_en_clean: en?.description ?? "",
      description_ar: ar?.description ?? "",
      specifications_en: en?.specifications ?? [],
      specifications_ar: ar?.specifications ?? [],
      search_keywords_en: en?.search_keywords ?? [],
      search_keywords_ar: ar?.search_keywords ?? [],
    }),
    by_locale: byLocale,
  };

  const completeness = evaluateLocaleCompleteness(copy);
  const sourceFacts = catalogFactText(row.source_title, row.source_description);
  const sourceNumbers = extractNumericTokens(row.source_title);
  const blob = REQUIRED_STORE_LOCALES.map((locale) => {
    const loc = byLocale[locale];
    return loc ? `${loc.title}\n${loc.description}\n${loc.specifications.join("\n")}` : "";
  }).join("\n");
  const localizedNumbers = extractNumericTokens(blob);
  const extraNumbers = localizedNumbers.filter((num) => !sourceNumbers.includes(num));
  const lostNumbers = sourceNumbers.filter((num) => !localizedNumbers.includes(num));
  const sourceClaims = new Set(claimMatches(sourceFacts));
  const extraClaims = claimMatches(blob).filter((claim) => !sourceClaims.has(claim));

  const gaps = [
    ...completeness.failed_locales.map((item) => `${item.locale}:${item.reasons.join(",")}`),
    ...(lostNumbers.length ? [`lost_numbers:${lostNumbers.join(",")}`] : []),
    ...(extraNumbers.length ? [`invented_numbers:${extraNumbers.join(",")}`] : []),
    ...(extraClaims.length ? [`unsupported_claims:${extraClaims.join(",")}`] : []),
  ];

  if (!completeness.complete || gaps.length) {
    return {
      ...row,
      localized: copy,
      quality: {
        ok: false,
        findings: gaps.map((message) => ({
          code: "empty_arabic_title",
          severity: "error" as const,
          message,
        })),
      },
      status: "manual_review_required",
      review_reason: `LOCALE_INCOMPLETE: ${gaps.join(" | ") || "coverage"}`,
      gold_standard_gaps: gaps.length ? gaps : ["locale_incomplete"],
      catalog_qa: [
        ...(row.catalog_qa ?? []).filter((item) => item.flag !== "LOCALIZATION_REVIEW"),
        {
          flag: "LOCALIZATION_REVIEW",
          reason: `Locale completeness ${completeness.passed_locales.length}/${REQUIRED_STORE_LOCALES.length}: ${gaps.join(" | ")}`,
        },
      ],
    };
  }

  return {
    ...row,
    localized: copy,
    quality: { ok: true, findings: [] },
    status: "local_pass",
    review_reason: null,
    gold_standard_gaps: [],
    catalog_qa: (row.catalog_qa ?? []).filter((item) => item.flag !== "LOCALIZATION_REVIEW"),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type AllLocalesArchiveBatch = {
  batchIndex: number;
  productIds: string[];
  userPayload: unknown;
  parsed: GeminiAllLocalesOut[];
  error: string | null;
};

export async function runGeminiAllLocalesQueue(input: {
  products: LocalizedCatalogProduct[];
  apiKey: string;
  costCapUsd: number;
  model?: string;
  apiVersion?: "v1beta" | "v1";
  persist?: (products: LocalizedCatalogProduct[]) => void;
  onArchiveBatch?: (entry: AllLocalesArchiveBatch) => void;
}): Promise<{
  products: LocalizedCatalogProduct[];
  completed: number;
  failed: number;
  actualCostUsd: number;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  lastError: string | null;
  http429Count: number;
  quotaExhausted: boolean;
  successByLocale: Record<StoreLocale, number>;
  failureByLocale: Record<StoreLocale, number>;
}> {
  const byId = new Map(input.products.map((row) => [row.cj_product_id, row]));
  const queue = input.products.filter((row) => row.status === "manual_review_required");
  let inputTokens = 0;
  let outputTokens = 0;
  let actualCostUsd = 0;
  let completed = 0;
  let failed = 0;
  let http429Count = 0;
  let quotaExhausted = false;
  const modelUsed = input.model ?? geminiFlashModel();
  let lastError: string | null = null;
  const successByLocale = Object.fromEntries(REQUIRED_STORE_LOCALES.map((locale) => [locale, 0])) as Record<
    StoreLocale,
    number
  >;
  const failureByLocale = Object.fromEntries(REQUIRED_STORE_LOCALES.map((locale) => [locale, 0])) as Record<
    StoreLocale,
    number
  >;

  const batches: LocalizedCatalogProduct[][] = [];
  for (let i = 0; i < queue.length; i += GEMINI_ALL_LOCALES_BATCH_SIZE) {
    batches.push(queue.slice(i, i + GEMINI_ALL_LOCALES_BATCH_SIZE));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex] ?? [];
    if (actualCostUsd + 0.35 > input.costCapUsd) {
      lastError = "cost_cap_would_exceed";
      input.onArchiveBatch?.({
        batchIndex,
        productIds: batch.map((row) => row.cj_product_id),
        userPayload: null,
        parsed: [],
        error: lastError,
      });
      break;
    }
    const items = batch.map((row, index) => ({
      i: index + 1,
      title: row.source_title,
      description: catalogFactText(row.source_title, row.source_description).slice(0, 500),
      department: row.department,
      subcategory: row.subcategory,
    }));
    const user = JSON.stringify({ locales: REQUIRED_STORE_LOCALES, products: items });
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
        error: lastError,
      });
      if (attempt.quotaExhausted) {
        quotaExhausted = true;
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
    const parsed = parseAllLocalesCopyList(attempt.result.json);
    const applied = new Set<string>();
    for (const item of parsed) {
      const row = batch[item.i - 1];
      if (!row || applied.has(row.cj_product_id)) continue;
      const next = applyAllLocalesGeminiCopy(row, item);
      byId.set(row.cj_product_id, next);
      applied.add(row.cj_product_id);
      const completeness = evaluateLocaleCompleteness(next.localized);
      for (const locale of completeness.passed_locales) successByLocale[locale] += 1;
      for (const fail of completeness.failed_locales) failureByLocale[fail.locale] += 1;
      if (next.status === "local_pass" && completeness.complete) completed += 1;
      else failed += 1;
    }
    for (const row of batch) {
      if (!applied.has(row.cj_product_id)) {
        failed += 1;
        for (const locale of REQUIRED_STORE_LOCALES) failureByLocale[locale] += 1;
      }
    }
    input.onArchiveBatch?.({
      batchIndex,
      productIds: batch.map((row) => row.cj_product_id),
      userPayload: JSON.parse(user) as unknown,
      parsed,
      error: null,
    });
    input.persist?.([...byId.values()]);
    if (batchIndex < batches.length - 1) {
      await sleep(GEMINI_ALL_LOCALES_DELAY_MS);
    }
  }

  return {
    products: input.products.map((row) => byId.get(row.cj_product_id) ?? row),
    completed,
    failed,
    actualCostUsd: Number(actualCostUsd.toFixed(4)),
    modelUsed,
    inputTokens,
    outputTokens,
    lastError,
    http429Count,
    quotaExhausted,
    successByLocale,
    failureByLocale,
  };
}
