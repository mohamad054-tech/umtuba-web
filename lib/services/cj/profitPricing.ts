/**
 * Profit Gate V2 retail — recalculated from landed cost.
 * Never reuse V1 retail as the selling price.
 *
 * landed = supplier + Ireland shipping + documented fees
 * min retail = max(landed / (1 - targetMargin), landed + minProfit)
 * then clean psychological rounding (.49 / .99).
 */

import { roundCleanRetailMinor } from "./pricing";
import {
  ELEVATED_MARKUP_MULTIPLE,
  ORGANIC_MIN_GROSS_MARGIN,
  ORGANIC_MIN_GROSS_PROFIT_MINOR,
  ORGANIC_UNREALISTIC_RETAIL_MINOR,
  PAID_MAX_LANDED_SHARE,
  PAID_MIN_GROSS_MARGIN,
  PAID_MIN_GROSS_PROFIT_MINOR,
  PAID_PREFERRED_GROSS_PROFIT_MINOR,
  PAID_UNREALISTIC_RETAIL_MINOR,
} from "./profitGate";

export type ProfitPriceLane = "paid" | "organic";

export type ProfitProposedPrice = {
  lane: ProfitPriceLane;
  landedCostMinor: number;
  proposedRetailMinor: number;
  grossProfitMinor: number;
  grossMargin: number;
  landedShareOfRetail: number;
  meetsMarginFloor: boolean;
  meetsProfitFloor: boolean;
  meetsLandedShareFloor: boolean;
  prefersTenDollarProfit: boolean;
  unrealisticRetail: boolean;
  elevatedMarkup: boolean;
  flags: string[];
};

function minRetailForFloors(
  landedCostMinor: number,
  targetMargin: number,
  minProfitMinor: number
): number {
  const fromMargin = Math.ceil(landedCostMinor / (1 - targetMargin));
  const fromProfit = landedCostMinor + minProfitMinor;
  return Math.max(fromMargin, fromProfit);
}

function finalizePrice(
  lane: ProfitPriceLane,
  landedCostMinor: number,
  minRetailMinor: number,
  unrealisticCap: number
): ProfitProposedPrice {
  const proposedRetailMinor = roundCleanRetailMinor(minRetailMinor);
  const grossProfitMinor = proposedRetailMinor - landedCostMinor;
  const grossMargin = proposedRetailMinor > 0 ? grossProfitMinor / proposedRetailMinor : 0;
  const landedShareOfRetail =
    proposedRetailMinor > 0 ? landedCostMinor / proposedRetailMinor : 1;
  const flags: string[] = [];
  const elevatedMarkup =
    landedCostMinor > 0 && proposedRetailMinor / landedCostMinor > ELEVATED_MARKUP_MULTIPLE;
  const unrealisticRetail = proposedRetailMinor > unrealisticCap;
  if (elevatedMarkup) flags.push("elevated_markup_vs_landed");
  if (unrealisticRetail) flags.push("unrealistic_retail_price");
  if (lane === "paid" && grossProfitMinor + 1e-9 >= PAID_PREFERRED_GROSS_PROFIT_MINOR) {
    flags.push("preferred_gross_profit_10");
  }

  const meetsMarginFloor =
    lane === "paid"
      ? grossMargin + 1e-9 >= PAID_MIN_GROSS_MARGIN
      : grossMargin + 1e-9 >= ORGANIC_MIN_GROSS_MARGIN;
  const meetsProfitFloor =
    lane === "paid"
      ? grossProfitMinor >= PAID_MIN_GROSS_PROFIT_MINOR
      : grossProfitMinor >= ORGANIC_MIN_GROSS_PROFIT_MINOR;
  const meetsLandedShareFloor =
    lane === "paid" ? landedShareOfRetail <= PAID_MAX_LANDED_SHARE + 1e-9 : true;

  return {
    lane,
    landedCostMinor,
    proposedRetailMinor,
    grossProfitMinor,
    grossMargin,
    landedShareOfRetail,
    meetsMarginFloor,
    meetsProfitFloor,
    meetsLandedShareFloor,
    prefersTenDollarProfit: grossProfitMinor + 1e-9 >= PAID_PREFERRED_GROSS_PROFIT_MINOR,
    unrealisticRetail,
    elevatedMarkup,
    flags,
  };
}

/** Paid-ad retail: 45% margin, ≥$8 profit, prefer $10, landed share ≤55%. */
export function proposePaidAdRetail(landedCostMinor: number): ProfitProposedPrice {
  const preferredMin = minRetailForFloors(
    landedCostMinor,
    PAID_MIN_GROSS_MARGIN,
    PAID_PREFERRED_GROSS_PROFIT_MINOR
  );
  const preferred = finalizePrice("paid", landedCostMinor, preferredMin, PAID_UNREALISTIC_RETAIL_MINOR);
  if (!preferred.unrealisticRetail) return preferred;

  const floorMin = minRetailForFloors(
    landedCostMinor,
    PAID_MIN_GROSS_MARGIN,
    PAID_MIN_GROSS_PROFIT_MINOR
  );
  return finalizePrice("paid", landedCostMinor, floorMin, PAID_UNREALISTIC_RETAIL_MINOR);
}

/** Organic-only retail: 35% margin, ≥$4 profit. Never mix with paid pricing. */
export function proposeOrganicRetail(landedCostMinor: number): ProfitProposedPrice {
  const minRetail = minRetailForFloors(
    landedCostMinor,
    ORGANIC_MIN_GROSS_MARGIN,
    ORGANIC_MIN_GROSS_PROFIT_MINOR
  );
  return finalizePrice("organic", landedCostMinor, minRetail, ORGANIC_UNREALISTIC_RETAIL_MINOR);
}

export function paidPricePassesMoneyGates(price: ProfitProposedPrice): boolean {
  return (
    price.lane === "paid" &&
    price.meetsMarginFloor &&
    price.meetsProfitFloor &&
    price.meetsLandedShareFloor &&
    !price.unrealisticRetail
  );
}

export function organicPricePassesMoneyGates(price: ProfitProposedPrice): boolean {
  return (
    price.lane === "organic" &&
    price.meetsMarginFloor &&
    price.meetsProfitFloor &&
    !price.unrealisticRetail
  );
}
