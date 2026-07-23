import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_FRAUD_CLASSIFICATIONS,
  ADS_FRAUD_CONTRACT_VERSION,
  ADS_FRAUD_ELIGIBLE_TRUST_LEVEL,
  ADS_FRAUD_REJECTION_REASONS,
  evaluateAdsFraud,
  parseAdsFraudEvaluationInput,
  validateAdsFraudEvaluationInput,
  validateAdsFraudEvaluationResult,
  type AdsFraudEvaluationResult,
} from "./fraud";
import {
  ADS_INVALID_TRAFFIC_CONTRACT_VERSION,
  type AdsInvalidTrafficSnapshot,
} from "./invalidTraffic";

const SOURCE_PATH = path.join(__dirname, "fraud.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");
const INDEX_SOURCE = readFileSync(
  path.join(__dirname, "index.ts"),
  "utf8"
);

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

function expectKillSwitchesOff(result: AdsFraudEvaluationResult): void {
  expect(result.productionEnabled).toBe(false);
  expect(result.deliveryEnabled).toBe(false);
  expect(result.executionEnabled).toBe(false);
}

describe("Ads Fraud Foundation V1", () => {
  it("exposes contract version and shared rejection order with IVT", () => {
    expect(ADS_FRAUD_CONTRACT_VERSION).toBe("v1");
    expect(ADS_FRAUD_ELIGIBLE_TRUST_LEVEL).toBe("trusted");
    expect([...ADS_FRAUD_REJECTION_REASONS]).toEqual([
      "invalid_reporting_handle",
      "duplicate_event",
      "impossible_sequence",
      "suspicious_impression",
      "suspicious_click",
      "trust_not_eligible",
    ]);
    expect([...ADS_FRAUD_CLASSIFICATIONS]).toContain("clean");
    expect(SOURCE).toMatch(/fraudEligible means the event passes/);
    expect(INDEX_SOURCE).toMatch(/from "\.\/invalidTraffic"/);
    expect(INDEX_SOURCE).toMatch(/from "\.\/fraud"/);
  });

  it("has no AI/ML, live bot detection, persistence, or product imports", () => {
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\//);
    expect(SOURCE).not.toMatch(/from ["'][^"']*supabase[^"']*["']/i);
    expect(SOURCE).not.toMatch(/from ["'][^"']*redis[^"']*["']/i);
    expect(SOURCE).not.toMatch(
      /\b(tensorflow|openai|fingerprint|ipReputation|rateLimit|botDetection)\b/i
    );
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*\/(watch|discover|learning|store|world|messages|live)\//i
    );
    expect(SOURCE).not.toMatch(/from ["']\.\/(billing|charging|auction)\b/);
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/deliveryEnabled: false/);
    expect(SOURCE).toMatch(/executionEnabled: false/);
  });

  it("marks clean trusted impression fraudEligible with frozen outputs", () => {
    const outcome = evaluateAdsFraud(snapshot());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.fraudEligible).toBe(true);
    expect(outcome.result.fraudClassification).toBe("clean");
    expect(outcome.result.rejectionReason).toBeNull();
    expect(outcome.result.diagnostics.invalidTrafficEligible).toBe(true);
    expect(outcome.result.diagnostics.invalidTrafficClassification).toBe(
      "clean"
    );
    expect(outcome.result.diagnostics.activeSignalCount).toBe(0);
    expect(outcome.result.metadata.contractVersion).toBe(
      ADS_FRAUD_CONTRACT_VERSION
    );
    expect(outcome.result.metadata.invalidTrafficContractVersion).toBe(
      ADS_INVALID_TRAFFIC_CONTRACT_VERSION
    );
    expectKillSwitchesOff(outcome.result);
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.diagnostics)).toBe(true);
    expect(Object.isFrozen(outcome.result.metadata)).toBe(true);
    expect(validateAdsFraudEvaluationResult(outcome.result).valid).toBe(true);
  });

  it("accepts wrapped invalidTrafficSnapshot input and bare snapshot input", () => {
    const bare = evaluateAdsFraud(snapshot({ eventType: "click" }));
    const wrapped = evaluateAdsFraud({
      invalidTrafficSnapshot: snapshot({ eventType: "click" }),
    });
    expect(bare.valid).toBe(true);
    expect(wrapped.valid).toBe(true);
    if (!bare.valid || !wrapped.valid) return;
    expect(bare.result).toEqual(wrapped.result);
    expect(bare.result.eventType).toBe("click");
    expect(validateAdsFraudEvaluationInput(snapshot()).valid).toBe(true);
    expect(
      validateAdsFraudEvaluationInput({
        invalidTrafficSnapshot: snapshot(),
      }).valid
    ).toBe(true);
  });

  it("rejects IVT signals with matching fraudClassification and diagnostics", () => {
    const cases: Array<{
      overrides: Partial<AdsInvalidTrafficSnapshot>;
      reason: (typeof ADS_FRAUD_REJECTION_REASONS)[number];
      classification: (typeof ADS_FRAUD_CLASSIFICATIONS)[number];
      activeSignalCount: number;
    }> = [
      {
        overrides: { reportingHandleValid: false },
        reason: "invalid_reporting_handle",
        classification: "invalid_reporting_handle",
        activeSignalCount: 1,
      },
      {
        overrides: { duplicateEvent: true },
        reason: "duplicate_event",
        classification: "duplicate_event",
        activeSignalCount: 1,
      },
      {
        overrides: { impossibleSequence: true },
        reason: "impossible_sequence",
        classification: "impossible_sequence",
        activeSignalCount: 1,
      },
      {
        overrides: { suspiciousImpression: true },
        reason: "suspicious_impression",
        classification: "suspicious_impression",
        activeSignalCount: 1,
      },
      {
        overrides: { eventType: "click", suspiciousClick: true },
        reason: "suspicious_click",
        classification: "suspicious_click",
        activeSignalCount: 1,
      },
      {
        overrides: { trustLevel: "rejected" },
        reason: "trust_not_eligible",
        classification: "trust_rejected",
        activeSignalCount: 0,
      },
    ];

    for (const testCase of cases) {
      const outcome = evaluateAdsFraud(snapshot(testCase.overrides));
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;
      expect(outcome.result.fraudEligible).toBe(false);
      expect(outcome.result.rejectionReason).toBe(testCase.reason);
      expect(outcome.result.fraudClassification).toBe(testCase.classification);
      expect(outcome.result.diagnostics.invalidTrafficEligible).toBe(false);
      expect(outcome.result.diagnostics.invalidTrafficClassification).toBe(
        testCase.classification
      );
      expect(outcome.result.diagnostics.activeSignalCount).toBe(
        testCase.activeSignalCount
      );
      expectKillSwitchesOff(outcome.result);
    }
  });

  it("preserves first-match order when multiple signals are active", () => {
    const outcome = evaluateAdsFraud(
      snapshot({
        reportingHandleValid: false,
        duplicateEvent: true,
        impossibleSequence: true,
        suspiciousImpression: true,
        trustLevel: "untrusted",
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.fraudEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("invalid_reporting_handle");
    expect(outcome.result.fraudClassification).toBe("invalid_reporting_handle");
    expect(outcome.result.diagnostics.activeSignalCount).toBe(4);
  });

  it("fail-closes on unknown wrapper fields and invalid nested snapshots", () => {
    const unknownWrapper = parseAdsFraudEvaluationInput({
      invalidTrafficSnapshot: snapshot(),
      fraudEligible: true,
    });
    expect(unknownWrapper.valid).toBe(false);

    const badNested = parseAdsFraudEvaluationInput({
      invalidTrafficSnapshot: {
        ...snapshot(),
        suspiciousClick: true,
      },
    });
    expect(badNested.valid).toBe(false);

    expect(evaluateAdsFraud(null).valid).toBe(false);
    expect(validateAdsFraudEvaluationInput({}).valid).toBe(false);
  });

  it("does not mutate input and remains deterministic", () => {
    const input = {
      invalidTrafficSnapshot: {
        eventId: "evt-immut",
        candidateId: "cand-1",
        campaignId: "camp-1",
        eventType: "impression" as const,
        trustLevel: "trusted" as const,
        reportingHandleValid: true,
        duplicateEvent: true,
        impossibleSequence: false,
        suspiciousImpression: false,
        suspiciousClick: false,
      },
    };
    const before = structuredClone(input);
    const first = evaluateAdsFraud(input);
    const second = evaluateAdsFraud(structuredClone(before));
    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    expect(input).toEqual(before);
    expect(first).toEqual(second);
  });

  it("rejects injected fraudEligible on result validation", () => {
    const outcome = evaluateAdsFraud(snapshot());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    const tampered = {
      ...outcome.result,
      fraudEligible: true,
      fraudClassification: "duplicate_event",
      rejectionReason: null,
    };
    expect(validateAdsFraudEvaluationResult(tampered).valid).toBe(false);
  });

  it("fail-closes on non-boolean IVT signal flags in fraud input", () => {
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
        const base =
          field === "suspiciousClick"
            ? snapshot({ eventType: "click" })
            : snapshot();
        const bare = parseAdsFraudEvaluationInput({
          ...base,
          [field]: value,
        });
        expect(bare.valid).toBe(false);

        const wrapped = parseAdsFraudEvaluationInput({
          invalidTrafficSnapshot: {
            ...base,
            [field]: value,
          },
        });
        expect(wrapped.valid).toBe(false);
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
      expect(
        parseAdsFraudEvaluationInput({
          ...snapshot(),
          trustLevel,
        }).valid
      ).toBe(false);
      expect(
        parseAdsFraudEvaluationInput({
          invalidTrafficSnapshot: {
            ...snapshot(),
            trustLevel,
          },
        }).valid
      ).toBe(false);
    }

    const missing = { ...snapshot() } as Record<string, unknown>;
    delete missing.trustLevel;
    expect(parseAdsFraudEvaluationInput(missing).valid).toBe(false);
    expect(
      parseAdsFraudEvaluationInput({
        invalidTrafficSnapshot: missing,
      }).valid
    ).toBe(false);
  });

  it("rejects crafted fraud results with contradictory rejectionReason/fraudClassification pairs", () => {
    const cleanOutcome = evaluateAdsFraud(snapshot());
    expect(cleanOutcome.valid).toBe(true);
    if (!cleanOutcome.valid) return;
    const base = cleanOutcome.result;

    const crafted: Array<Record<string, unknown>> = [
      {
        ...base,
        fraudEligible: false,
        rejectionReason: "invalid_reporting_handle",
        fraudClassification: "clean",
        diagnostics: {
          ...base.diagnostics,
          invalidTrafficEligible: false,
          invalidTrafficClassification: "clean",
        },
      },
      {
        ...base,
        fraudEligible: false,
        rejectionReason: "duplicate_event",
        fraudClassification: "suspicious_click",
        diagnostics: {
          ...base.diagnostics,
          invalidTrafficEligible: false,
          invalidTrafficClassification: "suspicious_click",
          duplicateEvent: true,
        },
      },
      {
        ...base,
        fraudEligible: false,
        rejectionReason: "trust_not_eligible",
        fraudClassification: "invalid_reporting_handle",
        diagnostics: {
          ...base.diagnostics,
          invalidTrafficEligible: false,
          invalidTrafficClassification: "invalid_reporting_handle",
          trustEligible: false,
          trustLevel: "untrusted",
        },
      },
      {
        ...base,
        fraudEligible: true,
        rejectionReason: "duplicate_event",
        fraudClassification: "clean",
      },
      {
        ...base,
        fraudEligible: false,
        rejectionReason: null,
        fraudClassification: "clean",
      },
      {
        ...base,
        fraudEligible: false,
        rejectionReason: "impossible_sequence",
        fraudClassification: "clean",
        diagnostics: {
          ...base.diagnostics,
          invalidTrafficEligible: false,
          invalidTrafficClassification: "clean",
          impossibleSequence: true,
        },
      },
    ];

    for (const result of crafted) {
      expect(validateAdsFraudEvaluationResult(result).valid).toBe(false);
    }

    const rejected = evaluateAdsFraud(
      snapshot({ reportingHandleValid: false })
    );
    expect(rejected.valid).toBe(true);
    if (!rejected.valid) return;
    expect(validateAdsFraudEvaluationResult(rejected.result).valid).toBe(true);
  });
});
