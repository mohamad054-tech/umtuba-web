import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { IRELAND_TEST_DESTINATION } from "./constants";
import {
  CATEGORY_LAUNCH_MAX,
  CJ_LAUNCH_MIX_V1_JSON_RELATIVE_PATH,
  CJ_LAUNCH_MIX_V1_TASK_ID,
  FAMILY_LAUNCH_CAPS,
  PAYMENT_FEE_LABEL,
  PAYMENT_FEE_NOTE,
  TARGET_CPA_FRACTION,
} from "./launchAssumptions";
import { selectLaunchMix, summarizeLaunchMix, type LaunchMixProduct } from "./launchSelect";
import type { ProfitGateV2Product } from "./profitGate";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export type LaunchMixFile = {
  task_id: typeof CJ_LAUNCH_MIX_V1_TASK_ID;
  generated_at: string;
  provider: "cj";
  ireland_test_destination: typeof IRELAND_TEST_DESTINATION;
  assumptions: {
    payment_fee_label: typeof PAYMENT_FEE_LABEL;
    payment_fee_note: typeof PAYMENT_FEE_NOTE;
    payment_fee_formula: string;
    returns_reserve: string;
    break_even_formula: string;
    target_cpa_formula: string;
    net_profit_formula: string;
    ad_rule: string;
    diversity: string;
    do_not_pad: true;
  };
  summary: ReturnType<typeof summarizeLaunchMix>;
  products: LaunchMixProduct[];
};

export function launchMixFilePath(rootDir = process.cwd()): string {
  return join(rootDir, CJ_LAUNCH_MIX_V1_JSON_RELATIVE_PATH);
}

export function buildLaunchMixFile(
  products: readonly ProfitGateV2Product[],
  generatedAt = new Date().toISOString()
): LaunchMixFile {
  const selected = selectLaunchMix(products);
  return {
    task_id: CJ_LAUNCH_MIX_V1_TASK_ID,
    generated_at: generatedAt,
    provider: "cj",
    ireland_test_destination: IRELAND_TEST_DESTINATION,
    assumptions: {
      payment_fee_label: PAYMENT_FEE_LABEL,
      payment_fee_note: PAYMENT_FEE_NOTE,
      payment_fee_formula: "round(retail * 2.9%) + $0.30  [ASSUMED_NOT_FINAL]",
      returns_reserve: "retail * 3% (low) / 6% (medium) / 8% (high jewelry/fashion)",
      break_even_formula: "gross_profit - payment_fee - returns_risk_reserve",
      target_cpa_formula: `${Math.round(TARGET_CPA_FRACTION * 100)}% of break-even (conservative mid of 50–65%)`,
      net_profit_formula: "break_even - target_CPA; net_margin = net / retail",
      ad_rule:
        "High gross margin is not enough. Launch requires break-even >= $4, target CPA >= $2, net at target >= $2.",
      diversity: `Family caps ${JSON.stringify(FAMILY_LAUNCH_CAPS)}; category max ${CATEGORY_LAUNCH_MAX}. Do not pad to 60–80.`,
      do_not_pad: true,
    },
    summary: summarizeLaunchMix(selected),
    products: selected,
  };
}

export function writeLaunchMixFile(catalog: LaunchMixFile, rootDir = process.cwd()): string {
  const path = launchMixFilePath(rootDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return path;
}

export function readLaunchMixFile(rootDir = process.cwd()): LaunchMixFile | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(launchMixFilePath(rootDir), "utf8"));
    if (!isRecord(parsed)) return null;
    if (parsed.task_id !== CJ_LAUNCH_MIX_V1_TASK_ID) return null;
    if (parsed.provider !== "cj") return null;
    if (!Array.isArray(parsed.products)) return null;
    return parsed as LaunchMixFile;
  } catch {
    return null;
  }
}
