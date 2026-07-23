import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";
import {
  ADS_INVALID_TRAFFIC_CLASSIFICATIONS,
  ADS_INVALID_TRAFFIC_CONTRACT_VERSION,
  ADS_INVALID_TRAFFIC_ELIGIBLE_TRUST_LEVEL,
  ADS_INVALID_TRAFFIC_REJECTION_REASONS,
  ADS_INVALID_TRAFFIC_SIGNAL_KINDS,
  ADS_INVALID_TRAFFIC_TRUST_LEVELS,
  classifyAdsInvalidTraffic,
  evaluateAdsInvalidTraffic,
  parseAdsInvalidTrafficSnapshot,
  resolveAdsInvalidTrafficRejectionReason,
  validateAdsInvalidTrafficEvaluationResult,
  validateAdsInvalidTrafficSnapshot,
  type AdsInvalidTrafficEvaluationResult,
  type AdsInvalidTrafficSnapshot,
} from "./invalidTraffic";

const SOURCE_PATH = path.join(__dirname, "invalidTraffic.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

function snapshot(
  overrides: Partial<AdsInvalidTrafficSnapshot> = {}
): AdsInvalidTrafficSnapshot {
  return Object.freeze({
    eventId: overrides.eventId ?? "evt-1",
    candidateId: overrides.candidateId ?? "cand-1",
    campaignId: overrides.campaignId ?? "camp-1",
    eventType: overrides.eventType ?? "impression",
    trustLevel: overrides.trustLevel ?? "trusted",
    reportingHandleValid: overrides.reportingHandleValid ?? true,
    duplicateEvent: overrides.duplicateEvent ?? false,
    impossibleSequence: overrides.impossibleSequence ?? false,
    suspiciousImpression: overrides.suspiciousImpression ?? false,
    suspiciousClick: overrides.suspiciousClick ?? false,
  });
}

function expectKillSwitchesOff(
  result: AdsInvalidTrafficEvaluationResult
): void {
  expect(result.productionEnabled).toBe(false);
  expect(result.deliveryEnabled).toBe(false);
  expect(result.executionEnabled).toBe(false);
}

describe("Ads Invalid Traffic Foundation V1", () => {
  it("exposes contract version and runtime-aligned rejection order", () => {
    expect(ADS_INVALID_TRAFFIC_CONTRACT_VERSION).toBe("v1");
    expect(ADS_INVALID_TRAFFIC_ELIGIBLE_TRUST_LEVEL).toBe("trusted");
    expect([...ADS_INVALID_TRAFFIC_REJECTION_REASONS]).toEqual([
      "invalid_reporting_handle",
      "duplicate_event",
      "impossible_sequence",
      "suspicious_impression",
      "suspicious_click",
      "trust_not_eligible",
    ]);
    expect([...ADS_INVALID_TRAFFIC_SIGNAL_KINDS]).toEqual([
      "suspicious_impression",
      "suspicious_click",
      "duplicate_event",
      "impossible_sequence",
      "invalid_reporting_handle",
    ]);
    expect([...ADS_INVALID_TRAFFIC_CLASSIFICATIONS]).toContain("clean");
    expect([...ADS_INVALID_TRAFFIC_TRUST_LEVELS]).toContain("trusted");
    expect(SOURCE).toMatch(/first-match evaluation order/);
  });

  it("has no AI/ML, persistence, fingerprinting, rate limits, or product imports", () => {
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\//);
    expect(SOURCE).not.toMatch(/from ["'][^"']*supabase[^"']*["']/i);
    expect(SOURCE).not.toMatch(/from ["'][^"']*redis[^"']*["']/i);
    expect(SOURCE).not.toMatch(
      /\b(tensorflow|openai|fingerprint|ipReputation|rateLimit)\b/i
    );
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*\/(watch|discover|learning|store|world|messages|live)\//i
    );
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/deliveryEnabled: false/);
    expect(SOURCE).toMatch(/executionEnabled: false/);
  });

  it("marks clean trusted impression as invalid-traffic eligible", () => {
    const outcome = evaluateAdsInvalidTraffic(snapshot());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.invalidTrafficEligible).toBe(true);
    expect(outcome.result.classification).toBe("clean");
    expect(outcome.result.rejectionReason).toBeNull();
    expect(outcome.result.diagnostics.activeSignalCount).toBe(0);
    expect(outcome.result.diagnostics.trustEligible).toBe(true);
    expect(outcome.result.diagnostics.classification).toBe("clean");
    expect(outcome.result.metadata.eligibleTrustLevel).toBe("trusted");
    expectKillSwitchesOff(outcome.result);
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.diagnostics)).toBe(true);
    expect(Object.isFrozen(outcome.result.metadata)).toBe(true);
    expect(
      validateAdsInvalidTrafficEvaluationResult(outcome.result).valid
    ).toBe(true);
  });

  it("marks clean trusted click as invalid-traffic eligible", () => {
    const outcome = evaluateAdsInvalidTraffic(
      snapshot({ eventType: "click", eventId: "evt-clk" })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.invalidTrafficEligible).toBe(true);
    expect(outcome.result.eventType).toBe("click");
    expect(outcome.result.classification).toBe("clean");
  });

  it("applies first-match rejection order across stacked signals", () => {
    const stacked = snapshot({
      reportingHandleValid: false,
      duplicateEvent: true,
      impossibleSequence: true,
      suspiciousImpression: true,
      trustLevel: "untrusted",
    });
    expect(resolveAdsInvalidTrafficRejectionReason(stacked)).toBe(
      "invalid_reporting_handle"
    );
    expect(classifyAdsInvalidTraffic("invalid_reporting_handle")).toBe(
      "invalid_reporting_handle"
    );

    const withoutHandle = snapshot({
      reportingHandleValid: true,
      duplicateEvent: true,
      impossibleSequence: true,
      suspiciousImpression: true,
    });
    expect(resolveAdsInvalidTrafficRejectionReason(withoutHandle)).toBe(
      "duplicate_event"
    );

    const sequenceOnly = snapshot({
      impossibleSequence: true,
      suspiciousImpression: true,
    });
    expect(resolveAdsInvalidTrafficRejectionReason(sequenceOnly)).toBe(
      "impossible_sequence"
    );

    const suspiciousImp = snapshot({ suspiciousImpression: true });
    expect(resolveAdsInvalidTrafficRejectionReason(suspiciousImp)).toBe(
      "suspicious_impression"
    );

    const suspiciousClk = snapshot({
      eventType: "click",
      suspiciousClick: true,
    });
    expect(resolveAdsInvalidTrafficRejectionReason(suspiciousClk)).toBe(
      "suspicious_click"
    );

    const trustOnly = snapshot({ trustLevel: "suspicious" });
    expect(resolveAdsInvalidTrafficRejectionReason(trustOnly)).toBe(
      "trust_not_eligible"
    );
    expect(classifyAdsInvalidTraffic("trust_not_eligible")).toBe(
      "trust_rejected"
    );
  });

  it("rejects each supported IVT signal with matching classification", () => {
    const cases: Array<{
      overrides: Partial<AdsInvalidTrafficSnapshot>;
      reason: (typeof ADS_INVALID_TRAFFIC_REJECTION_REASONS)[number];
      classification: (typeof ADS_INVALID_TRAFFIC_CLASSIFICATIONS)[number];
    }> = [
      {
        overrides: { reportingHandleValid: false },
        reason: "invalid_reporting_handle",
        classification: "invalid_reporting_handle",
      },
      {
        overrides: { duplicateEvent: true },
        reason: "duplicate_event",
        classification: "duplicate_event",
      },
      {
        overrides: { impossibleSequence: true },
        reason: "impossible_sequence",
        classification: "impossible_sequence",
      },
      {
        overrides: { suspiciousImpression: true },
        reason: "suspicious_impression",
        classification: "suspicious_impression",
      },
      {
        overrides: { eventType: "click", suspiciousClick: true },
        reason: "suspicious_click",
        classification: "suspicious_click",
      },
      {
        overrides: { trustLevel: "unverified" },
        reason: "trust_not_eligible",
        classification: "trust_rejected",
      },
    ];

    for (const testCase of cases) {
      const outcome = evaluateAdsInvalidTraffic(snapshot(testCase.overrides));
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;
      expect(outcome.result.invalidTrafficEligible).toBe(false);
      expect(outcome.result.rejectionReason).toBe(testCase.reason);
      expect(outcome.result.classification).toBe(testCase.classification);
      expectKillSwitchesOff(outcome.result);
    }
  });

  it("fail-closes on unknown fields, bad ids, and event-type signal mismatch", () => {
    expect(
      parseAdsInvalidTrafficSnapshot({
        ...snapshot(),
        fraudEligible: true,
      }).valid
    ).toBe(false);

    expect(
      parseAdsInvalidTrafficSnapshot({
        ...snapshot(),
        eventId: "x".repeat(ADS_DELIVERY_MAX_ID_LENGTH + 1),
      }).valid
    ).toBe(false);

    const impressionWithClickSignal = parseAdsInvalidTrafficSnapshot(
      snapshot({ suspiciousClick: true })
    );
    expect(impressionWithClickSignal.valid).toBe(false);
    if (impressionWithClickSignal.valid) return;
    expect(
      impressionWithClickSignal.issues.some((issue) =>
        issue.includes('suspiciousClick must be false when eventType is "impression"')
      )
    ).toBe(true);

    const clickWithImpressionSignal = parseAdsInvalidTrafficSnapshot(
      snapshot({
        eventType: "click",
        suspiciousImpression: true,
      })
    );
    expect(clickWithImpressionSignal.valid).toBe(false);

    expect(validateAdsInvalidTrafficSnapshot(snapshot()).valid).toBe(true);
    expect(validateAdsInvalidTrafficSnapshot(null).valid).toBe(false);
  });

  it("does not mutate input snapshots", () => {
    const input = {
      eventId: "evt-immut",
      candidateId: "cand-1",
      campaignId: "camp-1",
      eventType: "impression" as const,
      trustLevel: "trusted" as const,
      reportingHandleValid: true,
      duplicateEvent: false,
      impossibleSequence: false,
      suspiciousImpression: false,
      suspiciousClick: false,
    };
    const before = structuredClone(input);
    const outcome = evaluateAdsInvalidTraffic(input);
    expect(outcome.valid).toBe(true);
    expect(input).toEqual(before);
  });

  it("is deterministic for identical inputs", () => {
    const first = evaluateAdsInvalidTraffic(
      snapshot({ duplicateEvent: true, trustLevel: "provisional" })
    );
    const second = evaluateAdsInvalidTraffic(
      snapshot({ duplicateEvent: true, trustLevel: "provisional" })
    );
    expect(first).toEqual(second);
  });

  it("fail-closes on non-boolean IVT signal flags", () => {
    const fields = [
      "suspiciousImpression",
      "suspiciousClick",
      "duplicateEvent",
      "impossibleSequence",
      "reportingHandleValid",
    ] as const;
    const invalidValues: unknown[] = ["true", 1, null, {}, []];

    for (const field of fields) {
      for (const value of invalidValues) {
        // suspiciousClick must stay false for impression fixtures unless
        // testing that field; use click event when mutating suspiciousClick.
        const base =
          field === "suspiciousClick"
            ? snapshot({ eventType: "click" })
            : snapshot();
        const parsed = parseAdsInvalidTrafficSnapshot({
          ...base,
          [field]: value,
        });
        expect(parsed.valid).toBe(false);
        if (parsed.valid) return;
        expect(
          parsed.issues.some((issue) => issue.includes(`${field} must be a boolean`))
        ).toBe(true);
      }
    }
  });

  it("fail-closes on unknown, malformed, missing, and non-canonical trust levels", () => {
    const cases: unknown[] = [
      "admin",
      "Trusted",
      "TRUSTED",
      "Untrusted",
      "",
      null,
      0,
      1,
      {},
      [],
    ];

    for (const trustLevel of cases) {
      const parsed = parseAdsInvalidTrafficSnapshot({
        ...snapshot(),
        trustLevel,
      });
      expect(parsed.valid).toBe(false);
    }

    const missing = { ...snapshot() } as Record<string, unknown>;
    delete missing.trustLevel;
    expect(parseAdsInvalidTrafficSnapshot(missing).valid).toBe(false);
    expect(validateAdsInvalidTrafficSnapshot(missing).valid).toBe(false);
  });

  it("rejects crafted IVT results with contradictory rejectionReason/classification pairs", () => {
    const cleanOutcome = evaluateAdsInvalidTraffic(snapshot());
    expect(cleanOutcome.valid).toBe(true);
    if (!cleanOutcome.valid) return;
    const base = cleanOutcome.result;

    const crafted: Array<Record<string, unknown>> = [
      {
        ...base,
        invalidTrafficEligible: false,
        rejectionReason: "invalid_reporting_handle",
        classification: "clean",
        diagnostics: {
          ...base.diagnostics,
          classification: "clean",
        },
      },
      {
        ...base,
        invalidTrafficEligible: false,
        rejectionReason: "duplicate_event",
        classification: "suspicious_click",
        diagnostics: {
          ...base.diagnostics,
          classification: "suspicious_click",
          duplicateEvent: true,
        },
      },
      {
        ...base,
        invalidTrafficEligible: false,
        rejectionReason: "trust_not_eligible",
        classification: "invalid_reporting_handle",
        diagnostics: {
          ...base.diagnostics,
          classification: "invalid_reporting_handle",
          trustEligible: false,
          trustLevel: "untrusted",
        },
      },
      {
        ...base,
        invalidTrafficEligible: true,
        rejectionReason: "duplicate_event",
        classification: "clean",
      },
      {
        ...base,
        invalidTrafficEligible: false,
        rejectionReason: null,
        classification: "clean",
      },
      {
        ...base,
        invalidTrafficEligible: false,
        rejectionReason: "impossible_sequence",
        classification: "clean",
        diagnostics: {
          ...base.diagnostics,
          classification: "clean",
          impossibleSequence: true,
        },
      },
    ];

    for (const result of crafted) {
      expect(validateAdsInvalidTrafficEvaluationResult(result).valid).toBe(
        false
      );
    }

    // Canonical paired rejects still validate.
    const rejected = evaluateAdsInvalidTraffic(
      snapshot({ reportingHandleValid: false })
    );
    expect(rejected.valid).toBe(true);
    if (!rejected.valid) return;
    expect(
      validateAdsInvalidTrafficEvaluationResult(rejected.result).valid
    ).toBe(true);
  });
});
