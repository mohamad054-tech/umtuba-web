import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LOCALIZATION_QA_SAMPLE_IDS, LOCALIZATION_QA_SAMPLE_JSON_RELATIVE_PATH } from "./constants";
import { editorialCopyFor } from "./editorialSample";
import type { LocalizedProductCopy, LocalizationQaSampleFile } from "./types";

const GOLD_IDS = new Set<string>(LOCALIZATION_QA_SAMPLE_IDS);

export function isGoldStandardId(cjProductId: string): boolean {
  return GOLD_IDS.has(cjProductId);
}

function readFrozenSample(rootDir = process.cwd()): LocalizationQaSampleFile | null {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(join(rootDir, LOCALIZATION_QA_SAMPLE_JSON_RELATIVE_PATH), "utf8")
    );
    if (!parsed || typeof parsed !== "object" || !("products" in parsed)) return null;
    return parsed as LocalizationQaSampleFile;
  } catch {
    return null;
  }
}

/** Owner-approved copy. Prefer the frozen QA JSON; never rewrite those 20 rows. */
export function frozenGoldCopy(
  cjProductId: string,
  rootDir = process.cwd()
): LocalizedProductCopy | null {
  if (!isGoldStandardId(cjProductId)) return null;
  const sample = readFrozenSample(rootDir);
  const row = sample?.products.find((item) => item.cj_product_id === cjProductId);
  return row?.localized ?? editorialCopyFor(cjProductId);
}
