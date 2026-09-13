/**
 * Prints inventory field NAMES and numeric presence only. No tokens, no API key.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createCjReadOnlyClient } from "../../lib/services/cj/client";
import { readApprovedDraftFile } from "../../lib/services/cj/launchDraftFile";
import { createFileTokenCache } from "../../lib/services/cj/tokenCache";

function loadEnvLocalSilently(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key.startsWith("CJ_")) process.env[key] = value;
  }
}

function keysOf(value: unknown): string[] {
  return value && typeof value === "object" ? Object.keys(value as object).sort() : [];
}

function numericHits(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [];
  const hits: string[] = [];
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      hits.push(`${path}=num:${raw > 0 ? "gt0" : "zero"}`);
    } else if (typeof raw === "string" && /^\d+(\.\d+)?$/.test(raw)) {
      hits.push(`${path}=strnum:${Number(raw) > 0 ? "gt0" : "zero"}`);
    } else if (Array.isArray(raw) && raw[0] && typeof raw[0] === "object") {
      hits.push(...numericHits(raw[0], `${path}[0]`));
    } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      hits.push(...numericHits(raw, path));
    }
  }
  return hits.filter((row) => /invent|stock|qty|warehouse|sell|price/i.test(row));
}

async function main() {
  loadEnvLocalSilently();
  const approved = readApprovedDraftFile();
  const first = approved?.products[0];
  if (!first) {
    process.stdout.write("NO_APPROVED\n");
    process.exitCode = 2;
    return;
  }
  const client = createCjReadOnlyClient({
    apiKey: process.env.CJ_API_KEY,
    cache: createFileTokenCache(),
  });
  const queried = await client.queryProduct(first.identity.cj_product_id);
  process.stdout.write(`QUERY_OK=${queried.ok}\n`);
  if (!queried.ok) {
    process.stdout.write(`FAIL_KIND=${queried.message.startsWith("CJ ") ? "client" : "vendor"}\n`);
    process.stdout.write(`FAIL_LEN=${queried.message.length}\n`);
    return;
  }
  const detail = queried.data as unknown as Record<string, unknown>;
  process.stdout.write(`DETAIL_KEYS=${keysOf(detail).join(",")}\n`);
  const variants = Array.isArray(detail.variants) ? detail.variants : [];
  process.stdout.write(`VARIANT_COUNT=${variants.length}\n`);
  const variant = (variants[0] ?? null) as Record<string, unknown> | null;
  process.stdout.write(`VARIANT0_KEYS=${variant ? keysOf(variant).join(",") : "none"}\n`);
  const inventories = variant && Array.isArray(variant.inventories) ? variant.inventories : [];
  process.stdout.write(`INVENTORY_COUNT=${inventories.length}\n`);
  process.stdout.write(
    `INVENTORY0_KEYS=${inventories[0] ? keysOf(inventories[0]).join(",") : "none"}\n`
  );
  process.stdout.write(`NUMERIC_HITS=${numericHits(detail).join("|") || "none"}\n`);
  const invTypes = variants.map((row) => {
    const rec = row as Record<string, unknown>;
    const inv = rec.inventoryNum;
    return `${typeof inv}:${inv == null ? "null" : Number(inv) > 0 ? "gt0" : "zero"}`;
  });
  process.stdout.write(`VARIANT_INVENTORYNUM_TYPES=${invTypes.join(",")}\n`);
  process.stdout.write(`PRODUCT_STATUS_TYPE=${typeof detail.status}\n`);
}

void main();
