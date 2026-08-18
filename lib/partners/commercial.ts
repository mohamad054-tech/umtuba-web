/**
 * Future commercial readiness — data model + calculation only.
 * No real payouts, no tax collection.
 */

import { normalizeCurrencyCode, validateAmountMinor } from "../store/money";
import type {
  PartnerCommercialConfig,
  PayoutLedgerPlaceholder,
  TaxClassification,
} from "./types";

export function defaultCommercialConfig(): PartnerCommercialConfig {
  return {
    markets: [],
    currencies: ["USD"],
    languages: ["en"],
    commissionBps: 0,
    revenueShareBps: 0,
    taxClassification: "UNCLASSIFIED",
    startsAt: null,
    endsAt: null,
  };
}

export function validateCommercialConfig(
  input: PartnerCommercialConfig
): { ok: true } | { ok: false; message: string } {
  if (input.commissionBps < 0 || input.commissionBps > 10_000) {
    return { ok: false, message: "commissionBps must be 0–10000." };
  }
  if (input.revenueShareBps < 0 || input.revenueShareBps > 10_000) {
    return { ok: false, message: "revenueShareBps must be 0–10000." };
  }
  if (input.commissionBps + input.revenueShareBps > 10_000) {
    return { ok: false, message: "commission + revenue share cannot exceed 100%." };
  }
  if (input.currencies.length === 0) {
    return { ok: false, message: "At least one currency is required." };
  }
  for (const currency of input.currencies) {
    if (!/^[A-Z]{3}$/.test(normalizeCurrencyCode(currency))) {
      return { ok: false, message: "Currencies must be 3-letter ISO codes." };
    }
  }
  for (const market of input.markets) {
    if (!/^[A-Z]{2}$/.test(market.trim().toUpperCase())) {
      return { ok: false, message: "Markets must be 2-letter ISO country codes." };
    }
  }
  return { ok: true };
}

export type CommissionPreview = {
  currency: string;
  orderAmountMinor: number;
  platformMinor: number;
  partnerMinor: number;
  taxPlaceholderMinor: number;
  taxClassification: TaxClassification;
  collectable: false;
  payable: false;
};

export function computeCommissionPreview(input: {
  amountMinor: unknown;
  currency: string;
  commissionBps: number;
  taxClassification: TaxClassification;
}): { ok: true; preview: CommissionPreview } | { ok: false; message: string } {
  const money = validateAmountMinor(input.amountMinor, input.currency);
  if (!money.ok) return money;
  if (input.commissionBps < 0 || input.commissionBps > 10_000) {
    return { ok: false, message: "commissionBps must be 0–10000." };
  }
  const platformMinor = Math.trunc((money.amountMinor * input.commissionBps) / 10_000);
  const taxPlaceholderMinor =
    input.taxClassification === "UNCLASSIFIED"
      ? 0
      : Math.trunc(money.amountMinor * 0.1);
  return {
    ok: true,
    preview: {
      currency: money.currency,
      orderAmountMinor: money.amountMinor,
      platformMinor,
      partnerMinor: money.amountMinor - platformMinor,
      taxPlaceholderMinor,
      taxClassification: input.taxClassification,
      collectable: false,
      payable: false,
    },
  };
}

export function createPayoutPlaceholder(input: {
  id: string;
  partnerId: string;
  orderOrEnrollmentId: string;
  attributionKind: PayoutLedgerPlaceholder["attributionKind"];
  currency: string;
  amountMinor: number;
}): { ok: true; entry: PayoutLedgerPlaceholder } | { ok: false; message: string } {
  const money = validateAmountMinor(input.amountMinor, input.currency);
  if (!money.ok) return money;
  return {
    ok: true,
    entry: {
      id: input.id,
      partnerId: input.partnerId,
      orderOrEnrollmentId: input.orderOrEnrollmentId,
      attributionKind: input.attributionKind,
      currency: money.currency,
      amountMinor: money.amountMinor,
      status: "PLACEHOLDER",
      note: "Calculation-only ledger. Real payouts and tax collection are not implemented.",
    },
  };
}

export function assertPayoutNotExecutable(
  entry: PayoutLedgerPlaceholder
): { ok: true } | { ok: false; message: string } {
  if (entry.status === "PLACEHOLDER" || entry.status === "ACCRUED" || entry.status === "VOID") {
    return { ok: true };
  }
  return { ok: false, message: "Unknown payout status is not executable." };
}
