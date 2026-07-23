import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
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
  createEmptyAdsInternalDeliveryPilotResult,
  runAdsExecutionLayer,
  runInternalDeliveryPilot,
  type AdsInternalDeliveryPilotResult,
} from "./compatibility";
import { runAdsExecutionLayerV1 } from "./executionLayer";
import { runInternalDeliveryPilotV1 } from "./internalDeliveryPilot";
import { buildAdsCandidateProvenanceBinding } from "./candidateProvenance";
import {
  ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION,
  ADS_MEASUREMENT_FOUNDATION_EVENT_TYPES,
  ADS_MEASUREMENT_FOUNDATION_INPUT_ALLOWED_FIELDS,
  ADS_MEASUREMENT_FOUNDATION_PACKAGE_ALLOWED_FIELDS,
  ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER,
  ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL,
  buildAdsMeasurementDedupeKey,
  prepareAdsMeasurementFoundation,
  prepareAdsMeasurementFromDeliveryV1,
  validateAdsMeasurementFoundationPackage,
} from "./measurementFoundation";
import {
  ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
  buildAdsRenderDescriptor,
} from "./renderDescriptor";
import { ADS_PLACEMENT_REGISTRY } from "./placementRegistry";
import type { AdsRenderMaterial } from "./serveBoundary";

const SOURCE_PATH = path.join(__dirname, "measurementFoundation.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

const NOW = "2026-07-22T12:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const EXPIRES = "2026-07-22T13:00:00.000Z";
const GENERATED_AT = "2026-07-22T11:00:00.000Z";

function inventoryCandidate(
  overrides: Partial<AdsCandidateMetadata> &
    Pick<AdsCandidateMetadata, "candidateId">
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
  candidates: Record<string, unknown>[] = [
    inventoryCandidate({ candidateId: "candidate-1" }),
  ]
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

function enabledFlagsFor(placementId: string): Record<string, boolean> {
  const flagKey =
    ADS_PLACEMENT_REGISTRY[placementId as keyof typeof ADS_PLACEMENT_REGISTRY]
      .featureFlag.key;
  return {
    [ADS_ELIGIBILITY_DELIVERY_FLAG_KEY]: true,
    [flagKey]: true,
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

function renderMaterialFor(
  candidateId: string,
  overrides: Partial<AdsRenderMaterial> = {}
): AdsRenderMaterial {
  return Object.freeze({
    candidateId,
    creativeReference:
      overrides.creativeReference ?? `creative-ref-${candidateId}`,
    mediaReference: overrides.mediaReference ?? `media-ref-${candidateId}`,
    thumbnailReference:
      overrides.thumbnailReference === undefined
        ? null
        : overrides.thumbnailReference,
    clickDestinationReference:
      overrides.clickDestinationReference ?? `destination-ref-${candidateId}`,
    impressionHandle: overrides.impressionHandle ?? `imp-${candidateId}`,
    clickHandle: overrides.clickHandle ?? `clk-${candidateId}`,
    ...(overrides.trackingReferences !== undefined
      ? { trackingReferences: overrides.trackingReferences }
      : {}),
    disclosureLabel: overrides.disclosureLabel ?? "Sponsored",
    cacheHints: overrides.cacheHints ?? {
      cacheable: false,
      maxAgeSeconds: null,
      cacheKey: null,
    },
    expiresAt: overrides.expiresAt ?? EXPIRES,
  });
}

function successfulPilotResult(): AdsInternalDeliveryPilotResult {
  const execution = runAdsExecutionLayer({
    inventory: baseInventory([
      inventoryCandidate({ candidateId: "candidate-1" }),
    ]),
    request: baseRequest(["candidate-1"], {
      featureFlags: enabledFlagsFor("WATCH_FEED"),
    }),
    eligibilityStates: [eligibilityState({ candidateId: "candidate-1" })],
    renderMaterial: renderMaterialFor("candidate-1"),
  });
  expect(execution.valid).toBe(true);
  if (!execution.valid) {
    throw new Error("expected successful execution");
  }

  const pilot = runInternalDeliveryPilot(
    { executionResult: execution.result },
    { nowMs: NOW_MS }
  );
  expect(pilot.valid).toBe(true);
  if (!pilot.valid) {
    throw new Error("expected successful pilot");
  }
  expect(pilot.result.pilotSuccess).toBe(true);
  expect(pilot.result.served).toBe(false);
  return pilot.result;
}

describe("Ads Measurement Foundation V1", () => {
  it("exposes contract version, event types, and allowed fields", () => {
    expect(ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION).toBe("v1");
    expect([...ADS_MEASUREMENT_FOUNDATION_EVENT_TYPES]).toEqual([
      "impression",
      "qualified_view",
      "click",
    ]);
    expect([...ADS_MEASUREMENT_FOUNDATION_INPUT_ALLOWED_FIELDS]).toEqual([
      "pilotResult",
      "eventType",
      "seenDedupeKeys",
    ]);
    expect(ADS_MEASUREMENT_FOUNDATION_PACKAGE_ALLOWED_FIELDS).toContain(
      "measurementReady"
    );
    expect(ADS_MEASUREMENT_FOUNDATION_PACKAGE_ALLOWED_FIELDS).toContain(
      "measurementEnabled"
    );
    expect(ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL).toBe("untrusted");
    expect(ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER).toBe("unsigned");
  });

  it("prepares a valid impression package", () => {
    const pilotResult = successfulPilotResult();
    const outcome = prepareAdsMeasurementFoundation(
      { pilotResult, eventType: "impression" },
      { nowMs: NOW_MS }
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.package.measurementReady).toBe(true);
    expect(outcome.package.eventType).toBe("impression");
    expect(outcome.package.dedupeKey).toBe(
      buildAdsMeasurementDedupeKey({
        eventType: "impression",
        selectedCandidateId: "candidate-1",
        reportingHandle: "imp-candidate-1",
      })
    );
    expect(outcome.package.trustLevel).toBe("untrusted");
    expect(outcome.package.signaturePlaceholder).toBe("unsigned");
    expect(outcome.package.productionEnabled).toBe(false);
    expect(outcome.package.measurementEnabled).toBe(false);
  });

  it("prepares a valid click package", () => {
    const pilotResult = successfulPilotResult();
    const outcome = prepareAdsMeasurementFoundation(
      { pilotResult, eventType: "click" },
      { nowMs: NOW_MS }
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.package.measurementReady).toBe(true);
    expect(outcome.package.eventType).toBe("click");
    expect(outcome.package.dedupeKey).toBe(
      buildAdsMeasurementDedupeKey({
        eventType: "click",
        selectedCandidateId: "candidate-1",
        reportingHandle: "clk-candidate-1",
      })
    );
    expect(outcome.package.productionEnabled).toBe(false);
    expect(outcome.package.measurementEnabled).toBe(false);
  });

  it("prepares a valid qualified_view (viewability) package bound to the impression handle", () => {
    const pilotResult = successfulPilotResult();
    const outcome = prepareAdsMeasurementFoundation(
      { pilotResult, eventType: "qualified_view" },
      { nowMs: NOW_MS }
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.package.measurementReady).toBe(true);
    expect(outcome.package.eventType).toBe("qualified_view");
    expect(outcome.package.dedupeKey).toBe(
      buildAdsMeasurementDedupeKey({
        eventType: "qualified_view",
        selectedCandidateId: "candidate-1",
        reportingHandle: "imp-candidate-1",
      })
    );
    expect(outcome.package.productionEnabled).toBe(false);
    expect(outcome.package.measurementEnabled).toBe(false);
  });

  it("separates dedupe namespaces by event type and keeps same-type keys stable", () => {
    const selectedCandidateId = "candidate-shared-1";
    const reportingHandle = "arh_v1_shared_handle_1";

    const impressionKey = buildAdsMeasurementDedupeKey({
      eventType: "impression",
      selectedCandidateId,
      reportingHandle,
    });
    const qualifiedViewKey = buildAdsMeasurementDedupeKey({
      eventType: "qualified_view",
      selectedCandidateId,
      reportingHandle,
    });
    const clickKey = buildAdsMeasurementDedupeKey({
      eventType: "click",
      selectedCandidateId,
      reportingHandle,
    });

    expect(impressionKey).toBe(
      `v1:impression:${selectedCandidateId}:${reportingHandle}`
    );
    expect(qualifiedViewKey).toBe(
      `v1:qualified_view:${selectedCandidateId}:${reportingHandle}`
    );
    expect(clickKey).toBe(
      `v1:click:${selectedCandidateId}:${reportingHandle}`
    );

    expect(impressionKey).not.toBe(qualifiedViewKey);
    expect(impressionKey).not.toBe(clickKey);
    expect(qualifiedViewKey).not.toBe(clickKey);
    expect(new Set([impressionKey, qualifiedViewKey, clickKey]).size).toBe(3);

    expect(
      buildAdsMeasurementDedupeKey({
        eventType: "impression",
        selectedCandidateId,
        reportingHandle,
      })
    ).toBe(impressionKey);
    expect(
      buildAdsMeasurementDedupeKey({
        eventType: "qualified_view",
        selectedCandidateId,
        reportingHandle,
      })
    ).toBe(qualifiedViewKey);
    expect(
      buildAdsMeasurementDedupeKey({
        eventType: "click",
        selectedCandidateId,
        reportingHandle,
      })
    ).toBe(clickKey);
  });

  it("rejects an invalid pilot result", () => {
    expect(
      prepareAdsMeasurementFoundation({
        pilotResult: null,
        eventType: "impression",
      }).valid
    ).toBe(false);

    expect(
      prepareAdsMeasurementFoundation({
        pilotResult: {
          ...createEmptyAdsInternalDeliveryPilotResult(),
          extra: true,
        },
        eventType: "impression",
      }).valid
    ).toBe(false);

    const emptyPilot = createEmptyAdsInternalDeliveryPilotResult();
    const failed = prepareAdsMeasurementFoundation({
      pilotResult: emptyPilot,
      eventType: "impression",
    });
    expect(failed.valid).toBe(false);
    if (failed.valid) return;
    expect(
      failed.issues.some((issue) => issue.includes("pilotSuccess"))
    ).toBe(true);
  });

  it("rejects served=false mismatch", () => {
    const pilotResult = successfulPilotResult();
    const outcome = prepareAdsMeasurementFoundation({
      pilotResult: { ...pilotResult, served: true },
      eventType: "impression",
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some(
        (issue) =>
          issue.includes("served") || issue.includes("Invalid pilot result")
      )
    ).toBe(true);
  });

  it("rejects an invalid event type", () => {
    const pilotResult = successfulPilotResult();
    expect(
      prepareAdsMeasurementFoundation({
        pilotResult,
        eventType: "conversion",
      }).valid
    ).toBe(false);
    expect(
      prepareAdsMeasurementFoundation({
        pilotResult,
        eventType: "viewability",
      }).valid
    ).toBe(false);
    expect(
      prepareAdsMeasurementFoundation({
        pilotResult,
        eventType: "",
      }).valid
    ).toBe(false);
  });

  it("rejects duplicate dedupe keys (fail closed, no storage)", () => {
    const pilotResult = successfulPilotResult();
    const first = prepareAdsMeasurementFoundation(
      { pilotResult, eventType: "impression" },
      { nowMs: NOW_MS }
    );
    expect(first.valid).toBe(true);
    if (!first.valid) return;

    const duplicate = prepareAdsMeasurementFoundation(
      {
        pilotResult,
        eventType: "impression",
        seenDedupeKeys: [first.package.dedupeKey],
      },
      { nowMs: NOW_MS }
    );
    expect(duplicate.valid).toBe(false);
    if (duplicate.valid) return;
    expect(
      duplicate.issues.some((issue) => issue.includes("duplicate dedupe"))
    ).toBe(true);

    expect(
      prepareAdsMeasurementFoundation({
        pilotResult,
        eventType: "click",
        seenDedupeKeys: [first.package.dedupeKey, first.package.dedupeKey],
      }).valid
    ).toBe(false);
  });

  it("rejects unknown fields", () => {
    const pilotResult = successfulPilotResult();
    expect(
      prepareAdsMeasurementFoundation({
        pilotResult,
        eventType: "impression",
        storage: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsMeasurementFoundationPackage({
        contractVersion: ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION,
        measurementReady: true,
        eventType: "impression",
        dedupeKey: "v1:impression:candidate-1:imp-candidate-1",
        trustLevel: ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL,
        signaturePlaceholder: ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER,
        productionEnabled: false,
        measurementEnabled: false,
        extra: true,
      }).valid
    ).toBe(false);
  });

  it("produces deterministic output", () => {
    const pilotResult = successfulPilotResult();
    const input = { pilotResult, eventType: "impression" as const };
    const first = prepareAdsMeasurementFoundation(input, { nowMs: NOW_MS });
    const second = prepareAdsMeasurementFoundation(input, { nowMs: NOW_MS });
    expect(first.valid && second.valid).toBe(true);
    if (!first.valid || !second.valid) return;
    expect(first.package).toEqual(second.package);
    expect(first.package.dedupeKey).toBe(second.package.dedupeKey);
  });

  it("produces immutable output without mutating inputs", () => {
    const pilotResult = successfulPilotResult();
    const input = {
      pilotResult,
      eventType: "click" as const,
      seenDedupeKeys: ["other-key"],
    };
    const snapshot = structuredClone(input);

    const outcome = prepareAdsMeasurementFoundation(input, { nowMs: NOW_MS });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(Object.isFrozen(outcome.package)).toBe(true);
    expect(input).toEqual(snapshot);
  });

  it("keeps measurementEnabled and productionEnabled false", () => {
    const pilotResult = successfulPilotResult();
    for (const eventType of ADS_MEASUREMENT_FOUNDATION_EVENT_TYPES) {
      const outcome = prepareAdsMeasurementFoundation(
        { pilotResult, eventType },
        { nowMs: NOW_MS }
      );
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;
      expect(outcome.package.measurementEnabled).toBe(false);
      expect(outcome.package.productionEnabled).toBe(false);
      expect(outcome.package.measurementReady).toBe(true);
    }
  });

  it("validateAdsMeasurementFoundationPackage accepts prepared packages", () => {
    const pilotResult = successfulPilotResult();
    const outcome = prepareAdsMeasurementFoundation(
      { pilotResult, eventType: "impression" },
      { nowMs: NOW_MS }
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(validateAdsMeasurementFoundationPackage(outcome.package)).toEqual({
      valid: true,
    });
    expect(validateAdsMeasurementFoundationPackage(null).valid).toBe(false);
    expect(
      validateAdsMeasurementFoundationPackage({
        ...outcome.package,
        measurementEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsMeasurementFoundationPackage({
        ...outcome.package,
        productionEnabled: true,
      }).valid
    ).toBe(false);
  });

  it("preferred path prepares packages from Internal Delivery Pilot V1 results", () => {
    const descriptorOutcome = buildAdsRenderDescriptor(
      {
        descriptorVersion: ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
        placementId: "WATCH_FEED",
        creativeReference: "creative-ref-1",
        creativeType: "video",
        mediaReference: "media-ref-1",
        thumbnailReference: "thumb-ref-1",
        clickDestinationReference: "destination-ref-1",
        disclosure: { label: "Sponsored", mustDisplay: true },
        reportingHandles: {
          impressionHandle: "imp-handle-v1",
          clickHandle: "clk-handle-v1",
        },
        trackingReferences: {
          campaignId: "campaign-1",
          adSetId: "ad-set-1",
          adId: "ad-1",
          creativeId: "creative-ref-1",
        },
        cacheHints: {
          cacheable: false,
          maxAgeSeconds: null,
          cacheKey: null,
        },
        expiresAt: EXPIRES,
        productionEnabled: false,
      },
      { nowMs: NOW_MS }
    );
    expect(descriptorOutcome.valid).toBe(true);
    if (!descriptorOutcome.valid) {
      return;
    }

    const provenanceOutcome = buildAdsCandidateProvenanceBinding({
      candidateId: "candidate-1",
      campaignRef: "campaign-1",
      advertiserRef: "advertiser-1",
      creativeRef: "creative-ref-1",
      placementId: "WATCH_FEED",
      domainPlacement: "watch_feed",
      adSetRef: "ad-set-1",
      adRef: "ad-1",
      selectionRequestId: "selection-req-1",
      inventorySourceId: "inv-1",
      inventoryRevision: 1,
      moderationSnapshotRef: "mod-snap-1",
    });
    expect(provenanceOutcome.valid).toBe(true);
    if (!provenanceOutcome.valid) {
      return;
    }

    const execution = runAdsExecutionLayerV1({
      candidateId: "candidate-1",
      renderDescriptor: descriptorOutcome.descriptor,
      currentTimestamp: NOW,
      provenance: provenanceOutcome.provenance,
    });
    expect(execution.valid).toBe(true);
    if (!execution.valid) {
      return;
    }

    const delivery = runInternalDeliveryPilotV1({
      executionResult: execution.result,
      currentTimestamp: NOW,
    });
    expect(delivery.valid).toBe(true);
    if (!delivery.valid) {
      return;
    }
    expect(delivery.result.deliveryAccepted).toBe(true);

    const outcome = prepareAdsMeasurementFromDeliveryV1({
      deliveryResult: delivery.result,
      eventType: "click",
      provenance: provenanceOutcome.provenance,
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.package.eventType).toBe("click");
    expect(outcome.package.measurementEnabled).toBe(false);
    expect(outcome.package.productionEnabled).toBe(false);
    expect(outcome.package.dedupeKey).toBe(
      buildAdsMeasurementDedupeKey({
        eventType: "click",
        selectedCandidateId: "candidate-1",
        reportingHandle: "clk-handle-v1",
      })
    );
  });

  it("has no storage, network, database, reporting, or product wiring", () => {
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
    expect(SOURCE).not.toMatch(
      /\brankCandidates\b|\brunAuction\b|\bpacing\b|renderCreative|serveAd\b/i
    );
    expect(SOURCE).not.toMatch(/\blocalStorage\b|\bindexedDB\b/);
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/measurementEnabled: false/);
    expect(SOURCE).toMatch(/prepareAdsMeasurementFoundation/);
    expect(SOURCE).toMatch(/prepareAdsMeasurementFromDeliveryV1/);
    expect(SOURCE).toMatch(/validateAdsInternalDeliveryPilotResult/);
    expect(SOURCE).toMatch(/validateAdsInternalDeliveryInternalResult/);
  });
});
