import { majorToMinorUnits } from "../../store/money";
import { TARGET_GROSS_MARGIN, TARGET_LANDED_SHARE_OF_RETAIL } from "./constants";
import type { CjFreightOption } from "./types";

export type LandedCostInput = {
  supplierPriceMinor: number;
  shippingMinor: number;
  feesMinor?: number;
};

export type ProposedPrice = {
  landedCostMinor: number;
  proposedRetailMinor: number;
  grossProfitMinor: number;
  grossMargin: number;
  landedShareOfRetail: number;
  meetsMarginTarget: boolean;
  meetsLandedShareTarget: boolean;
  marketCompetitiveness: "unverified";
};

export function parseUsdToMinor(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return majorToMinorUnits(value);
  }
  const match = String(value).match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return majorToMinorUnits(Number(match[1]));
}

export function pickCheapestFreight(options: readonly CjFreightOption[]): {
  shippingMinor: number;
  feesMinor: number;
  aging: string | null;
  name: string | null;
} | null {
  let best: { shippingMinor: number; feesMinor: number; aging: string | null; name: string | null } | null =
    null;
  for (const option of options) {
    const shippingMinor = parseUsdToMinor(option.logisticPrice);
    if (shippingMinor == null) continue;
    const feesMinor =
      (parseUsdToMinor(option.taxesFee) ?? 0) +
      (parseUsdToMinor(option.clearanceOperationFee) ?? 0);
    if (!best || shippingMinor + feesMinor < best.shippingMinor + best.feesMinor) {
      best = {
        shippingMinor,
        feesMinor,
        aging: option.logisticAging ?? null,
        name: option.logisticName ?? null,
      };
    }
  }
  return best;
}

export function computeLandedCostMinor(input: LandedCostInput): number {
  return input.supplierPriceMinor + input.shippingMinor + (input.feesMinor ?? 0);
}

/**
 * Round up to a clean shelf price without going below the floor.
 * Under $5: .49 / .99. At or above $5: whole dollars or .99.
 */
export function roundCleanRetailMinor(minRetailMinor: number): number {
  if (!Number.isFinite(minRetailMinor) || minRetailMinor <= 0) return 0;
  const floor = Math.ceil(minRetailMinor);
  if (floor < 500) {
    const dollars = Math.floor(floor / 100);
    const cents = floor - dollars * 100;
    if (cents <= 49) return dollars * 100 + 49;
    return dollars * 100 + 99;
  }
  if (floor % 100 === 0) return floor;
  return Math.floor(floor / 100) * 100 + 99;
}

export function proposeRetailFromLanded(landedCostMinor: number): ProposedPrice {
  const minRetailMinor = Math.ceil(landedCostMinor / (1 - TARGET_GROSS_MARGIN));
  const proposedRetailMinor = roundCleanRetailMinor(minRetailMinor);
  const grossProfitMinor = proposedRetailMinor - landedCostMinor;
  const grossMargin =
    proposedRetailMinor > 0 ? grossProfitMinor / proposedRetailMinor : 0;
  const landedShareOfRetail =
    proposedRetailMinor > 0 ? landedCostMinor / proposedRetailMinor : 1;
  return {
    landedCostMinor,
    proposedRetailMinor,
    grossProfitMinor,
    grossMargin,
    landedShareOfRetail,
    meetsMarginTarget: grossMargin + 1e-9 >= TARGET_GROSS_MARGIN,
    meetsLandedShareTarget: landedShareOfRetail <= TARGET_LANDED_SHARE_OF_RETAIL + 1e-9,
    marketCompetitiveness: "unverified",
  };
}
