import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_CHARGEABLE_EVENT_TYPES,
  ADS_CHARGING_CALCULATION_RULES,
  ADS_CHARGING_CONTRACT_VERSION,
  ADS_CHARGING_MAX_MINOR,
  ADS_CHARGING_MAX_QUANTITY,
  ADS_CHARGING_PRICING_MODELS,
  ADS_CHARGING_SUPPORTED_CURRENCIES,
  calculateAdsCharge,
  computeChargeMinor,
  expectedPricingModelForEventType,
  isAdsChargingCurrency,
  parseAdsBillableEvent,
  parseAdsChargeCalculationInput,
  safeMultiplyMinor,
  validateAdsBillableEvent,
  validateAdsChargeCalculationResult,
  type AdsBillableEvent,
  type AdsChargeCalculationInput,
  type AdsChargeCalculationResult,
} from "./charging";

const SOURCE_PATH = path.join(__dirname, "charging.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

function impression(
  overrides: Partial<AdsBillableEvent> & {
    eventId?: string;
    trustLevel?: AdsBillableEvent["trustLevel"];
  } = {}
): AdsBillableEvent {
  return Object.freeze({
    eventId: overrides.eventId ?? "evt-imp-1",
    candidateId: "cand-1",
    campaignId: "camp-1",
    eventType: "impression" as const,
    trustLevel: overrides.trustLevel ?? "trusted",
  });
}

function click(
  overrides: Partial<AdsBillableEvent> & {
    eventId?: string;
    trustLevel?: AdsBillableEvent["trustLevel"];
  } = {}
): AdsBillableEvent {
  return Object.freeze({
    eventId: overrides.eventId ?? "evt-clk-1",
    candidateId: "cand-1",
    campaignId: "camp-1",
    eventType: "click" as const,
    trustLevel: overrides.trustLevel ?? "trusted",
  });
}

function chargeInput(
  overrides: Partial<AdsChargeCalculationInput> = {}
): AdsChargeCalculationInput {
  return Object.freeze({
    eventType: overrides.eventType ?? "impression",
    pricingModel: overrides.pricingModel ?? "cpm",
    unitPriceMinor: overrides.unitPriceMinor ?? 5_000,
    currency: overrides.currency ?? "USD",
    quantity: overrides.quantity ?? 1,
  });
}

describe("Ads Charging Foundation V1", () => {
  it("exposes contract constants, currencies, and pricing mapping", () => {
    expect(ADS_CHARGING_CONTRACT_VERSION).toBe("v1");
    expect([...ADS_CHARGEABLE_EVENT_TYPES]).toEqual(["impression", "click"]);
    expect([...ADS_CHARGING_PRICING_MODELS]).toEqual(["cpm", "cpc"]);
    expect([...ADS_CHARGING_CALCULATION_RULES]).toEqual([
      "cpm_quantity_floor_v1",
      "cpc_quantity_v1",
    ]);
    expect([...ADS_CHARGING_SUPPORTED_CURRENCIES]).toEqual([
      "USD",
      "EUR",
      "GBP",
      "ZAR",
      "NGN",
      "KES",
      "GHS",
    ]);
    expect(ADS_CHARGING_MAX_MINOR).toBe(1_000_000_000_000);
    expect(ADS_CHARGING_MAX_QUANTITY).toBe(1_000_000_000);
    expect(expectedPricingModelForEventType("impression")).toBe("cpm");
    expect(expectedPricingModelForEventType("click")).toBe("cpc");
    expect(SOURCE).toMatch(/quantity === 0 is a valid contract input/);
    expect(SOURCE).toMatch(/intentional fail-closed behavior/);
  });

  it("has no payments, ledger, wallet, randomness, or product imports", () => {
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\//);
    expect(SOURCE).not.toMatch(/\bstripe\b|\bpaypal\b|\bledger\b|\bwallet\b/i);
    expect(SOURCE).not.toMatch(/from ["'][^"']*supabase[^"']*["']/i);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*\/(watch|discover|learning|store|world|messages|live)\//i
    );
    expect(SOURCE).toMatch(/never client-authoritative|never taken from the client/i);
  });

  it("validates canonical uppercase currency allowlist only", () => {
    expect(isAdsChargingCurrency("USD")).toBe(true);
    expect(isAdsChargingCurrency("usd")).toBe(false);
    expect(isAdsChargingCurrency("Usd")).toBe(false);
    expect(isAdsChargingCurrency("")).toBe(false);
    expect(isAdsChargingCurrency("XXX")).toBe(false);
    expect(isAdsChargingCurrency("US")).toBe(false);
    expect(
      parseAdsChargeCalculationInput(
        chargeInput({ currency: "usd" as unknown as "USD" })
      ).valid
    ).toBe(false);
    expect(parseAdsChargeCalculationInput(chargeInput({ currency: "EUR" })).valid).toBe(
      true
    );
  });

  it("preserves authoritative currency unchanged on chargeResult", () => {
    const outcome = calculateAdsCharge(chargeInput({ currency: "ZAR", quantity: 1 }));
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.currency).toBe("ZAR");
  });

  it("parses billable impression and click contracts", () => {
    const parsedImp = parseAdsBillableEvent(impression());
    expect(parsedImp.valid).toBe(true);
    if (!parsedImp.valid) return;
    expect(parsedImp.event.eventType).toBe("impression");
    expect(Object.isFrozen(parsedImp.event)).toBe(true);
    expect(validateAdsBillableEvent(parsedImp.event).valid).toBe(true);

    const parsedClk = parseAdsBillableEvent(click());
    expect(parsedClk.valid).toBe(true);
    if (!parsedClk.valid) return;
    expect(parsedClk.event.eventType).toBe("click");
  });

  it("fail-closes client monetary, currency, and quantity overrides on events", () => {
    for (const field of [
      { chargeMinor: 100 },
      { bidMinor: 50 },
      { priceMinor: 50 },
      { currency: "USD" },
      { quantity: 10 },
      { unitPriceMinor: 1000 },
      { cpm: 5 },
      { cpc: 1 },
      { total: 99 },
    ]) {
      const parsed = parseAdsBillableEvent({ ...impression(), ...field });
      expect(parsed.valid).toBe(false);
    }
  });

  it("rejects unsupported event types", () => {
    const parsed = parseAdsBillableEvent({
      eventId: "e1",
      candidateId: "c1",
      campaignId: "camp1",
      eventType: "conversion",
      trustLevel: "trusted",
    });
    expect(parsed.valid).toBe(false);
  });

  it("documents and applies CPM floor(unitPriceMinor * quantity / 1000)", () => {
    expect(computeChargeMinor("cpm", 5_000, 1)).toEqual({
      ok: true,
      chargeMinor: 5,
      calculationRule: "cpm_quantity_floor_v1",
    });
    // Intentional floor-to-zero for unit prices below 1000 at quantity 1.
    expect(computeChargeMinor("cpm", 999, 1)).toEqual({
      ok: true,
      chargeMinor: 0,
      calculationRule: "cpm_quantity_floor_v1",
    });
  });

  it("covers CPM quantity boundaries 0/1/999/1000/1001 and multi-thousands", () => {
    const unit = 5_000;
    const cases: Array<[number, number]> = [
      [0, 0],
      [1, 5],
      [999, Math.floor((unit * 999) / 1000)],
      [1000, Math.floor((unit * 1000) / 1000)],
      [1001, Math.floor((unit * 1001) / 1000)],
      [3000, Math.floor((unit * 3000) / 1000)],
    ];
    for (const [quantity, expected] of cases) {
      const outcome = calculateAdsCharge(chargeInput({ unitPriceMinor: unit, quantity }));
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;
      expect(outcome.result.chargeMinor).toBe(expected);
      expect(outcome.result.quantity).toBe(quantity);
    }
    expect(cases[2]![1]).toBe(4_995);
    expect(cases[3]![1]).toBe(5_000);
    expect(cases[4]![1]).toBe(5_005);
    expect(cases[5]![1]).toBe(15_000);
  });

  it("covers CPC quantity 0/1/multiple and large safe quantity", () => {
    expect(
      calculateAdsCharge(
        chargeInput({
          eventType: "click",
          pricingModel: "cpc",
          unitPriceMinor: 250,
          quantity: 0,
        })
      )
    ).toMatchObject({ valid: true, result: { chargeMinor: 0 } });

    expect(
      calculateAdsCharge(
        chargeInput({
          eventType: "click",
          pricingModel: "cpc",
          unitPriceMinor: 250,
          quantity: 1,
        })
      )
    ).toMatchObject({ valid: true, result: { chargeMinor: 250 } });

    expect(
      calculateAdsCharge(
        chargeInput({
          eventType: "click",
          pricingModel: "cpc",
          unitPriceMinor: 250,
          quantity: 7,
        })
      )
    ).toMatchObject({ valid: true, result: { chargeMinor: 1_750 } });

    const largeQty = 1_000_000;
    const outcome = calculateAdsCharge(
      chargeInput({
        eventType: "click",
        pricingModel: "cpc",
        unitPriceMinor: 2,
        quantity: largeQty,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.chargeMinor).toBe(2_000_000);
  });

  it("rejects unsafe overflow multiplication", () => {
    expect(safeMultiplyMinor(Number.MAX_SAFE_INTEGER, 2).ok).toBe(false);
    expect(
      computeChargeMinor("cpc", ADS_CHARGING_MAX_MINOR, ADS_CHARGING_MAX_QUANTITY)
        .ok
    ).toBe(false);
    expect(computeChargeMinor("cpc", ADS_CHARGING_MAX_MINOR, 2).ok).toBe(false);

    const overflow = calculateAdsCharge(
      chargeInput({
        eventType: "click",
        pricingModel: "cpc",
        unitPriceMinor: ADS_CHARGING_MAX_MINOR,
        quantity: ADS_CHARGING_MAX_QUANTITY,
      })
    );
    expect(overflow.valid).toBe(false);
  });

  it("fail-closes invalid prices and quantities", () => {
    const invalidPrices = [
      NaN,
      Infinity,
      -Infinity,
      -1,
      1.5,
      0,
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER + 1,
    ];
    for (const unitPriceMinor of invalidPrices) {
      expect(
        parseAdsChargeCalculationInput(chargeInput({ unitPriceMinor })).valid
      ).toBe(false);
    }

    const invalidQuantities = [
      NaN,
      Infinity,
      -Infinity,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER + 1,
    ];
    for (const quantity of invalidQuantities) {
      expect(parseAdsChargeCalculationInput(chargeInput({ quantity })).valid).toBe(
        false
      );
    }
  });

  it("fail-closes malformed, empty, and unknown fields", () => {
    expect(parseAdsChargeCalculationInput(null).valid).toBe(false);
    expect(parseAdsChargeCalculationInput(undefined).valid).toBe(false);
    expect(parseAdsChargeCalculationInput({}).valid).toBe(false);
    expect(
      parseAdsChargeCalculationInput({ ...chargeInput(), spendMinor: 1 }).valid
    ).toBe(false);
  });

  it("fail-closes pricing model mismatch on charge input", () => {
    const parsed = parseAdsChargeCalculationInput(
      chargeInput({ eventType: "impression", pricingModel: "cpc" })
    );
    expect(parsed.valid).toBe(false);
  });

  it("is deterministic and does not mutate inputs", () => {
    const input = {
      eventType: "impression" as const,
      pricingModel: "cpm" as const,
      unitPriceMinor: 7_777,
      currency: "USD" as const,
      quantity: 3,
    };
    const snapshot = structuredClone(input);
    const a = calculateAdsCharge(input);
    const b = calculateAdsCharge(input);
    expect(a).toEqual(b);
    expect(input).toEqual(snapshot);
    if (!a.valid) return;
    expect(Object.isFrozen(a.result)).toBe(true);
    expect(a.result.chargeMinor).toBe(Math.floor((7_777 * 3) / 1000));
  });

  it("validates charge results against deterministic math and currency", () => {
    const good: AdsChargeCalculationResult = Object.freeze({
      contractVersion: ADS_CHARGING_CONTRACT_VERSION,
      eventType: "impression",
      pricingModel: "cpm",
      unitPriceMinor: 5_000,
      currency: "USD",
      quantity: 1,
      chargeMinor: 5,
      calculationRule: "cpm_quantity_floor_v1",
    });
    expect(validateAdsChargeCalculationResult(good).valid).toBe(true);
    expect(
      validateAdsChargeCalculationResult({ ...good, chargeMinor: 99 }).valid
    ).toBe(false);
    expect(
      validateAdsChargeCalculationResult({ ...good, currency: "usd" }).valid
    ).toBe(false);
  });
});
