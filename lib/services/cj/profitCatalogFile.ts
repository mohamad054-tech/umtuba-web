import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CJ_ENDPOINTS, IRELAND_TEST_DESTINATION } from "./constants";
import {
  CJ_PROFIT_GATE_V2_JSON_RELATIVE_PATH,
  CJ_PROFIT_GATE_V2_TASK_ID,
  type ProfitGateV2File,
  type ProfitGateV2Product,
} from "./profitGate";
import { summarizeProfitGateV2 } from "./profitEvaluate";
import { PROFIT_SCORE_WEIGHTS, RANKING_FORMULA_DESCRIPTION } from "./profitScore";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function profitGateV2FilePath(rootDir = process.cwd()): string {
  return join(rootDir, CJ_PROFIT_GATE_V2_JSON_RELATIVE_PATH);
}

export function emptyProfitGateV2File(input: {
  generatedAt: string;
  connected: boolean;
  expansionAttempted: boolean;
  expansionReason: string | null;
  endpoints: string[];
  products: ProfitGateV2Product[];
}): ProfitGateV2File {
  return {
    task_id: CJ_PROFIT_GATE_V2_TASK_ID,
    generated_at: input.generatedAt,
    provider: "cj",
    cj_api_connected: input.connected,
    expansion_attempted: input.expansionAttempted,
    expansion_reason: input.expansionReason,
    ireland_test_destination: IRELAND_TEST_DESTINATION,
    ranking_formula: {
      description: RANKING_FORMULA_DESCRIPTION,
      weights: { ...PROFIT_SCORE_WEIGHTS },
      notes: [
        "Score ranks products only. Gates are independent and must not be weakened.",
        "margin: 35%→0, 65%+→100",
        "profit: $4→0, $20+→100",
        "delivery: 1 day→100, 14+ days→0 (unknown→40)",
        "stock: 30→0, 500+→100",
        "simplicity: gadget 100 / size hints 40–70 / apparel 15",
        "visual: image count + short concrete title",
        "landed: 55% share→0, 30% share→100",
      ],
    },
    pricing_rule: {
      landed_cost_formula: "supplier + Ireland (IE/Dublin/D02) shipping + documented API fees",
      gross_profit_formula: "retail - landed",
      gross_margin_formula: "gross_profit / retail",
      rounding: "clean psychological .49/.99 after meeting the lane floors",
      paid_floors: "margin>=45% AND profit>=$8 (prefer $10) AND landed<=55% of retail",
      organic_floors: "margin>=35% AND profit>=$4; marked ORGANIC_ONLY; never mixed with paid",
      prior_retail: "V1 retail is recorded for audit only and is never reused as the V2 price",
    },
    gates: {
      paid_ad_ready: [
        "gross margin >= 45%",
        "gross profit >= $8 (prefer $10)",
        "landed share <= 55% of retail",
        "delivery <= 12 days",
        "healthy stock (>=30)",
        "no complicated sizing / apparel return risk",
        "no trademark / battery / heavy / restricted",
        "retail not above $79.99 impulse cap",
      ],
      organic_only: [
        "fails paid gate",
        "gross margin >= 35%",
        "gross profit >= $4",
        "delivery <= 21 days",
        "healthy stock",
        "same hard exclusions",
        "retail not above $99.99",
      ],
      do_not_weaken: true,
    },
    endpoints_used: uniqueKnownEndpoints(input.endpoints),
    summary: summarizeProfitGateV2(input.products),
    products: input.products,
  };
}

export function writeProfitGateV2File(
  catalog: ProfitGateV2File,
  rootDir = process.cwd()
): string {
  const path = profitGateV2FilePath(rootDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return path;
}

export function readProfitGateV2File(rootDir = process.cwd()): ProfitGateV2File | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(profitGateV2FilePath(rootDir), "utf8"));
    if (!isRecord(parsed)) return null;
    if (parsed.task_id !== CJ_PROFIT_GATE_V2_TASK_ID) return null;
    if (parsed.provider !== "cj") return null;
    if (!Array.isArray(parsed.products)) return null;
    return parsed as ProfitGateV2File;
  } catch {
    return null;
  }
}

function uniqueKnownEndpoints(paths: string[]): string[] {
  const known = new Set(Object.values(CJ_ENDPOINTS));
  return [...new Set(paths.filter((path) => known.has(path as (typeof CJ_ENDPOINTS)[keyof typeof CJ_ENDPOINTS])))].sort();
}
