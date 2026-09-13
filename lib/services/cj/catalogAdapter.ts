import { formatMinorUnits } from "../../store/money";
import type { PublicCatalogItem } from "../../store/types";
import {
  CJ_PILOT_BATCH,
  CJ_PILOT_STORE_ID,
  CJ_PILOT_STORE_NAME,
  CJ_PILOT_STORE_SLUG,
  CJ_PROVIDER,
} from "./constants";
import type { CjPilotRecord, CjPilotStoreCatalogItem } from "./types";

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "cj-pilot-item";
}

function isolatedProductId(cjProductId: string): string {
  const compact = cjProductId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 20);
  return `cjpilot00-0000-4000-8000-${compact.padEnd(12, "0")}`;
}

export function toIsolatedStoreCatalogItem(
  record: CjPilotRecord
): CjPilotStoreCatalogItem {
  const now = "1970-01-01T00:00:00.000Z";
  const productId = isolatedProductId(record.cj_product_id);
  const item: PublicCatalogItem = {
    product: {
      id: productId,
      store_id: CJ_PILOT_STORE_ID,
      slug: `cj-pilot-${slugify(record.title)}-${record.cj_product_id.slice(0, 8).toLowerCase()}`,
      title: record.title,
      short_description: `${record.category} · CJ pilot · Ireland test dest`,
      description: record.reason,
      product_type: "physical",
      status: "draft",
      moderation_status: "pending",
      primary_category_id: null,
      brand_id: null,
      created_by: CJ_PILOT_STORE_ID,
      created_at: now,
      updated_at: now,
      published_at: null,
      weight_grams: null,
      origin_country_code: record.source_warehouse_country,
      marketplace_eligible: false,
    },
    store: {
      id: CJ_PILOT_STORE_ID,
      slug: CJ_PILOT_STORE_SLUG,
      name: CJ_PILOT_STORE_NAME,
      logo_path: null,
      status: "draft",
    },
    coverPath: null,
    coverUrl: record.image_urls[0] ?? null,
    priceMinor: record.proposed_retail_price_minor,
    currency: record.currency,
    available: record.stock,
    marketplaceSourceType: "owned",
  };

  return {
    ...item,
    provider: CJ_PROVIDER,
    pilot_batch: CJ_PILOT_BATCH,
    cjProductId: record.cj_product_id,
    cjVariantId: record.cj_variant_id,
    landedCostMinor: record.estimated_landed_cost_minor,
    grossMargin: record.projected_gross_margin,
    estimatedDeliveryTime: record.estimated_delivery_time,
    acceptanceReason: record.reason,
  };
}

export function acceptedPilotCatalogItems(
  records: readonly CjPilotRecord[]
): CjPilotStoreCatalogItem[] {
  return records
    .filter((row) => row.decision === "accepted")
    .map(toIsolatedStoreCatalogItem);
}

export function formatPilotMoney(amountMinor: number | null, currency = "USD"): string {
  if (amountMinor == null) return "Unavailable";
  return formatMinorUnits(amountMinor, currency);
}
