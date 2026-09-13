import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  CJ_EXPANSION_JSON_RELATIVE_PATH,
  CJ_STORE_LAUNCH_JSON_RELATIVE_PATH,
  catalogSourceNote,
  loadLocalizationCatalogSources,
  selectLocalizationQaSample,
} from "./catalogSource";
import {
  LOCALIZATION_QA_SAMPLE_JSON_RELATIVE_PATH,
  LOCALIZATION_QA_SAMPLE_SIZE,
  PRODUCT_LOCALIZATION_TASK_ID,
} from "./constants";
import { createLocalProductLocalizationProvider } from "./localProvider";
import { evaluateLocalizationQuality, summarizeQualityGate } from "./qualityGate";
import type { LocalizationQaSampleFile, LocalizedQaProduct } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function localizationQaSamplePath(rootDir = process.cwd()): string {
  return join(rootDir, LOCALIZATION_QA_SAMPLE_JSON_RELATIVE_PATH);
}

export function buildLocalizationQaSampleFile(
  generatedAt = new Date().toISOString(),
  rootDir = process.cwd()
): LocalizationQaSampleFile {
  const { products, expansionCount } = loadLocalizationCatalogSources(rootDir);
  const sample = selectLocalizationQaSample(products);
  const provider = createLocalProductLocalizationProvider();
  const rows: LocalizedQaProduct[] = sample.map((source) => {
    const localized = provider.localize(source);
    return {
      ...source,
      localized,
      quality: evaluateLocalizationQuality(source, localized),
    };
  });
  const quality_gate = summarizeQualityGate(rows.map((row) => row.quality));

  return {
    task_id: PRODUCT_LOCALIZATION_TASK_ID,
    generated_at: generatedAt,
    provider: "local",
    paid_ai_used: false,
    sample_size: rows.length,
    catalog_sources: {
      approved_59: CJ_STORE_LAUNCH_JSON_RELATIVE_PATH,
      expansion: CJ_EXPANSION_JSON_RELATIVE_PATH,
      expansion_products_available: expansionCount,
      note: catalogSourceNote(expansionCount),
    },
    quality_gate,
    paid_ai_required_for_full_catalog: true,
    recommended_provider: "gemini",
    next_action:
      "Owner QA of this 20-sample before full catalog localization. Do not localize the remaining catalog in this pass.",
    products: rows,
  };
}

export function writeLocalizationQaSampleFile(
  file: LocalizationQaSampleFile = buildLocalizationQaSampleFile(),
  rootDir = process.cwd()
): string {
  if (file.sample_size !== LOCALIZATION_QA_SAMPLE_SIZE) {
    throw new Error(
      `Expected ${LOCALIZATION_QA_SAMPLE_SIZE} sample products, found ${file.sample_size}`
    );
  }
  const path = localizationQaSamplePath(rootDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return path;
}

export function readLocalizationQaSampleFile(
  rootDir = process.cwd()
): LocalizationQaSampleFile | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(localizationQaSamplePath(rootDir), "utf8"));
    if (!isRecord(parsed)) return null;
    if (parsed.task_id !== PRODUCT_LOCALIZATION_TASK_ID) return null;
    if (!Array.isArray(parsed.products)) return null;
    return parsed as LocalizationQaSampleFile;
  } catch {
    return null;
  }
}
