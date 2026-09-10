import type { StoreDepartment } from "../../services/cj/expansionTaxonomy";
import { catalogFactText, claimMatches, extractNumericTokens } from "./facts";
import {
  estimateGeminiUsd,
  generateGeminiJsonWithRetry,
  geminiFlashModel,
} from "./geminiLocalizationClient";
import {
  evaluateLocaleCompleteness,
  evaluateLocaleCopyQuality,
  listMissingStoreLocales,
  localeCopyFromLegacy,
} from "./localeCompleteness";
import { REQUIRED_STORE_LOCALES, type StoreLocale } from "./requiredLocales";
import { departmentLabel, subcategoryLabel } from "./taxonomyLocale";
import type { LocaleProductCopy, LocalizedCatalogProduct, LocalizedProductCopy } from "./types";

export const GEMINI_LOCALE_BACKFILL_BATCH_SIZE = 2;
export const GEMINI_LOCALE_BACKFILL_DELAY_MS = 12_000;
export const GEMINI_LOCALE_BACKFILL_TIMEOUT_MS = 120_000;

export type GeminiLocaleDraft = {
  title: string;
  description: string;
  specifications: string[];
  search_keywords: string[];
};

export type GeminiBackfillOut = {
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

export function parseMissingLocaleCopyList(value: unknown): GeminiBackfillOut[] {
  const list = isRecord(value) && Array.isArray(value.products) ? value.products : Array.isArray(value) ? value : [];
  const out: GeminiBackfillOut[] = [];
  for (const row of list) {
    if (!isRecord(row) || typeof row.i !== "number") continue;
    const locales: GeminiBackfillOut["locales"] = {};
    const rawLocales = isRecord(row.locales) ? row.locales : row;
    for (const locale of REQUIRED_STORE_LOCALES) {
      if (locale === "ar" || locale === "en") continue;
      const draft = parseDraft(rawLocales[locale]);
      if (draft) locales[locale] = draft;
    }
    out.push({ i: row.i, locales });
  }
  return out;
}

function systemPrompt(locales: StoreLocale[]): string {
  return `You write UMTUBA Store product copy for ONLY these missing customer languages: ${locales.join(", ")}.

Rules:
- Natural native-quality retail copy. Not literal word-for-word translation.
- Indonesian (id), Hindi (hi), Russian (ru), Turkish (tr), Simplified Chinese (zh-CN), Japanese (ja), Korean (ko) as requested.
- Preserve every factual number, quantity, dimension, material, color, compatibility, and model name from the approved English source.
- Never invent medical, certification, performance, warranty, safety, compatibility, or material claims.
- No keyword-spam. No marketplace leftovers.
- Specifications: short factual bullets only. Same facts in every requested language.
- Do not translate reusable department/subcategory labels; leave those out.
- Do NOT return Arabic (ar) or English (en). Those already exist and must not be rewritten.
- Do NOT return any locale that is not in the product's missing_locales list.
- Return JSON { "products": [ { "i", "locales": { "<locale>": { "title", "description", "specifications", "search_keywords" } } } ] }
- One output object per input item. Same i values.`;
}

function attachTaxonomy(
  department: StoreDepartment,
  subcategory: string,
  locale: StoreLocale,
  draft: GeminiLocaleDraft
): LocaleProductCopy {
  return {
    title: draft.title,
    description: draft.description,
    specifications: draft.specifications,
    department: departmentLabel(department, locale),
    subcategory: subcategoryLabel(subcategory, locale),
    search_keywords: draft.search_keywords.length ? draft.search_keywords : [draft.title],
  };
}

export function seedApprovedLocales(copy: LocalizedProductCopy): LocalizedProductCopy {
  const byLocale: NonNullable<LocalizedProductCopy["by_locale"]> = { ...copy.by_locale };
  const en = localeCopyFromLegacy(copy, "en");
  const ar = localeCopyFromLegacy(copy, "ar");
  if (en && !byLocale.en) byLocale.en = en;
  if (ar && !byLocale.ar) byLocale.ar = ar;
  return { ...copy, by_locale: byLocale };
}

function localeBlob(row: LocaleProductCopy): string {
  return `${row.title}\n${row.description}\n${row.specifications.join("\n")}`;
}

const EN_NUMBER_WORDS: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  double: "2",
  triple: "3",
  single: "1",
};

const CJK_NUMERALS: Record<string, string> = {
  一: "1",
  二: "2",
  三: "3",
  四: "4",
  五: "5",
  六: "6",
  七: "7",
  八: "8",
  九: "9",
  十: "10",
};

export function sourceNumericVocabulary(text: string): string[] {
  const found = new Set(extractNumericTokens(text));
  for (const [word, num] of Object.entries(EN_NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) found.add(num);
  }
  return [...found];
}

export function localizedNumericVocabulary(text: string): string[] {
  const found = new Set(extractNumericTokens(text));
  for (const [glyph, num] of Object.entries(CJK_NUMERALS)) {
    if (text.includes(glyph)) found.add(num);
  }
  return [...found];
}

function draftQualityGaps(
  locale: StoreLocale,
  draft: LocaleProductCopy,
  english: LocaleProductCopy | null,
  sourceFacts: string,
  sourceNumbers: string[]
): string[] {
  const reasons = evaluateLocaleCopyQuality(locale, draft, english);
  const blob = localeBlob(draft);
  const localizedNumbers = localizedNumericVocabulary(blob);
  const extraNumbers = localizedNumbers.filter((num) => !sourceNumbers.includes(num));
  const lostNumbers = sourceNumbers.filter((num) => !localizedNumbers.includes(num));
  const sourceClaims = new Set(claimMatches(sourceFacts));
  const extraClaims = claimMatches(blob).filter((claim) => !sourceClaims.has(claim));
  if (lostNumbers.length) reasons.push(`lost_numbers:${lostNumbers.join(",")}`);
  if (extraNumbers.length) reasons.push(`invented_numbers:${extraNumbers.join(",")}`);
  if (extraClaims.length) reasons.push(`unsupported_claims:${extraClaims.join(",")}`);
  return reasons;
}

export function applyMissingLocaleDrafts(
  row: LocalizedCatalogProduct,
  draft: GeminiBackfillOut,
  requestedLocales: StoreLocale[]
): LocalizedCatalogProduct {
  const seeded = seedApprovedLocales(row.localized);
  const byLocale: NonNullable<LocalizedProductCopy["by_locale"]> = { ...seeded.by_locale };
  const english = localeCopyFromLegacy(seeded, "en");
  const sourceFacts = catalogFactText(
    english?.title ?? row.source_title,
    english?.description ?? row.source_description
  );
  const sourceNumbers = sourceNumericVocabulary(
    `${english?.title ?? ""}\n${english?.description ?? ""}\n${(english?.specifications ?? []).join("\n")}`
  );
  const applied: StoreLocale[] = [];
  const rejected: string[] = [];

  for (const locale of requestedLocales) {
    if (locale === "ar" || locale === "en") continue;
    if (byLocale[locale] && evaluateLocaleCopyQuality(locale, byLocale[locale] ?? null, english).length === 0) {
      continue;
    }
    const item = draft.locales[locale];
    if (!item) {
      rejected.push(`${locale}:missing_from_model`);
      continue;
    }
    const next = attachTaxonomy(row.department, row.subcategory, locale, item);
    const gaps = draftQualityGaps(locale, next, english, sourceFacts, sourceNumbers);
    if (gaps.length) {
      rejected.push(`${locale}:${gaps.join(",")}`);
      continue;
    }
    byLocale[locale] = next;
    applied.push(locale);
  }

  const localized: LocalizedProductCopy = {
    ...row.localized,
    title_en_clean: row.localized.title_en_clean,
    title_ar: row.localized.title_ar,
    description_en_clean: row.localized.description_en_clean,
    description_ar: row.localized.description_ar,
    specifications_en: row.localized.specifications_en,
    specifications_ar: row.localized.specifications_ar,
    by_locale: byLocale,
  };
  const completeness = evaluateLocaleCompleteness(localized);
  const qa = (row.catalog_qa ?? []).filter((item) => item.flag !== "LOCALIZATION_REVIEW");
  if (!completeness.complete) {
    qa.push({
      flag: "LOCALIZATION_REVIEW",
      reason: `Locale completeness ${completeness.passed_locales.length}/${REQUIRED_STORE_LOCALES.length}: ${rejected.join(" | ") || completeness.failed_locales.map((item) => item.locale).join(",")}`,
    });
  }

  return {
    ...row,
    localized,
    catalog_qa: qa,
    review_reason: completeness.complete
      ? row.review_reason === "queued_all_locales" || row.review_reason?.startsWith("LOCALE_INCOMPLETE")
        ? null
        : row.review_reason
      : `LOCALE_INCOMPLETE: ${rejected.join(" | ") || completeness.failed_locales.map((item) => item.locale).join(",")}`,
    gold_standard_gaps: completeness.complete
      ? row.gold_standard_gaps.filter((gap) => gap !== "manual_review_required" && !gap.startsWith("locale_"))
      : Array.from(new Set([...row.gold_standard_gaps, "locale_incomplete"])),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BackfillArchiveBatch = {
  batchIndex: number;
  productIds: string[];
  missingLocales: StoreLocale[][];
  userPayload: unknown;
  parsed: GeminiBackfillOut[];
  error: string | null;
};

export type BackfillQueueResult = {
  products: LocalizedCatalogProduct[];
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
  geminiInputTranslations: number;
  successByLocale: Record<StoreLocale, number>;
  failureByLocale: Record<StoreLocale, number>;
};

export function countLocaleSuccess(products: LocalizedCatalogProduct[]): {
  successByLocale: Record<StoreLocale, number>;
  failureByLocale: Record<StoreLocale, number>;
  completeProducts: number;
  incompleteProducts: number;
} {
  const successByLocale = Object.fromEntries(REQUIRED_STORE_LOCALES.map((locale) => [locale, 0])) as Record<
    StoreLocale,
    number
  >;
  const failureByLocale = Object.fromEntries(REQUIRED_STORE_LOCALES.map((locale) => [locale, 0])) as Record<
    StoreLocale,
    number
  >;
  let completeProducts = 0;
  let incompleteProducts = 0;
  for (const row of products) {
    const result = evaluateLocaleCompleteness(row.localized);
    for (const locale of result.passed_locales) successByLocale[locale] += 1;
    for (const fail of result.failed_locales) failureByLocale[fail.locale] += 1;
    if (result.complete) completeProducts += 1;
    else incompleteProducts += 1;
  }
  return { successByLocale, failureByLocale, completeProducts, incompleteProducts };
}

export async function runGeminiMissingLocaleQueue(input: {
  products: LocalizedCatalogProduct[];
  apiKey: string;
  costCapUsd: number;
  model?: string;
  apiVersion?: "v1beta" | "v1";
  persist?: (products: LocalizedCatalogProduct[]) => void;
  onArchiveBatch?: (entry: BackfillArchiveBatch) => void;
  alreadyProcessedIds?: ReadonlySet<string>;
}): Promise<BackfillQueueResult> {
  const byId = new Map(input.products.map((row) => [row.cj_product_id, row]));
  const queue = input.products.filter((row) => {
    if (input.alreadyProcessedIds?.has(row.cj_product_id)) return false;
    return listMissingStoreLocales(row.localized).some((locale) => locale !== "ar" && locale !== "en");
  });
  let inputTokens = 0;
  let outputTokens = 0;
  let actualCostUsd = 0;
  let completed = 0;
  let failed = 0;
  let http429Count = 0;
  let quotaExhausted = false;
  let geminiInputTranslations = 0;
  const modelUsed = input.model ?? geminiFlashModel();
  let lastError: string | null = null;

  const batches: LocalizedCatalogProduct[][] = [];
  for (let i = 0; i < queue.length; i += GEMINI_LOCALE_BACKFILL_BATCH_SIZE) {
    batches.push(queue.slice(i, i + GEMINI_LOCALE_BACKFILL_BATCH_SIZE));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex] ?? [];
    const missingPerProduct = batch.map((row) =>
      listMissingStoreLocales(row.localized).filter((locale) => locale !== "ar" && locale !== "en")
    );
    const localeUnion = [...new Set(missingPerProduct.flat())];
    const pairCount = missingPerProduct.reduce((sum, list) => sum + list.length, 0);
    if (actualCostUsd + 0.45 > input.costCapUsd) {
      lastError = "cost_cap_would_exceed";
      input.onArchiveBatch?.({
        batchIndex,
        productIds: batch.map((row) => row.cj_product_id),
        missingLocales: missingPerProduct,
        userPayload: null,
        parsed: [],
        error: lastError,
      });
      break;
    }
    const items = batch.map((row, index) => {
      const english = localeCopyFromLegacy(row.localized, "en");
      return {
        i: index + 1,
        missing_locales: missingPerProduct[index] ?? [],
        title_en: english?.title ?? row.source_title,
        description_en: (english?.description ?? catalogFactText(row.source_title, row.source_description)).slice(0, 700),
        specifications_en: english?.specifications ?? [],
      };
    });
    geminiInputTranslations += pairCount;
    const user = JSON.stringify({ locales: localeUnion, products: items });
    const attempt = await generateGeminiJsonWithRetry({
      apiKey: input.apiKey,
      model: modelUsed,
      apiVersion: input.apiVersion,
      timeoutMs: GEMINI_LOCALE_BACKFILL_TIMEOUT_MS,
      system: systemPrompt(localeUnion),
      user,
    });
    http429Count += attempt.http429Count;
    if (!attempt.ok) {
      lastError = attempt.lastError;
      input.onArchiveBatch?.({
        batchIndex,
        productIds: batch.map((row) => row.cj_product_id),
        missingLocales: missingPerProduct,
        userPayload: JSON.parse(user) as unknown,
        parsed: [],
        error: lastError,
      });
      if (attempt.quotaExhausted) {
        quotaExhausted = true;
        break;
      }
      failed += batch.length;
      input.persist?.([...byId.values()]);
      continue;
    }
    inputTokens += attempt.result.usage.inputTokens;
    outputTokens += attempt.result.usage.outputTokens;
    actualCostUsd += estimateGeminiUsd(
      attempt.result.model,
      attempt.result.usage.inputTokens,
      attempt.result.usage.outputTokens
    );
    const parsed = parseMissingLocaleCopyList(attempt.result.json);
    const applied = new Set<string>();
    for (const item of parsed) {
      const row = batch[item.i - 1];
      const requested = missingPerProduct[item.i - 1] ?? [];
      if (!row || applied.has(row.cj_product_id)) continue;
      const next = applyMissingLocaleDrafts(row, item, requested);
      byId.set(row.cj_product_id, next);
      applied.add(row.cj_product_id);
      if (evaluateLocaleCompleteness(next.localized).complete) completed += 1;
      else failed += 1;
    }
    for (const row of batch) {
      if (!applied.has(row.cj_product_id)) failed += 1;
    }
    input.onArchiveBatch?.({
      batchIndex,
      productIds: batch.map((row) => row.cj_product_id),
      missingLocales: missingPerProduct,
      userPayload: JSON.parse(user) as unknown,
      parsed,
      error: null,
    });
    input.persist?.([...byId.values()]);
    if (batchIndex < batches.length - 1) {
      await sleep(GEMINI_LOCALE_BACKFILL_DELAY_MS);
    }
  }

  const products = input.products.map((row) => byId.get(row.cj_product_id) ?? row);
  const remaining = products.filter((row) =>
    listMissingStoreLocales(row.localized).some((locale) => locale !== "ar" && locale !== "en")
  ).length;
  const totals = countLocaleSuccess(products);
  return {
    products,
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
    geminiInputTranslations,
    successByLocale: totals.successByLocale,
    failureByLocale: totals.failureByLocale,
  };
}
