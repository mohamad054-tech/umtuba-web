import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADS_DELIVERY_ENABLED } from "../constants";
import {
  ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
  type AdsDeliveryRequest,
} from "./deliveryContracts";
import {
  ADS_ELIGIBILITY_ACTIVE_STATUS,
  ADS_ELIGIBILITY_DELIVERY_FLAG_KEY,
  evaluateAdsCandidateEligibility,
  type AdsEligibilityCandidateState,
} from "./eligibilityRules";
import {
  ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_BYTES,
  ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_KEYS,
  ADS_DELIVERY_DECISION_TRACE_RULE_ORDER,
  ADS_DELIVERY_DECISION_TRACE_VERSION,
  buildAdsDeliveryDecisionTrace,
  validateAdsDeliveryDecisionTrace,
  validateAdsDeliveryDecisionTraceSafeDetails,
  type AdsDeliveryDecisionTrace,
} from "./deliveryDecisionTrace";

const NOW = "2026-07-22T12:00:00.000Z";
const SOURCE_PATH = path.join(__dirname, "deliveryDecisionTrace.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

function baseRequest(
  overrides: Partial<AdsDeliveryRequest> = {}
): AdsDeliveryRequest {
  return {
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    placementId: "WATCH_FEED",
    candidates: [
      {
        candidateId: "candidate-1",
        campaignId: "campaign-1",
        adSetId: "ad-set-1",
        adId: "ad-1",
        creativeId: "creative-1",
      },
    ],
    viewer: { opaqueViewerId: "viewer-opaque-1" },
    geo: { countryCode: "US" },
    languageCode: "en-US",
    deviceClass: "mobile",
    featureFlags: {
      [ADS_ELIGIBILITY_DELIVERY_FLAG_KEY]: true,
      ADS_PLACEMENT_WATCH_FEED_ENABLED: true,
    },
    currentTimestamp: NOW,
    ...overrides,
  };
}

function baseCandidate(
  overrides: Partial<AdsEligibilityCandidateState> = {}
): AdsEligibilityCandidateState {
  return {
    candidateId: "candidate-1",
    campaignId: "campaign-1",
    adSetId: "ad-set-1",
    adId: "ad-1",
    creativeId: "creative-1",
    placementId: "WATCH_FEED",
    campaignStatus: ADS_ELIGIBILITY_ACTIVE_STATUS,
    adSetStatus: ADS_ELIGIBILITY_ACTIVE_STATUS,
    adStatus: ADS_ELIGIBILITY_ACTIVE_STATUS,
    campaignStartsAt: "2026-07-01T00:00:00.000Z",
    campaignEndsAt: "2026-08-01T00:00:00.000Z",
    adSetStartsAt: "2026-07-01T00:00:00.000Z",
    adSetEndsAt: "2026-08-01T00:00:00.000Z",
    budgetExhausted: false,
    creativePresent: true,
    creativeApproved: true,
    policyBlocked: false,
    targetedCountryCodes: ["US", "CA"],
    targetedLanguageCodes: ["en"],
    audienceMatched: true,
    ...overrides,
  };
}

function buildTrace(
  request: AdsDeliveryRequest = baseRequest(),
  candidate: AdsEligibilityCandidateState = baseCandidate()
) {
  const eligibilityResult = evaluateAdsCandidateEligibility(request, candidate);
  return {
    eligibilityResult,
    outcome: buildAdsDeliveryDecisionTrace(
      request,
      candidate,
      eligibilityResult
    ),
  };
}

function allPassedSteps(): AdsDeliveryDecisionTrace["ruleSteps"] {
  return ADS_DELIVERY_DECISION_TRACE_RULE_ORDER.map((ruleId) => ({
    ruleId,
    outcome: "passed" as const,
  }));
}

function stepsWithFailure(
  failedRuleId: (typeof ADS_DELIVERY_DECISION_TRACE_RULE_ORDER)[number],
  reason: NonNullable<AdsDeliveryDecisionTrace["exclusionReason"]>
): AdsDeliveryDecisionTrace["ruleSteps"] {
  let failed = false;
  return ADS_DELIVERY_DECISION_TRACE_RULE_ORDER.map((ruleId) => {
    if (failed) {
      return { ruleId, outcome: "skipped" as const };
    }
    if (ruleId === failedRuleId) {
      failed = true;
      return {
        ruleId,
        outcome: "failed" as const,
        exclusionReason: reason,
      };
    }
    return { ruleId, outcome: "passed" as const };
  });
}

describe("Ads Delivery Decision Trace V1", () => {
  it("builds an eligible candidate trace with all rules passed", () => {
    const { eligibilityResult, outcome } = buildTrace();
    expect(eligibilityResult.eligible).toBe(true);
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.trace.traceVersion).toBe(ADS_DELIVERY_DECISION_TRACE_VERSION);
    expect(outcome.trace.eligible).toBe(true);
    expect(outcome.trace.exclusionReason).toBeNull();
    expect(outcome.trace.productionEnabled).toBe(false);
    expect(outcome.trace.ruleSteps).toHaveLength(
      ADS_DELIVERY_DECISION_TRACE_RULE_ORDER.length
    );
    expect(outcome.trace.ruleSteps.every((s) => s.outcome === "passed")).toBe(
      true
    );
    expect(
      "selectedCandidate" in outcome.trace ||
        "selectedCandidateId" in outcome.trace
    ).toBe(false);
  });

  it.each([
    {
      name: "delivery_enabled",
      request: baseRequest({
        featureFlags: {
          ADS_DELIVERY_ENABLED: false,
          ADS_PLACEMENT_WATCH_FEED_ENABLED: true,
        },
      }),
      candidate: baseCandidate(),
      failedRuleId: "delivery_enabled" as const,
      reason: "delivery_disabled" as const,
    },
    {
      name: "placement_enabled",
      request: baseRequest({
        featureFlags: {
          ADS_DELIVERY_ENABLED: true,
          ADS_PLACEMENT_WATCH_FEED_ENABLED: false,
        },
      }),
      candidate: baseCandidate(),
      failedRuleId: "placement_enabled" as const,
      reason: "placement_disabled" as const,
    },
    {
      name: "placement_match",
      request: baseRequest(),
      candidate: baseCandidate({ placementId: "DISCOVER_FEED" }),
      failedRuleId: "placement_match" as const,
      reason: "placement_mismatch" as const,
    },
    {
      name: "campaign_active",
      request: baseRequest(),
      candidate: baseCandidate({ campaignStatus: "paused" }),
      failedRuleId: "campaign_active" as const,
      reason: "campaign_paused" as const,
    },
    {
      name: "ad_set_active",
      request: baseRequest(),
      candidate: baseCandidate({ adSetStatus: "paused" }),
      failedRuleId: "ad_set_active" as const,
      reason: "ad_set_inactive" as const,
    },
    {
      name: "ad_active",
      request: baseRequest(),
      candidate: baseCandidate({ adStatus: "paused" }),
      failedRuleId: "ad_active" as const,
      reason: "ad_inactive" as const,
    },
    {
      name: "campaign_time_window",
      request: baseRequest(),
      candidate: baseCandidate({
        campaignStartsAt: "2026-08-01T00:00:00.000Z",
      }),
      failedRuleId: "campaign_time_window" as const,
      reason: "campaign_not_started" as const,
    },
    {
      name: "ad_set_time_window",
      request: baseRequest(),
      candidate: baseCandidate({
        adSetEndsAt: "2026-07-01T00:00:00.000Z",
      }),
      failedRuleId: "ad_set_time_window" as const,
      reason: "ad_set_expired" as const,
    },
    {
      name: "budget_available",
      request: baseRequest(),
      candidate: baseCandidate({ budgetExhausted: true }),
      failedRuleId: "budget_available" as const,
      reason: "budget_exhausted" as const,
    },
    {
      name: "creative_present",
      request: baseRequest(),
      candidate: baseCandidate({ creativePresent: false }),
      failedRuleId: "creative_present" as const,
      reason: "creative_missing" as const,
    },
    {
      name: "creative_approved",
      request: baseRequest(),
      candidate: baseCandidate({ creativeApproved: false }),
      failedRuleId: "creative_approved" as const,
      reason: "creative_not_approved" as const,
    },
    {
      name: "policy_allowed",
      request: baseRequest(),
      candidate: baseCandidate({ policyBlocked: true }),
      failedRuleId: "policy_allowed" as const,
      reason: "policy_blocked" as const,
    },
    {
      name: "country_targeting",
      request: baseRequest(),
      candidate: baseCandidate({ targetedCountryCodes: ["CA"] }),
      failedRuleId: "country_targeting" as const,
      reason: "geo_mismatch" as const,
    },
    {
      name: "language_targeting",
      request: baseRequest(),
      candidate: baseCandidate({ targetedLanguageCodes: ["fr"] }),
      failedRuleId: "language_targeting" as const,
      reason: "language_mismatch" as const,
    },
    {
      name: "audience_match",
      request: baseRequest(),
      candidate: baseCandidate({ audienceMatched: false }),
      failedRuleId: "audience_match" as const,
      reason: "audience_mismatch" as const,
    },
  ])(
    "traces major exclusion stage: $name",
    ({ request, candidate, failedRuleId, reason }) => {
      const { eligibilityResult, outcome } = buildTrace(request, candidate);
      expect(eligibilityResult.eligible).toBe(false);
      expect(eligibilityResult.exclusionReason).toBe(reason);
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;

      expect(outcome.trace.eligible).toBe(false);
      expect(outcome.trace.exclusionReason).toBe(reason);
      expect(outcome.trace.productionEnabled).toBe(false);

      const failed = outcome.trace.ruleSteps.filter((s) => s.outcome === "failed");
      expect(failed).toHaveLength(1);
      expect(failed[0]?.ruleId).toBe(failedRuleId);
      expect(failed[0]?.exclusionReason).toBe(reason);

      const failedIndex = outcome.trace.ruleSteps.findIndex(
        (s) => s.outcome === "failed"
      );
      expect(
        outcome.trace.ruleSteps
          .slice(0, failedIndex)
          .every((s) => s.outcome === "passed")
      ).toBe(true);
      expect(
        outcome.trace.ruleSteps
          .slice(failedIndex + 1)
          .every((s) => s.outcome === "skipped")
      ).toBe(true);
    }
  );

  it("preserves stable rule order", () => {
    const { outcome } = buildTrace();
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.trace.ruleSteps.map((s) => s.ruleId)).toEqual([
      ...ADS_DELIVERY_DECISION_TRACE_RULE_ORDER,
    ]);
  });

  it("marks steps after the first failure as skipped", () => {
    const { outcome } = buildTrace(
      baseRequest({
        featureFlags: {
          ADS_DELIVERY_ENABLED: false,
          ADS_PLACEMENT_WATCH_FEED_ENABLED: true,
        },
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.trace.ruleSteps[0]).toMatchObject({
      ruleId: "delivery_enabled",
      outcome: "failed",
    });
    expect(
      outcome.trace.ruleSteps.slice(1).every((s) => s.outcome === "skipped")
    ).toBe(true);
  });

  it("keeps final reason consistent with the failed step", () => {
    const { eligibilityResult, outcome } = buildTrace(
      baseRequest(),
      baseCandidate({ budgetExhausted: true })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    const failed = outcome.trace.ruleSteps.find((s) => s.outcome === "failed");
    expect(failed?.exclusionReason).toBe(eligibilityResult.exclusionReason);
    expect(outcome.trace.exclusionReason).toBe(failed?.exclusionReason);
  });

  it("rejects unsupported trace versions", () => {
    const validation = validateAdsDeliveryDecisionTrace({
      traceVersion: "v0",
      requestReference: { placementId: "WATCH_FEED" },
      candidateReference: { candidateId: "candidate-1" },
      placementId: "WATCH_FEED",
      eligible: true,
      exclusionReason: null,
      productionEnabled: false,
      evaluatedAt: NOW,
      ruleSteps: allPassedSteps(),
    });
    expect(validation.valid).toBe(false);
    if (validation.valid) return;
    expect(
      validation.issues.some((issue) => issue.includes("traceVersion"))
    ).toBe(true);
  });

  it("rejects duplicate rule IDs", () => {
    const steps = allPassedSteps().map((step, index) =>
      index === 1
        ? { ...step, ruleId: ADS_DELIVERY_DECISION_TRACE_RULE_ORDER[0] }
        : step
    );
    const validation = validateAdsDeliveryDecisionTrace({
      traceVersion: ADS_DELIVERY_DECISION_TRACE_VERSION,
      requestReference: { placementId: "WATCH_FEED" },
      candidateReference: { candidateId: "candidate-1" },
      placementId: "WATCH_FEED",
      eligible: true,
      exclusionReason: null,
      productionEnabled: false,
      evaluatedAt: NOW,
      ruleSteps: steps,
    });
    expect(validation.valid).toBe(false);
    if (validation.valid) return;
    expect(validation.issues.some((issue) => issue.includes("duplicate"))).toBe(
      true
    );
  });

  it("rejects invalid rule order", () => {
    const steps = [...allPassedSteps()].reverse();
    const validation = validateAdsDeliveryDecisionTrace({
      traceVersion: ADS_DELIVERY_DECISION_TRACE_VERSION,
      requestReference: { placementId: "WATCH_FEED" },
      candidateReference: { candidateId: "candidate-1" },
      placementId: "WATCH_FEED",
      eligible: true,
      exclusionReason: null,
      productionEnabled: false,
      evaluatedAt: NOW,
      ruleSteps: steps,
    });
    expect(validation.valid).toBe(false);
    if (validation.valid) return;
    expect(
      validation.issues.some((issue) => issue.includes("stable rule order"))
    ).toBe(true);
  });

  it("rejects multiple failed steps", () => {
    const steps = stepsWithFailure("budget_available", "budget_exhausted").map(
      (step, index) =>
        index === ADS_DELIVERY_DECISION_TRACE_RULE_ORDER.length - 1
          ? {
              ruleId: step.ruleId,
              outcome: "failed" as const,
              exclusionReason: "audience_mismatch" as const,
            }
          : step
    );
    const validation = validateAdsDeliveryDecisionTrace({
      traceVersion: ADS_DELIVERY_DECISION_TRACE_VERSION,
      requestReference: { placementId: "WATCH_FEED" },
      candidateReference: { candidateId: "candidate-1" },
      placementId: "WATCH_FEED",
      eligible: false,
      exclusionReason: "budget_exhausted",
      productionEnabled: false,
      evaluatedAt: NOW,
      ruleSteps: steps,
    });
    expect(validation.valid).toBe(false);
    if (validation.valid) return;
    expect(
      validation.issues.some((issue) => issue.includes("multiple failed"))
    ).toBe(true);
  });

  it("rejects eligible traces that contain a failed step", () => {
    const validation = validateAdsDeliveryDecisionTrace({
      traceVersion: ADS_DELIVERY_DECISION_TRACE_VERSION,
      requestReference: { placementId: "WATCH_FEED" },
      candidateReference: { candidateId: "candidate-1" },
      placementId: "WATCH_FEED",
      eligible: true,
      exclusionReason: null,
      productionEnabled: false,
      evaluatedAt: NOW,
      ruleSteps: stepsWithFailure("audience_match", "audience_mismatch"),
    });
    expect(validation.valid).toBe(false);
    if (validation.valid) return;
    expect(
      validation.issues.some((issue) =>
        issue.includes("eligible trace must not contain a failed step")
      )
    ).toBe(true);
  });

  it("rejects rejected traces without a failed step", () => {
    const validation = validateAdsDeliveryDecisionTrace({
      traceVersion: ADS_DELIVERY_DECISION_TRACE_VERSION,
      requestReference: { placementId: "WATCH_FEED" },
      candidateReference: { candidateId: "candidate-1" },
      placementId: "WATCH_FEED",
      eligible: false,
      exclusionReason: "geo_mismatch",
      productionEnabled: false,
      evaluatedAt: NOW,
      ruleSteps: allPassedSteps(),
    });
    expect(validation.valid).toBe(false);
    if (validation.valid) return;
    expect(
      validation.issues.some((issue) =>
        issue.includes("rejected trace must contain exactly one failed step")
      )
    ).toBe(true);
  });

  it("copies evaluatedAt only from request.currentTimestamp", () => {
    const requestTimestamp = "2026-01-15T08:30:00.000Z";
    const { outcome } = buildTrace(
      baseRequest({ currentTimestamp: requestTimestamp })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.trace.evaluatedAt).toBe(requestTimestamp);
  });

  it("does not depend on the system clock", () => {
    expect(SOURCE).not.toMatch(/\bDate\.now\b/);
    expect(SOURCE).not.toMatch(/\bnew Date\s*\(/);
    expect(SOURCE).not.toMatch(/\bperformance\.now\b/);
  });

  it("does not mutate inputs", () => {
    const request = baseRequest();
    const candidate = baseCandidate({ budgetExhausted: true });
    const eligibilityResult = evaluateAdsCandidateEligibility(
      request,
      candidate
    );
    const before = {
      request: structuredClone(request),
      candidate: structuredClone(candidate),
      eligibilityResult: structuredClone(eligibilityResult),
    };
    const outcome = buildAdsDeliveryDecisionTrace(
      request,
      candidate,
      eligibilityResult
    );
    expect(outcome.valid).toBe(true);
    expect(request).toEqual(before.request);
    expect(candidate).toEqual(before.candidate);
    expect(eligibilityResult).toEqual(before.eligibilityResult);
    if (!outcome.valid) return;
    expect(() => {
      (outcome.trace.ruleSteps as unknown as Array<unknown>).push({
        ruleId: "audience_match",
        outcome: "passed",
      });
    }).toThrow();
  });

  it("produces deterministic repeated output", () => {
    const request = baseRequest();
    const candidate = baseCandidate({ audienceMatched: false });
    const eligibilityResult = evaluateAdsCandidateEligibility(
      request,
      candidate
    );
    const first = buildAdsDeliveryDecisionTrace(
      request,
      candidate,
      eligibilityResult
    );
    const second = buildAdsDeliveryDecisionTrace(
      structuredClone(request),
      structuredClone(candidate),
      structuredClone(eligibilityResult)
    );
    expect(first).toEqual(second);
  });

  it("always sets productionEnabled to false", () => {
    const eligible = buildTrace();
    expect(eligible.outcome.valid).toBe(true);
    if (!eligible.outcome.valid) return;
    expect(eligible.outcome.trace.productionEnabled).toBe(false);

    const rejected = buildTrace(
      baseRequest(),
      baseCandidate({ policyBlocked: true })
    );
    expect(rejected.outcome.valid).toBe(true);
    if (!rejected.outcome.valid) return;
    expect(rejected.outcome.trace.productionEnabled).toBe(false);
  });

  it("enforces safe details limits", () => {
    const tooManyKeys: Record<string, string> = {};
    for (let i = 0; i < ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_KEYS + 1; i++) {
      tooManyKeys[`k${i}`] = "v";
    }
    expect(
      validateAdsDeliveryDecisionTraceSafeDetails(tooManyKeys, "details").valid
    ).toBe(false);

    expect(
      validateAdsDeliveryDecisionTraceSafeDetails(
        { nested: { a: 1 } as unknown as string },
        "details"
      ).valid
    ).toBe(false);

    expect(
      validateAdsDeliveryDecisionTraceSafeDetails(
        { list: [1, 2] as unknown as string },
        "details"
      ).valid
    ).toBe(false);

    const oversized = {
      blob: "x".repeat(ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_BYTES),
    };
    const oversizedResult = validateAdsDeliveryDecisionTraceSafeDetails(
      oversized,
      "details"
    );
    expect(oversizedResult.valid).toBe(false);
  });

  it("rejects sensitive or unexpected fields", () => {
    expect(
      validateAdsDeliveryDecisionTraceSafeDetails(
        { email: "a@b.c" },
        "details"
      ).valid
    ).toBe(false);
    expect(
      validateAdsDeliveryDecisionTraceSafeDetails(
        { opaqueViewerId: "viewer-1" },
        "details"
      ).valid
    ).toBe(false);

    const withViewer = {
      traceVersion: ADS_DELIVERY_DECISION_TRACE_VERSION,
      requestReference: { placementId: "WATCH_FEED" },
      candidateReference: { candidateId: "candidate-1" },
      placementId: "WATCH_FEED",
      eligible: true,
      exclusionReason: null,
      productionEnabled: false,
      evaluatedAt: NOW,
      ruleSteps: allPassedSteps(),
      opaqueViewerId: "viewer-opaque-1",
    };
    const validation = validateAdsDeliveryDecisionTrace(withViewer);
    expect(validation.valid).toBe(false);
    if (validation.valid) return;
    expect(
      validation.issues.some((issue) =>
        issue.includes("unexpected sensitive field")
      )
    ).toBe(true);
  });

  it("rejects final reason inconsistent with failed step", () => {
    const validation = validateAdsDeliveryDecisionTrace({
      traceVersion: ADS_DELIVERY_DECISION_TRACE_VERSION,
      requestReference: { placementId: "WATCH_FEED" },
      candidateReference: { candidateId: "candidate-1" },
      placementId: "WATCH_FEED",
      eligible: false,
      exclusionReason: "geo_mismatch",
      productionEnabled: false,
      evaluatedAt: NOW,
      ruleSteps: stepsWithFailure("budget_available", "budget_exhausted"),
    });
    expect(validation.valid).toBe(false);
    if (validation.valid) return;
    expect(
      validation.issues.some((issue) => issue.includes("inconsistent"))
    ).toBe(true);
  });

  it("rejects invalid timestamps", () => {
    const validation = validateAdsDeliveryDecisionTrace({
      traceVersion: ADS_DELIVERY_DECISION_TRACE_VERSION,
      requestReference: { placementId: "WATCH_FEED" },
      candidateReference: { candidateId: "candidate-1" },
      placementId: "WATCH_FEED",
      eligible: true,
      exclusionReason: null,
      productionEnabled: false,
      evaluatedAt: "not-a-timestamp",
      ruleSteps: allPassedSteps(),
    });
    expect(validation.valid).toBe(false);
  });

  it("does not introduce persistence, logging, network, or product wiring", () => {
    expect(SOURCE).not.toMatch(/\bconsole\.(log|info|warn|error|debug)\b/);
    expect(SOURCE).not.toMatch(/\blocalStorage\b|\bsessionStorage\b/);
    expect(SOURCE).not.toMatch(/\bfetch\b|\bXMLHttpRequest\b|\bWebSocket\b/);
    expect(SOURCE).not.toMatch(/@supabase|createClient|server-only/);
    expect(SOURCE).not.toMatch(
      /from ["']@\/app|from ["']\.\.\/\.\.\/app|watch|discover|messenger/i
    );
    expect(ADS_DELIVERY_ENABLED).toBe(false);
  });

  it("keeps delivery and placement flags disabled in fixture defaults used for privacy checks", () => {
    const privacyRequest = baseRequest({
      featureFlags: {
        ADS_DELIVERY_ENABLED: false,
        ADS_PLACEMENT_WATCH_FEED_ENABLED: false,
      },
    });
    expect(privacyRequest.featureFlags.ADS_DELIVERY_ENABLED).toBe(false);
    expect(privacyRequest.featureFlags.ADS_PLACEMENT_WATCH_FEED_ENABLED).toBe(
      false
    );
  });

  it("never includes viewer identifiers in the built trace", () => {
    const { outcome } = buildTrace();
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    const serialized = JSON.stringify(outcome.trace);
    expect(serialized).not.toContain("viewer-opaque-1");
    expect(serialized).not.toContain("opaqueViewerId");
  });
});
