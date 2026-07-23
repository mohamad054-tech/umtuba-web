import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";
import {
  ADS_FREQUENCY_CONTRACT_VERSION,
  ADS_FREQUENCY_MAX_COUNT,
  ADS_FREQUENCY_REJECTION_REASONS,
  evaluateAdsFrequency,
  parseAdsFrequencySnapshot,
  validateAdsFrequencyEvaluationResult,
  validateAdsFrequencySnapshot,
  type AdsFrequencyEvaluationResult,
  type AdsFrequencySnapshot,
} from "./frequency";

const SOURCE_PATH = path.join(__dirname, "frequency.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

function snapshot(
  overrides: Partial<AdsFrequencySnapshot> & {
    candidateId?: string;
    campaignId?: string;
  } = {}
): AdsFrequencySnapshot {
  return Object.freeze({
    candidateId: overrides.candidateId ?? "cand-1",
    campaignId: overrides.campaignId ?? "camp-1",
    userExposureCount: overrides.userExposureCount ?? 2,
    dailyExposureCount: overrides.dailyExposureCount ?? 1,
    campaignExposureCount: overrides.campaignExposureCount ?? 2,
    dailyCap: overrides.dailyCap === undefined ? 5 : overrides.dailyCap,
    lifetimeCap:
      overrides.lifetimeCap === undefined ? 20 : overrides.lifetimeCap,
    campaignCap:
      overrides.campaignCap === undefined ? 10 : overrides.campaignCap,
  });
}

function expectKillSwitchesOff(result: AdsFrequencyEvaluationResult): void {
  expect(result.productionEnabled).toBe(false);
  expect(result.deliveryEnabled).toBe(false);
  expect(result.executionEnabled).toBe(false);
}

describe("Ads Frequency Capping Foundation V1", () => {
  it("exposes contract version and runtime-aligned rejection order", () => {
    expect(ADS_FREQUENCY_CONTRACT_VERSION).toBe("v1");
    expect([...ADS_FREQUENCY_REJECTION_REASONS]).toEqual([
      "no_frequency_cap_configured",
      "daily_cap_exceeded",
      "lifetime_cap_exceeded",
      "campaign_cap_exceeded",
    ]);
    expect(ADS_FREQUENCY_MAX_COUNT).toBe(1_000_000_000);
    expect(SOURCE).toMatch(/count >= cap/);
  });

  it("has no persistence, analytics, randomness, or product imports", () => {
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\//);
    expect(SOURCE).not.toMatch(/from ["'][^"']*supabase[^"']*["']/i);
    expect(SOURCE).not.toMatch(/from ["'][^"']*redis[^"']*["']/i);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*\/(watch|discover|learning|store|world|messages|live)\//i
    );
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/deliveryEnabled: false/);
    expect(SOURCE).toMatch(/executionEnabled: false/);
  });

  it("marks eligible frequency with diagnostics and metadata", () => {
    const outcome = evaluateAdsFrequency(snapshot());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.frequencyEligible).toBe(true);
    expect(outcome.result.rejectionReason).toBeNull();
    expect(outcome.result.candidateId).toBe("cand-1");
    expect(outcome.result.campaignId).toBe("camp-1");
    expect(outcome.result.diagnostics.dailyConstraintActive).toBe(true);
    expect(outcome.result.diagnostics.lifetimeConstraintActive).toBe(true);
    expect(outcome.result.diagnostics.campaignConstraintActive).toBe(true);
    expect(outcome.result.diagnostics.userExposureCount).toBe(2);
    expect(outcome.result.metadata.contractVersion).toBe(
      ADS_FREQUENCY_CONTRACT_VERSION
    );
    expect(outcome.result.metadata.maxCount).toBe(ADS_FREQUENCY_MAX_COUNT);
    expectKillSwitchesOff(outcome.result);
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.diagnostics)).toBe(true);
    expect(Object.isFrozen(outcome.result.metadata)).toBe(true);
    expect(validateAdsFrequencyEvaluationResult(outcome.result).valid).toBe(
      true
    );
  });

  it("allows daily-only, lifetime-only, or campaign-only constraints", () => {
    const dailyOnly = evaluateAdsFrequency(
      snapshot({
        lifetimeCap: null,
        campaignCap: null,
        dailyCap: 3,
        dailyExposureCount: 1,
        userExposureCount: 1,
        campaignExposureCount: 1,
      })
    );
    expect(dailyOnly.valid).toBe(true);
    if (!dailyOnly.valid) return;
    expect(dailyOnly.result.frequencyEligible).toBe(true);

    const lifetimeOnly = evaluateAdsFrequency(
      snapshot({
        dailyCap: null,
        campaignCap: null,
        lifetimeCap: 5,
        userExposureCount: 2,
        dailyExposureCount: 1,
        campaignExposureCount: 1,
      })
    );
    expect(lifetimeOnly.valid).toBe(true);
    if (!lifetimeOnly.valid) return;
    expect(lifetimeOnly.result.frequencyEligible).toBe(true);

    const campaignOnly = evaluateAdsFrequency(
      snapshot({
        dailyCap: null,
        lifetimeCap: null,
        campaignCap: 4,
        campaignExposureCount: 2,
        userExposureCount: 2,
        dailyExposureCount: 1,
      })
    );
    expect(campaignOnly.valid).toBe(true);
    if (!campaignOnly.valid) return;
    expect(campaignOnly.result.frequencyEligible).toBe(true);
  });

  it("rejects when no caps are configured", () => {
    const outcome = evaluateAdsFrequency(
      snapshot({
        dailyCap: null,
        lifetimeCap: null,
        campaignCap: null,
        userExposureCount: 0,
        dailyExposureCount: 0,
        campaignExposureCount: 0,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.frequencyEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("no_frequency_cap_configured");
    expectKillSwitchesOff(outcome.result);
  });

  it("rejects daily cap at exact boundary (count === cap)", () => {
    const outcome = evaluateAdsFrequency(
      snapshot({
        dailyCap: 3,
        dailyExposureCount: 3,
        userExposureCount: 3,
        campaignExposureCount: 3,
        lifetimeCap: 20,
        campaignCap: 10,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.frequencyEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("daily_cap_exceeded");
  });

  it("rejects daily cap when count is above cap", () => {
    const outcome = evaluateAdsFrequency(
      snapshot({
        dailyCap: 3,
        dailyExposureCount: 4,
        userExposureCount: 4,
        campaignExposureCount: 4,
        lifetimeCap: 20,
        campaignCap: 10,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.frequencyEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("daily_cap_exceeded");
  });

  it("rejects lifetime cap at exact boundary (count === cap)", () => {
    const outcome = evaluateAdsFrequency(
      snapshot({
        dailyCap: null,
        campaignCap: null,
        lifetimeCap: 5,
        userExposureCount: 5,
        dailyExposureCount: 2,
        campaignExposureCount: 3,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.frequencyEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("lifetime_cap_exceeded");
  });

  it("rejects lifetime cap when userExposureCount is above lifetimeCap", () => {
    const outcome = evaluateAdsFrequency(
      snapshot({
        dailyCap: null,
        campaignCap: null,
        lifetimeCap: 5,
        userExposureCount: 6,
        dailyExposureCount: 2,
        campaignExposureCount: 3,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.frequencyEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("lifetime_cap_exceeded");
  });

  it("rejects campaign cap at exact boundary (count === cap)", () => {
    const outcome = evaluateAdsFrequency(
      snapshot({
        dailyCap: null,
        lifetimeCap: null,
        campaignCap: 4,
        campaignExposureCount: 4,
        userExposureCount: 4,
        dailyExposureCount: 1,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.frequencyEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("campaign_cap_exceeded");
  });

  it("rejects campaign cap when count is above cap", () => {
    const outcome = evaluateAdsFrequency(
      snapshot({
        dailyCap: null,
        lifetimeCap: null,
        campaignCap: 4,
        campaignExposureCount: 5,
        userExposureCount: 5,
        dailyExposureCount: 1,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.frequencyEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("campaign_cap_exceeded");
  });

  it("uses first-match rejection order (daily before lifetime before campaign)", () => {
    const dailyWins = evaluateAdsFrequency(
      snapshot({
        dailyCap: 2,
        lifetimeCap: 2,
        campaignCap: 2,
        dailyExposureCount: 2,
        userExposureCount: 2,
        campaignExposureCount: 2,
      })
    );
    expect(dailyWins.valid).toBe(true);
    if (!dailyWins.valid) return;
    expect(dailyWins.result.rejectionReason).toBe("daily_cap_exceeded");

    const lifetimeWins = evaluateAdsFrequency(
      snapshot({
        dailyCap: 10,
        lifetimeCap: 10,
        campaignCap: 3,
        dailyExposureCount: 2,
        userExposureCount: 10,
        campaignExposureCount: 3,
      })
    );
    expect(lifetimeWins.valid).toBe(true);
    if (!lifetimeWins.valid) return;
    expect(lifetimeWins.result.rejectionReason).toBe("lifetime_cap_exceeded");

    const campaignWins = evaluateAdsFrequency(
      snapshot({
        dailyCap: 10,
        lifetimeCap: 20,
        campaignCap: 3,
        dailyExposureCount: 2,
        userExposureCount: 5,
        campaignExposureCount: 3,
      })
    );
    expect(campaignWins.valid).toBe(true);
    if (!campaignWins.valid) return;
    expect(campaignWins.result.rejectionReason).toBe("campaign_cap_exceeded");
  });

  it("allows count exactly one below cap", () => {
    const outcome = evaluateAdsFrequency(
      snapshot({
        dailyCap: 5,
        dailyExposureCount: 4,
        userExposureCount: 4,
        campaignExposureCount: 4,
        lifetimeCap: 10,
        campaignCap: 10,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.frequencyEligible).toBe(true);
  });

  it("rejects zero, negative, fractional, NaN, and Infinity caps", () => {
    const invalidCaps = [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY];
    const fields = ["dailyCap", "lifetimeCap", "campaignCap"] as const;

    for (const field of fields) {
      for (const value of invalidCaps) {
        const parsed = parseAdsFrequencySnapshot(
          snapshot({ [field]: value } as Partial<AdsFrequencySnapshot>)
        );
        expect(parsed.valid).toBe(false);
        if (parsed.valid) continue;
        expect(parsed.issues.some((issue) => issue.includes(field))).toBe(true);
      }
    }
  });

  it("rejects inconsistent lifetimeCap < dailyCap", () => {
    const parsed = parseAdsFrequencySnapshot(
      snapshot({ dailyCap: 10, lifetimeCap: 5 })
    );
    expect(parsed.valid).toBe(false);
    if (parsed.valid) return;
    expect(
      parsed.issues.some((issue) =>
        issue.includes("lifetimeCap must be greater than or equal to dailyCap")
      )
    ).toBe(true);
  });

  it("rejects daily/campaign exposure exceeding user exposure", () => {
    const daily = parseAdsFrequencySnapshot(
      snapshot({
        userExposureCount: 1,
        dailyExposureCount: 2,
        campaignExposureCount: 1,
      })
    );
    expect(daily.valid).toBe(false);

    const campaign = parseAdsFrequencySnapshot(
      snapshot({
        userExposureCount: 1,
        dailyExposureCount: 1,
        campaignExposureCount: 2,
      })
    );
    expect(campaign.valid).toBe(false);
  });

  it("rejects unknown fields, non-objects, and oversize ids", () => {
    expect(parseAdsFrequencySnapshot(null).valid).toBe(false);
    expect(parseAdsFrequencySnapshot([]).valid).toBe(false);
    expect(
      parseAdsFrequencySnapshot({ ...snapshot(), extra: true }).valid
    ).toBe(false);
    expect(
      parseAdsFrequencySnapshot(
        snapshot({ candidateId: "x".repeat(ADS_DELIVERY_MAX_ID_LENGTH + 1) })
      ).valid
    ).toBe(false);
    expect(validateAdsFrequencySnapshot(snapshot()).valid).toBe(true);
  });

  it("rejects NaN, Infinity, negative, fractional, and out-of-range counters", () => {
    const invalidCounts = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
      1.5,
      ADS_FREQUENCY_MAX_COUNT + 1,
    ];
    const fields = [
      "userExposureCount",
      "dailyExposureCount",
      "campaignExposureCount",
    ] as const;

    for (const field of fields) {
      for (const value of invalidCounts) {
        const overrides: {
          userExposureCount: number;
          dailyExposureCount: number;
          campaignExposureCount: number;
        } = {
          userExposureCount: 2,
          dailyExposureCount: 1,
          campaignExposureCount: 1,
        };
        overrides[field] = value;
        // Keep remaining counters consistent when the invalid field is not user.
        if (
          field !== "userExposureCount" &&
          Number.isInteger(value) &&
          value > 2
        ) {
          overrides.userExposureCount = value;
        }
        const parsed = parseAdsFrequencySnapshot(snapshot(overrides));
        expect(parsed.valid).toBe(false);
        if (parsed.valid) continue;
        expect(parsed.issues.some((issue) => issue.includes(field))).toBe(true);
      }
    }
  });

  it("does not mutate the input snapshot", () => {
    const input = {
      candidateId: "cand-immutable",
      campaignId: "camp-immutable",
      userExposureCount: 2,
      dailyExposureCount: 1,
      campaignExposureCount: 2,
      dailyCap: 5 as number | null,
      lifetimeCap: 20 as number | null,
      campaignCap: 10 as number | null,
    };
    Object.freeze(input);
    const before = structuredClone(input);

    const outcome = evaluateAdsFrequency(input);
    expect(outcome.valid).toBe(true);
    expect(input).toEqual(before);
    expect(Object.isFrozen(input)).toBe(true);

    if (!outcome.valid) return;
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.diagnostics)).toBe(true);
    expect(Object.isFrozen(outcome.result.metadata)).toBe(true);
    expectKillSwitchesOff(outcome.result);
  });

  it("is deterministic for identical inputs", () => {
    const input = snapshot();
    const a = evaluateAdsFrequency(input);
    const b = evaluateAdsFrequency(input);
    expect(a).toEqual(b);
  });

  it("validateAdsFrequencyEvaluationResult fails closed on bad shapes", () => {
    const outcome = evaluateAdsFrequency(snapshot());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(
      validateAdsFrequencyEvaluationResult({
        ...outcome.result,
        frequencyEligible: true,
        rejectionReason: "daily_cap_exceeded",
      }).valid
    ).toBe(false);

    expect(
      validateAdsFrequencyEvaluationResult({
        ...outcome.result,
        productionEnabled: true,
      }).valid
    ).toBe(false);

    expect(
      validateAdsFrequencyEvaluationResult({
        ...outcome.result,
        unknown: 1,
      }).valid
    ).toBe(false);
  });
});
