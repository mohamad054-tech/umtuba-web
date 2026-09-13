import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  APPROVED_HERO_COUNT,
  APPROVED_LAUNCH_COUNT,
  APPROVED_STANDARD_COUNT,
  CJ_STORE_LAUNCH_BATCH,
  CJ_STORE_LAUNCH_JSON_RELATIVE_PATH,
  CJ_STORE_LAUNCH_TASK_ID,
  approvedLaunchProducts,
  toApprovedDraftProduct,
  type ApprovedDraftProduct,
  type CustomerStoreCategory,
} from "./launchDraft";
import type { LaunchMixFile } from "./launchCatalogFile";
import type { ProfitGateV2File } from "./profitGate";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export type ApprovedDraftFile = {
  task_id: typeof CJ_STORE_LAUNCH_TASK_ID;
  generated_at: string;
  provider: "cj";
  pilot_batch: typeof CJ_STORE_LAUNCH_BATCH;
  owner_approved_source: "data/cj-store-launch-mix-v1.json";
  live_refresh: {
    attempted: boolean;
    status: "skipped_existing_launch_mix" | "completed" | "partial";
    note: string;
  };
  store_publication: {
    status: "draft";
    active: false;
    live_store_overwrite: false;
    checkout_enabled: false;
  };
  summary: {
    approved_products: number;
    hero_products: number;
    standard_products: number;
    products_flagged: number;
    category_mix: Record<CustomerStoreCategory, number>;
    substituted: false;
    padded: false;
  };
  products: ApprovedDraftProduct[];
};

export function approvedDraftFilePath(rootDir = process.cwd()): string {
  return join(rootDir, CJ_STORE_LAUNCH_JSON_RELATIVE_PATH);
}

export function buildApprovedDraftFile(
  launchMix: LaunchMixFile,
  v2: ProfitGateV2File | null,
  generatedAt = new Date().toISOString()
): ApprovedDraftFile {
  const selected = approvedLaunchProducts(launchMix.products);
  if (selected.length !== APPROVED_LAUNCH_COUNT) {
    throw new Error(
      `Expected exactly ${APPROVED_LAUNCH_COUNT} selected products, found ${selected.length}`
    );
  }
  const hero = selected.filter((row) => row.launch_classification === "LAUNCH_HERO");
  const standard = selected.filter((row) => row.launch_classification === "LAUNCH_STANDARD");
  if (hero.length !== APPROVED_HERO_COUNT || standard.length !== APPROVED_STANDARD_COUNT) {
    throw new Error(
      `Expected ${APPROVED_HERO_COUNT} hero + ${APPROVED_STANDARD_COUNT} standard, found ${hero.length}/${standard.length}`
    );
  }

  const v2ById = new Map((v2?.products ?? []).map((row) => [row.cj_product_id, row]));
  const products = selected.map((row) => {
    const source = v2ById.get(row.cj_product_id);
    return toApprovedDraftProduct(row, {
      cjVariantId: source?.cj_variant_id ?? null,
      sku: source?.sku ?? null,
    });
  });

  const categoryMix: Record<CustomerStoreCategory, number> = {
    Home: 0,
    Pet: 0,
    Car: 0,
    Travel: 0,
    "Beauty / Personal": 0,
  };
  for (const row of products) {
    categoryMix[row.customer.category] += 1;
  }

  return {
    task_id: CJ_STORE_LAUNCH_TASK_ID,
    generated_at: generatedAt,
    provider: "cj",
    pilot_batch: CJ_STORE_LAUNCH_BATCH,
    owner_approved_source: "data/cj-store-launch-mix-v1.json",
    live_refresh: {
      attempted: false,
      status: "skipped_existing_launch_mix",
      note: "Used owner-approved launch-mix economics/images. Live CJ re-check was not required to prepare drafts. Read-only sync module is available.",
    },
    store_publication: {
      status: "draft",
      active: false,
      live_store_overwrite: false,
      checkout_enabled: false,
    },
    summary: {
      approved_products: products.length,
      hero_products: hero.length,
      standard_products: standard.length,
      products_flagged: products.filter((row) => row.flags.length > 0).length,
      category_mix: categoryMix,
      substituted: false,
      padded: false,
    },
    products,
  };
}

export function writeApprovedDraftFile(
  catalog: ApprovedDraftFile,
  rootDir = process.cwd()
): string {
  const path = approvedDraftFilePath(rootDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return path;
}

export function readApprovedDraftFile(rootDir = process.cwd()): ApprovedDraftFile | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(approvedDraftFilePath(rootDir), "utf8"));
    if (!isRecord(parsed)) return null;
    if (parsed.task_id !== CJ_STORE_LAUNCH_TASK_ID) return null;
    if (!Array.isArray(parsed.products)) return null;
    return parsed as ApprovedDraftFile;
  } catch {
    return null;
  }
}
