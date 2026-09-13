/**
 * Re-apply archived Gemini drafts with current validators.
 * Does not call Gemini. Does not overwrite canonical or the 6-locale source.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { refreshCatalogMetrics } from "../../lib/store/productLocalization/catalogFile";
import {
  applyMissingLocaleDrafts,
  type BackfillArchiveBatch,
  type GeminiBackfillOut,
} from "../../lib/store/productLocalization/geminiLocaleBackfill";
import { evaluateLocaleCompleteness, listMissingStoreLocales } from "../../lib/store/productLocalization/localeCompleteness";
import type { LocalizationCatalogFile } from "../../lib/store/productLocalization/types";

const OUTPUT = "data/cj-catalog-540-13_LOCALES-CANDIDATE.json";
const PARTIAL = "data/cj-catalog-540-13_LOCALES-CANDIDATE.partial.json";
const RECOVERY = "docs/ai/recovery/UMTUBA_STORE_13_LOCALE_BACKFILL_AND_EXPANSION_V1";
const SOURCE = "data/cj-catalog-532-plus-expansion-ALL_LOCALES-CANDIDATE.json";
const CANONICAL = "data/cj-catalog-532-localized-final-v1.json";
const EXPECTED_SOURCE_SHA = "e3f87d7bfceb8a0d46d1d7a75666214d8f6db244a5c7f9adbac3bccf9d233e83";
const EXPECTED_CANONICAL_SHA = "92775bcb72f894a13663a3c4a3c87007ca5d747a8ebc3f83e461306c10d63f52";

function sha256File(rel: string): string {
  return createHash("sha256").update(readFileSync(join(process.cwd(), rel))).digest("hex");
}

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), rel), "utf8")) as T;
}

function writeJson(rel: string, value: unknown): void {
  writeFileSync(join(process.cwd(), rel), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function loadArchives(): BackfillArchiveBatch[] {
  const files = [`${RECOVERY}/gemini-archive-pass1.json`, `${RECOVERY}/gemini-archive-pass2.json`, `${RECOVERY}/gemini-archive.json`];
  const all: BackfillArchiveBatch[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    if (!existsSync(join(process.cwd(), file))) continue;
    const batches = readJson<BackfillArchiveBatch[]>(file);
    for (const batch of batches) {
      const key = `${batch.batchIndex}:${batch.productIds.join(",")}:${batch.error ?? "ok"}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(batch);
    }
  }
  return all;
}

function latestDraftsByProduct(archives: BackfillArchiveBatch[]): Map<string, GeminiBackfillOut> {
  const map = new Map<string, GeminiBackfillOut>();
  for (const batch of archives) {
    if (batch.error) continue;
    for (const parsed of batch.parsed) {
      const id = batch.productIds[parsed.i - 1];
      if (id) map.set(id, parsed);
    }
  }
  return map;
}

function main(): void {
  if (sha256File(SOURCE) !== EXPECTED_SOURCE_SHA) throw new Error("source_sha_changed");
  if (sha256File(CANONICAL) !== EXPECTED_CANONICAL_SHA) throw new Error("canonical_sha_changed");
  const catalog = readJson<LocalizationCatalogFile>(OUTPUT);
  const drafts = latestDraftsByProduct(loadArchives());
  let repaired = 0;
  const products = catalog.products.map((row) => {
    const missing = listMissingStoreLocales(row.localized).filter((locale) => locale !== "ar" && locale !== "en");
    if (!missing.length) return row;
    const draft = drafts.get(row.cj_product_id);
    if (!draft) return row;
    const next = applyMissingLocaleDrafts(row, draft, missing);
    if (evaluateLocaleCompleteness(next.localized).passed_locales.length > evaluateLocaleCompleteness(row.localized).passed_locales.length) {
      repaired += 1;
    }
    return next;
  });
  const nextCatalog: LocalizationCatalogFile = {
    ...catalog,
    products,
    metrics: refreshCatalogMetrics(products),
    generated_at: new Date().toISOString(),
  };
  writeJson(OUTPUT, nextCatalog);
  writeJson(PARTIAL, nextCatalog);
  const complete = products.filter((row) => evaluateLocaleCompleteness(row.localized).complete).length;
  writeJson(`${RECOVERY}/reapply-archive-report.json`, {
    repaired_products: repaired,
    complete,
    incomplete: products.length - complete,
    candidate_sha256: sha256File(OUTPUT),
    canonical_changed: sha256File(CANONICAL) === EXPECTED_CANONICAL_SHA ? "NO" : "YES",
    source_changed: sha256File(SOURCE) === EXPECTED_SOURCE_SHA ? "NO" : "YES",
  });
  process.stdout.write(`REAPPLY repaired=${repaired} complete=${complete} incomplete=${products.length - complete}\n`);
}

main();
