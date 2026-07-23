import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_BILLING_BILLABLE_TRUST_LEVEL,
  ADS_BILLING_CONTRACT_VERSION,
  ADS_BILLING_REJECTION_REASONS,
  evaluateAdsBilling,
  parseAdsBillingInput,
  validateAdsBillingEvaluationResult,
  type AdsBillingEvaluationResult,
  type AdsBillingInput,
  type AdsBillingPricingSnapshot,
} from "./billing";
import {
  ADS_CHARGING_CONTRACT_VERSION,
  ADS_CHARGING_MAX_MINOR,
  ADS_CHARGING_MAX_QUANTITY,
  ADS_CHARGING_SUPPORTED_CURRENCIES,
  type AdsBillableEvent,
} from "./charging";

const SOURCE_PATH = path.join(__dirname, "billing.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

function billableEvent(
  overrides: Partial<AdsBillableEvent> = {}
): AdsBillableEvent {
  const eventType = overrides.eventType ?? "impression";
  return Object.freeze({
    eventId: overrides.eventId ?? "evt-1",
    candidateId: overrides.candidateId ?? "cand-1",
    campaignId: overrides.campaignId ?? "camp-1",
    eventType,
    trustLevel: overrides.trustLevel ?? "trusted",
  }) as AdsBillableEvent;
}

function pricing(
  overrides: Partial<AdsBillingPricingSnapshot> = {}
): AdsBillingPricingSnapshot {
  return Object.freeze({
    pricingModel: overrides.pricingModel ?? "cpm",
    unitPriceMinor: overrides.unitPriceMinor ?? 5_000,
    currency: overrides.currency ?? "USD",
    quantity: overrides.quantity ?? 1,
  });
}

function billingInput(
  overrides: {
    billableEvent?: Partial<AdsBillableEvent>;
    pricing?: Partial<AdsBillingPricingSnapshot>;
  } = {}
): AdsBillingInput {
  const event = billableEvent(overrides.billableEvent);
  const model =
    overrides.pricing?.pricingModel ??
    (event.eventType === "impression" ? "cpm" : "cpc");
  const unit =
    overrides.pricing?.unitPriceMinor ??
    (event.eventType === "impression" ? 5_000 : 250);
  return Object.freeze({
    billableEvent: event,
    pricing: pricing({
      pricingModel: model,
      unitPriceMinor: unit,
      currency: "USD",
      quantity: 1,
      ...overrides.pricing,
    }),
  });
}

function expectKillSwitchesOff(result: AdsBillingEvaluationResult): void {
  expect(result.productionEnabled).toBe(false);
  expect(result.deliveryEnabled).toBe(false);
  expect(result.executionEnabled).toBe(false);
  expect(result.authoritativeProductionBilling).toBe(false);
}

describe("Ads Billing Foundation V1", () => {
  it("exposes contract version and rejection order", () => {
    expect(ADS_BILLING_CONTRACT_VERSION).toBe("v1");
    expect(ADS_BILLING_BILLABLE_TRUST_LEVEL).toBe("trusted");
    expect([...ADS_BILLING_REJECTION_REASONS]).toEqual([
      "trust_not_billable",
      "pricing_model_mismatch",
      "charge_amount_zero",
    ]);
    expect(SOURCE).toMatch(/chargeResult is always null/);
  });

  it("has no payments, ledger, wallet, spend mutation, or product imports", () => {
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\//);
    expect(SOURCE).not.toMatch(
      /\bstripe\b|\bpaypal\b|\bledger\b|\bwallet\b|\binvoice\b/i
    );
    expect(SOURCE).not.toMatch(/from ["'][^"']*supabase[^"']*["']/i);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*\/(watch|discover|learning|store|world|messages|live)\//i
    );
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/deliveryEnabled: false/);
    expect(SOURCE).toMatch(/executionEnabled: false/);
  });

  it("marks trusted impression billable with currency-preserving chargeResult", () => {
    const outcome = evaluateAdsBilling(
      billingInput({ pricing: { currency: "KES", quantity: 1 } })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.billingEligible).toBe(true);
    expect(outcome.result.rejectionReason).toBeNull();
    expect(outcome.result.chargeResult).not.toBeNull();
    expect(outcome.result.chargeResult?.chargeMinor).toBe(5);
    expect(outcome.result.chargeResult?.currency).toBe("KES");
    expect(outcome.result.chargeResult?.quantity).toBe(1);
    expect(outcome.result.chargeResult?.calculationRule).toBe(
      "cpm_quantity_floor_v1"
    );
    expect(outcome.result.diagnostics.currency).toBe("KES");
    expect(outcome.result.metadata.supportedCurrencies).toBe(
      ADS_CHARGING_SUPPORTED_CURRENCIES
    );
    expect(outcome.result.metadata.maxQuantity).toBe(ADS_CHARGING_MAX_QUANTITY);
    expect(outcome.result.metadata.maxChargeMinor).toBe(ADS_CHARGING_MAX_MINOR);
    expect(outcome.result.metadata.chargingContractVersion).toBe(
      ADS_CHARGING_CONTRACT_VERSION
    );
    expectKillSwitchesOff(outcome.result);
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.diagnostics)).toBe(true);
    expect(Object.isFrozen(outcome.result.metadata)).toBe(true);
    expect(Object.isFrozen(outcome.result.chargeResult!)).toBe(true);
    expect(validateAdsBillingEvaluationResult(outcome.result).valid).toBe(true);
  });

  it("marks trusted click billable under CPC quantity", () => {
    const outcome = evaluateAdsBilling(
      billingInput({
        billableEvent: { eventType: "click", eventId: "evt-clk" },
        pricing: {
          pricingModel: "cpc",
          unitPriceMinor: 180,
          currency: "GBP",
          quantity: 3,
        },
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.billingEligible).toBe(true);
    expect(outcome.result.chargeResult?.chargeMinor).toBe(540);
    expect(outcome.result.chargeResult?.currency).toBe("GBP");
    expect(outcome.result.chargeResult?.calculationRule).toBe("cpc_quantity_v1");
    expectKillSwitchesOff(outcome.result);
  });

  it("rejects non-trusted events with null chargeResult and no positive charge", () => {
    for (const trustLevel of [
      "untrusted",
      "unverified",
      "suspicious",
      "rejected",
      "provisional",
    ] as const) {
      const outcome = evaluateAdsBilling(
        billingInput({ billableEvent: { trustLevel } })
      );
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;
      expect(outcome.result.billingEligible).toBe(false);
      expect(outcome.result.rejectionReason).toBe("trust_not_billable");
      expect(outcome.result.chargeResult).toBeNull();
      expect(outcome.result.diagnostics.chargeCalculated).toBe(false);
      expect(
        outcome.result.diagnostics.chargeMinor === null ||
          outcome.result.diagnostics.chargeMinor === 0
      ).toBe(true);
      expectKillSwitchesOff(outcome.result);
    }
  });

  it("rejects pricing model mismatch with null chargeResult", () => {
    const outcome = evaluateAdsBilling(
      billingInput({
        billableEvent: { eventType: "impression" },
        pricing: { pricingModel: "cpc", unitPriceMinor: 100 },
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.billingEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("pricing_model_mismatch");
    expect(outcome.result.chargeResult).toBeNull();
    expect(outcome.result.diagnostics.chargeCalculated).toBe(false);
  });

  it("rejects zero charge (quantity 0 or floor-to-zero CPM) with null chargeResult", () => {
    const qtyZero = evaluateAdsBilling(
      billingInput({ pricing: { quantity: 0 } })
    );
    expect(qtyZero.valid).toBe(true);
    if (!qtyZero.valid) return;
    expect(qtyZero.result.billingEligible).toBe(false);
    expect(qtyZero.result.rejectionReason).toBe("charge_amount_zero");
    expect(qtyZero.result.chargeResult).toBeNull();
    expect(qtyZero.result.diagnostics.chargeMinor).toBe(0);
    expect(qtyZero.result.diagnostics.chargeCalculated).toBe(true);

    const floorZero = evaluateAdsBilling(
      billingInput({ pricing: { unitPriceMinor: 999, quantity: 1 } })
    );
    expect(floorZero.valid).toBe(true);
    if (!floorZero.valid) return;
    expect(floorZero.result.rejectionReason).toBe("charge_amount_zero");
    expect(floorZero.result.chargeResult).toBeNull();
  });

  it("applies rejection reasons in documented first-match order without positive charge", () => {
    const trustAndMismatch = evaluateAdsBilling(
      billingInput({
        billableEvent: { trustLevel: "untrusted", eventType: "impression" },
        pricing: { pricingModel: "cpc", unitPriceMinor: 100 },
      })
    );
    expect(trustAndMismatch.valid).toBe(true);
    if (!trustAndMismatch.valid) return;
    expect(trustAndMismatch.result.rejectionReason).toBe("trust_not_billable");
    expect(trustAndMismatch.result.chargeResult).toBeNull();

    const mismatchAndZero = evaluateAdsBilling(
      billingInput({
        billableEvent: { trustLevel: "trusted", eventType: "impression" },
        pricing: { pricingModel: "cpc", unitPriceMinor: 100, quantity: 0 },
      })
    );
    expect(mismatchAndZero.valid).toBe(true);
    if (!mismatchAndZero.valid) return;
    expect(mismatchAndZero.result.rejectionReason).toBe(
      "pricing_model_mismatch"
    );
    expect(mismatchAndZero.result.chargeResult).toBeNull();
  });

  it("fail-closes currency override attempts and invalid currencies", () => {
    expect(
      parseAdsBillingInput({
        billableEvent: { ...billableEvent(), currency: "USD" },
        pricing: pricing(),
      }).valid
    ).toBe(false);

    for (const currency of ["usd", "Usd", "", "XXX", "US"]) {
      expect(
        parseAdsBillingInput(
          billingInput({ pricing: { currency: currency as "USD" } })
        ).valid
      ).toBe(false);
    }
  });

  it("fail-closes caller injection of billingEligible and chargeResult", () => {
    const injected = parseAdsBillingInput({
      ...billingInput(),
      billingEligible: true,
      chargeResult: { chargeMinor: 999 },
    });
    expect(injected.valid).toBe(false);
    if (injected.valid) return;
    expect(
      injected.issues.some((issue) => issue.includes("billingEligible"))
    ).toBe(true);
    expect(injected.issues.some((issue) => issue.includes("chargeResult"))).toBe(
      true
    );
  });

  it("fail-closes unknown fields, monetary overrides, malformed and empty input", () => {
    expect(parseAdsBillingInput(null).valid).toBe(false);
    expect(parseAdsBillingInput(undefined).valid).toBe(false);
    expect(parseAdsBillingInput({}).valid).toBe(false);
    expect(
      parseAdsBillingInput({ ...billingInput(), ledgerPost: true }).valid
    ).toBe(false);
    expect(
      parseAdsBillingInput({
        billableEvent: { ...billableEvent(), amountMinor: 10 },
        pricing: pricing(),
      }).valid
    ).toBe(false);
    expect(
      parseAdsBillingInput({
        billableEvent: billableEvent(),
        pricing: { ...pricing(), unitPriceMinor: NaN },
      }).valid
    ).toBe(false);
    expect(
      parseAdsBillingInput({
        billableEvent: billableEvent(),
        pricing: { ...pricing(), unitPriceMinor: Infinity },
      }).valid
    ).toBe(false);
    expect(
      parseAdsBillingInput({
        billableEvent: billableEvent(),
        pricing: { ...pricing(), unitPriceMinor: -1 },
      }).valid
    ).toBe(false);
    expect(
      parseAdsBillingInput({
        billableEvent: billableEvent(),
        pricing: { ...pricing(), quantity: NaN },
      }).valid
    ).toBe(false);
    expect(
      parseAdsBillingInput({
        billableEvent: {
          eventId: "e",
          candidateId: "c",
          campaignId: "camp",
          eventType: "conversion" as "impression",
          trustLevel: "trusted",
        },
        pricing: pricing(),
      }).valid
    ).toBe(false);
  });

  it("does not mutate billable event, pricing, or quantity inputs", () => {
    const event = {
      eventId: "evt-mut",
      candidateId: "cand-mut",
      campaignId: "camp-mut",
      eventType: "impression" as const,
      trustLevel: "trusted" as const,
    };
    const price = {
      pricingModel: "cpm" as const,
      unitPriceMinor: 2_000,
      currency: "EUR" as const,
      quantity: 2,
    };
    const input = { billableEvent: event, pricing: price };
    const eventSnap = structuredClone(event);
    const priceSnap = structuredClone(price);
    const outcome = evaluateAdsBilling(input);
    expect(outcome.valid).toBe(true);
    expect(event).toEqual(eventSnap);
    expect(price).toEqual(priceSnap);
    if (!outcome.valid) return;
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.chargeResult!)).toBe(true);
    expect(Object.isFrozen(outcome.result.diagnostics)).toBe(true);
    expect(Object.isFrozen(outcome.result.metadata)).toBe(true);
  });

  it("is deterministic across repeated evaluations", () => {
    const input = billingInput({ pricing: { quantity: 4, currency: "NGN" } });
    const a = evaluateAdsBilling(input);
    const b = evaluateAdsBilling(input);
    expect(a).toEqual(b);
    if (!a.valid) return;
    expect(a.result.chargeResult?.chargeMinor).toBe(
      Math.floor((5_000 * 4) / 1000)
    );
    expect(a.result.chargeResult?.currency).toBe("NGN");
  });

  it("fail-closes result injection of production kill switches", () => {
    const outcome = evaluateAdsBilling(billingInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    const injected = {
      ...outcome.result,
      productionEnabled: true,
      deliveryEnabled: true,
      executionEnabled: true,
    };
    const validated = validateAdsBillingEvaluationResult(injected);
    expect(validated.valid).toBe(false);
  });
});
