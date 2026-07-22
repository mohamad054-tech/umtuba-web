import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADS_DELIVERY_ENABLED } from "../constants";
import {
  ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
  createEmptyInventory,
  type AdsCandidateMetadata,
} from "./candidateInventory";
import {
  ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
  type AdsDeliveryRequest,
} from "./deliveryContracts";
import {
  ADS_ELIGIBILITY_ACTIVE_STATUS,
  ADS_ELIGIBILITY_DELIVERY_FLAG_KEY,
  type AdsEligibilityCandidateState,
} from "./eligibilityRules";
import {
  ADS_EXECUTION_LAYER_ALLOWED_FIELDS,
  ADS_EXECUTION_LAYER_CONTRACT_VERSION,
  ADS_EXECUTION_RESULT_ALLOWED_FIELDS,
  createEmptyAdsExecutionResult,
  runAdsExecutionLayer,
  validateAdsExecutionResult,
} from "./executionLayer";
import { ADS_PLACEMENT_REGISTRY } from "./placementRegistry";

const SOURCE_PATH = path.join(__dirname, "executionLayer.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

const NOW = "2026-07-22T12:00:00.000Z";
const GENERATED_AT = "2026-07-22T11:00:00.000Z";

function inventoryCandidate(
  overrides: Partial<AdsCandidateMetadata> &
    Pick<AdsCandidateMetadata, "candidateId"> & {
      campaignRef?: string;
      adSetRef?: string;
      adRef?: string;
      creativeRef?: string;
    }
): Record<string, unknown> {
  const id = overrides.candidateId;
  return {
    candidateId: id,
    campaignRef: overrides.campaignRef ?? `campaign-ref-${id}`,
    adSetRef: overrides.adSetRef ?? `ad-set-ref-${id}`,
    adRef: overrides.adRef ?? `ad-ref-${id}`,
    creativeRef: overrides.creativeRef ?? `creative-ref-${id}`,
    placement: overrides.placement ?? "WATCH_FEED",
    creativeType: overrides.creativeType ?? "video",
    eligibilitySnapshot: overrides.eligibilitySnapshot ?? {
      snapshotRef: `eligibility-snapshot-${id}`,
      revision: 1,
    },
    inventorySource: overrides.inventorySource ?? "catalog",
    revision: overrides.revision ?? 1,
    timestamps: overrides.timestamps ?? {
      createdAt: "2026-07-22T10:00:00.000Z",
      updatedAt: "2026-07-22T10:30:00.000Z",
    },
  };
}

function baseInventory(
  candidates: Record<string, unknown>[] = [inventoryCandidate({ candidateId: "candidate-1" })]
): Record<string, unknown> {
  return {
    contractVersion: ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
    inventoryId: "inventory-1",
    revision: 1,
    generatedAt: GENERATED_AT,
    candidates,
  };
}

function eligibilityState(
  overrides: Partial<AdsEligibilityCandidateState> & { candidateId: string }
): AdsEligibilityCandidateState {
  const id = overrides.candidateId;
  return {
    candidateId: id,
    campaignId: overrides.campaignId ?? `campaign-${id}`,
    adSetId: overrides.adSetId ?? `ad-set-${id}`,
    adId: overrides.adId ?? `ad-${id}`,
    creativeId: overrides.creativeId ?? `creative-${id}`,
    placementId: overrides.placementId ?? "WATCH_FEED",
    campaignStatus: overrides.campaignStatus ?? ADS_ELIGIBILITY_ACTIVE_STATUS,
    adSetStatus: overrides.adSetStatus ?? ADS_ELIGIBILITY_ACTIVE_STATUS,
    adStatus: overrides.adStatus ?? ADS_ELIGIBILITY_ACTIVE_STATUS,
    campaignStartsAt: overrides.campaignStartsAt ?? "2026-07-01T00:00:00.000Z",
    campaignEndsAt:
      overrides.campaignEndsAt === undefined
        ? "2026-08-01T00:00:00.000Z"
        : overrides.campaignEndsAt,
    adSetStartsAt: overrides.adSetStartsAt ?? "2026-07-01T00:00:00.000Z",
    adSetEndsAt:
      overrides.adSetEndsAt === undefined
        ? "2026-08-01T00:00:00.000Z"
        : overrides.adSetEndsAt,
    budgetExhausted: overrides.budgetExhausted ?? false,
    creativePresent: overrides.creativePresent ?? true,
    creativeApproved: overrides.creativeApproved ?? true,
    policyBlocked: overrides.policyBlocked ?? false,
    targetedCountryCodes: overrides.targetedCountryCodes ?? ["US"],
    targetedLanguageCodes: overrides.targetedLanguageCodes ?? ["en"],
    audienceMatched: overrides.audienceMatched ?? true,
  };
}

function baseRequest(
  candidateIds: readonly string[],
  overrides: Partial<AdsDeliveryRequest> = {}
): AdsDeliveryRequest {
  return {
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    placementId: "WATCH_FEED",
    candidates: candidateIds.map((id) => ({
      candidateId: id,
      campaignId: `campaign-${id}`,
      adSetId: `ad-set-${id}`,
      adId: `ad-${id}`,
      creativeId: `creative-${id}`,
    })),
    viewer: { opaqueViewerId: "viewer-opaque-1" },
    geo: { countryCode: "US" },
    languageCode: "en-US",
    deviceClass: "mobile",
    featureFlags: {
      [ADS_ELIGIBILITY_DELIVERY_FLAG_KEY]: false,
      ADS_PLACEMENT_WATCH_FEED_ENABLED: false,
    },
    currentTimestamp: NOW,
    ...overrides,
  };
}

function enabledFlagsFor(placementId: string): Record<string, boolean> {
  const flagKey = ADS_PLACEMENT_REGISTRY[
    placementId as keyof typeof ADS_PLACEMENT_REGISTRY
  ].featureFlag.key;
  return {
    [ADS_ELIGIBILITY_DELIVERY_FLAG_KEY]: true,
    [flagKey]: true,
  };
}

function runBase(options: {
  inventory?: Record<string, unknown>;
  request?: AdsDeliveryRequest;
  eligibilityStates?: AdsEligibilityCandidateState[];
  candidateIds?: readonly string[];
} = {}) {
  const candidateIds = options.candidateIds ?? ["candidate-1"];
  return runAdsExecutionLayer({
    inventory:
      options.inventory ??
      baseInventory(
        candidateIds.map((id) => inventoryCandidate({ candidateId: id }))
      ),
    request: options.request ?? baseRequest(candidateIds),
    eligibilityStates:
      options.eligibilityStates ??
      candidateIds.map((id) => eligibilityState({ candidateId: id })),
  });
}

describe("Ads Execution Layer Foundation V1", () => {
  it("exposes contract version and allowed fields", () => {
    expect(ADS_EXECUTION_LAYER_CONTRACT_VERSION).toBe("v1");
    expect([...ADS_EXECUTION_LAYER_ALLOWED_FIELDS]).toEqual([
      "inventory",
      "request",
      "eligibilityStates",
    ]);
    expect(ADS_EXECUTION_RESULT_ALLOWED_FIELDS).toContain(
      "renderDescriptorPlaceholder"
    );
    expect(ADS_EXECUTION_RESULT_ALLOWED_FIELDS).toContain(
      "selectableCandidates"
    );
    expect(ADS_EXECUTION_RESULT_ALLOWED_FIELDS).toContain(
      "selectedCandidateId"
    );
  });

  it("executes an empty inventory successfully", () => {
    const empty = createEmptyInventory({
      inventoryId: "inventory-empty",
      revision: 1,
      generatedAt: GENERATED_AT,
    });
    const outcome = runAdsExecutionLayer({
      inventory: empty,
      request: baseRequest([]),
      eligibilityStates: [],
    });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result).toEqual(createEmptyAdsExecutionResult());
    expect(outcome.result.executionCompleted).toBe(true);
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.renderDescriptorPlaceholder).toBeNull();
    expect(outcome.result.selectionSummary.selectedCandidate).toBeNull();
    expect(outcome.result.selectedCandidateId).toBeNull();
    expect(outcome.result.selectableCandidates).toEqual([]);
    expect(outcome.result.evaluatedCandidates).toEqual([]);
  });

  it("executes a single candidate deterministically", () => {
    const first = runBase();
    const second = runBase();

    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    if (!first.valid || !second.valid) return;

    expect(first.result).toEqual(second.result);
    expect(Object.isFrozen(first.result)).toBe(true);
    expect(first.result.evaluatedCandidates).toHaveLength(1);
    expect(first.result.eligibilityResults).toHaveLength(1);
    expect(first.result.compatibilityResults).toHaveLength(1);
    expect(first.result.traces).toHaveLength(1);
    expect(first.result.executionCompleted).toBe(true);
    expect(first.result.productionEnabled).toBe(false);
    expect(first.result.renderDescriptorPlaceholder).toBeNull();
    expect(first.result.selectionSummary.selectedCandidate).toBeNull();
    expect(first.result.selectedCandidateId).toBeNull();
    expect(Array.isArray(first.result.selectableCandidates)).toBe(true);
  });

  it("executes multiple candidates in inventory order", () => {
    const outcome = runBase({
      candidateIds: ["candidate-a", "candidate-b", "candidate-c"],
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(
      outcome.result.evaluatedCandidates.map((c) => c.candidateId)
    ).toEqual(["candidate-a", "candidate-b", "candidate-c"]);
    expect(
      outcome.result.eligibilityResults.map((c) => c.candidateId)
    ).toEqual(["candidate-a", "candidate-b", "candidate-c"]);
    expect(
      outcome.result.compatibilityResults.map((c) => c.candidateId)
    ).toEqual(["candidate-a", "candidate-b", "candidate-c"]);
    expect(
      outcome.result.traces.map((t) => t.candidateReference.candidateId)
    ).toEqual(["candidate-a", "candidate-b", "candidate-c"]);
    expect(outcome.result.selectionSummary.evaluatedCandidateCount).toBe(3);
  });

  it("records incompatible creatives without selecting an ad", () => {
    const outcome = runAdsExecutionLayer({
      inventory: baseInventory([
        inventoryCandidate({
          candidateId: "candidate-1",
          placement: "WATCH_FEED",
          creativeType: "game_promotion",
        }),
      ]),
      request: baseRequest(["candidate-1"], {
        featureFlags: enabledFlagsFor("WATCH_FEED"),
      }),
      eligibilityStates: [
        eligibilityState({ candidateId: "candidate-1", placementId: "WATCH_FEED" }),
      ],
    });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.compatibilityResults[0].compatible).toBe(false);
    expect(outcome.result.compatibilityResults[0].reason).toContain(
      "not supported by placement"
    );
    expect(outcome.result.rejectedCandidates.some((r) => r.stage === "compatibility")).toBe(
      true
    );
    expect(outcome.result.selectableCandidates).toEqual([]);
    expect(outcome.result.selectionSummary.eligibleCandidates).toEqual([]);
    expect(outcome.result.selectionSummary.eligibleCandidateCount).toBe(0);
    expect(outcome.result.selectedCandidateId).toBeNull();
    expect(outcome.result.selectionSummary.selectedCandidate).toBeNull();
    expect(outcome.result.renderDescriptorPlaceholder).toBeNull();
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.traces[0].diagnosticSummary).toEqual({
      compatible: false,
    });
  });

  it("rejects invalid placement in inventory (fail closed)", () => {
    const outcome = runAdsExecutionLayer({
      inventory: baseInventory([
        {
          ...inventoryCandidate({ candidateId: "candidate-1" }),
          placement: "NOT_A_PLACEMENT",
        },
      ]),
      request: baseRequest(["candidate-1"]),
      eligibilityStates: [eligibilityState({ candidateId: "candidate-1" })],
    });

    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) => issue.includes("Malformed inventory"))
    ).toBe(true);
  });

  it("rejects invalid taxonomy / malformed request", () => {
    const outcome = runAdsExecutionLayer({
      inventory: baseInventory(),
      request: {
        ...baseRequest(["candidate-1"]),
        placementId: "NOT_REAL" as AdsDeliveryRequest["placementId"],
      },
      eligibilityStates: [eligibilityState({ candidateId: "candidate-1" })],
    });

    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) => issue.includes("Malformed request"))
    ).toBe(true);
  });

  it("rejects inconsistent candidate references", () => {
    const outcome = runAdsExecutionLayer({
      inventory: baseInventory([
        inventoryCandidate({ candidateId: "candidate-1" }),
      ]),
      request: baseRequest(["candidate-2"]),
      eligibilityStates: [eligibilityState({ candidateId: "candidate-1" })],
    });

    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) =>
        issue.includes("Inconsistent candidate references")
      )
    ).toBe(true);
  });

  it("rejects malformed inventory and eligibility states", () => {
    expect(
      runAdsExecutionLayer({
        inventory: null,
        request: baseRequest([]),
        eligibilityStates: [],
      }).valid
    ).toBe(false);

    expect(
      runAdsExecutionLayer({
        inventory: baseInventory(),
        request: baseRequest(["candidate-1"]),
        eligibilityStates: [{ candidateId: "candidate-1" }],
      }).valid
    ).toBe(false);

    expect(
      runAdsExecutionLayer({
        inventory: baseInventory(),
        request: baseRequest(["candidate-1"]),
        eligibilityStates: "nope",
      }).valid
    ).toBe(false);
  });

  it("rejects unknown input fields", () => {
    const outcome = runAdsExecutionLayer({
      inventory: createEmptyInventory({ generatedAt: GENERATED_AT }),
      request: baseRequest([]),
      eligibilityStates: [],
      selectedAd: "ad-1",
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(outcome.issues[0]).toContain('unknown field "selectedAd"');
  });

  it("does not mutate inputs (immutability)", () => {
    const inventory = baseInventory([
      inventoryCandidate({ candidateId: "candidate-1" }),
    ]);
    const request = baseRequest(["candidate-1"]);
    const eligibilityStates = [
      eligibilityState({ candidateId: "candidate-1" }),
    ];
    const snapshot = structuredClone({
      inventory,
      request,
      eligibilityStates,
    });

    const outcome = runAdsExecutionLayer({
      inventory,
      request,
      eligibilityStates,
    });
    expect(outcome.valid).toBe(true);
    expect({ inventory, request, eligibilityStates }).toEqual(snapshot);
  });

  it("keeps productionEnabled false and executionCompleted true", () => {
    const disabled = runBase();
    expect(disabled.valid).toBe(true);
    if (!disabled.valid) return;
    expect(disabled.result.productionEnabled).toBe(false);
    expect(disabled.result.executionCompleted).toBe(true);
    expect(disabled.result.eligibilityResults[0].productionEnabled).toBe(false);
    expect(disabled.result.compatibilityResults[0].productionEnabled).toBe(
      false
    );
    expect(disabled.result.traces[0].productionEnabled).toBe(false);
    expect(disabled.result.selectionSummary.productionEnabled).toBe(false);

    const enabled = runBase({
      request: baseRequest(["candidate-1"], {
        featureFlags: enabledFlagsFor("WATCH_FEED"),
      }),
    });
    expect(enabled.valid).toBe(true);
    if (!enabled.valid) return;
    expect(enabled.result.productionEnabled).toBe(false);
    expect(enabled.result.executionCompleted).toBe(true);
    expect(enabled.result.eligibilityResults[0].eligible).toBe(true);
    expect(enabled.result.compatibilityResults[0].compatible).toBe(true);
    expect(enabled.result.selectableCandidates).toEqual([
      { candidateId: "candidate-1" },
    ]);
    expect(enabled.result.selectionSummary.eligibleCandidates).toEqual([
      { candidateId: "candidate-1" },
    ]);
    expect(enabled.result.selectedCandidateId).toBeNull();
    expect(enabled.result.selectionSummary.selectedCandidate).toBeNull();
    expect(enabled.result.renderDescriptorPlaceholder).toBeNull();
    expect(enabled.result.traces[0].diagnosticSummary).toEqual({
      compatible: true,
    });
  });

  it("keeps selection summary aligned with selectable set (eligibility ∩ compatibility)", () => {
    const outcome = runAdsExecutionLayer({
      inventory: baseInventory([
        inventoryCandidate({
          candidateId: "ok",
          placement: "WATCH_FEED",
          creativeType: "video",
        }),
        inventoryCandidate({
          candidateId: "bad-creative",
          placement: "WATCH_FEED",
          creativeType: "game_promotion",
        }),
      ]),
      request: baseRequest(["ok", "bad-creative"], {
        featureFlags: enabledFlagsFor("WATCH_FEED"),
      }),
      eligibilityStates: [
        eligibilityState({ candidateId: "ok", placementId: "WATCH_FEED" }),
        eligibilityState({
          candidateId: "bad-creative",
          placementId: "WATCH_FEED",
        }),
      ],
    });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.eligibilityResults.every((r) => r.eligible)).toBe(
      true
    );
    expect(outcome.result.compatibilityResults[0].compatible).toBe(true);
    expect(outcome.result.compatibilityResults[1].compatible).toBe(false);
    expect(outcome.result.selectableCandidates).toEqual([
      { candidateId: "ok" },
    ]);
    expect(outcome.result.selectionSummary.eligibleCandidates).toEqual([
      { candidateId: "ok" },
    ]);
    expect(
      outcome.result.selectionSummary.eligibleCandidates.some(
        (c) => c.candidateId === "bad-creative"
      )
    ).toBe(false);
    expect(outcome.result.selectedCandidateId).toBeNull();
  });

  it("rejects via eligibility when delivery flags are off (no delivery)", () => {
    const outcome = runBase();
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.eligibilityResults[0].eligible).toBe(false);
    expect(outcome.result.eligibilityResults[0].exclusionReason).toBe(
      "delivery_disabled"
    );
    expect(outcome.result.rejectedCandidates[0]).toMatchObject({
      candidateId: "candidate-1",
      stage: "eligibility",
      reason: "delivery_disabled",
    });
    expect(ADS_DELIVERY_ENABLED).toBe(false);
  });

  it("validateAdsExecutionResult accepts empty and rejects malformed", () => {
    expect(validateAdsExecutionResult(createEmptyAdsExecutionResult())).toEqual(
      { valid: true }
    );
    expect(validateAdsExecutionResult(null).valid).toBe(false);
    expect(
      validateAdsExecutionResult({
        ...createEmptyAdsExecutionResult(),
        productionEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsExecutionResult({
        ...createEmptyAdsExecutionResult(),
        selectedCandidate: { candidateId: "x" },
      }).valid
    ).toBe(false);
  });

  it("has no ranking, delivery engine, DB, or product imports", () => {
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\//);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*\/(watch|discover|live|store|world|messenger|games|learning|search|notifications)(\/|["'])/i
    );
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*supabase[^"']*["']|require\(["'][^"']*supabase|createClient\s*\(/i
    );
    expect(SOURCE).not.toMatch(/\bfetch\s*\(|\baxios\b/);
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).not.toMatch(/ADS_DELIVERY_ENABLED\s*=\s*true/);
    expect(SOURCE).not.toMatch(/\brankCandidates\b|\brunAuction\b|\bpacing\b|\bbilling\b/i);
    expect(SOURCE).toMatch(/evaluateAdsCandidateEligibility/);
    expect(SOURCE).toMatch(/validateCreativePlacementCompatibility/);
    expect(SOURCE).toMatch(/buildAdsDeliveryDecisionTrace/);
    expect(SOURCE).toMatch(/buildAdsSelectableSet/);
    expect(SOURCE).toMatch(/buildAdsSelectionResult/);
    expect(SOURCE).toMatch(/selectedCandidateId: null/);
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/executionCompleted: true/);
    expect(SOURCE).toMatch(/renderDescriptorPlaceholder: null/);
  });
});
