/**
 * Ads Platform export quarantine — canonical vs compatibility surfaces.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as platform from "./index";
import * as compatibility from "./compatibility";

const INDEX_SOURCE = readFileSync(path.join(__dirname, "index.ts"), "utf8");

const LEGACY_FLAT_EXPORTS = [
  "runAdsExecutionLayer",
  "runInternalDeliveryPilot",
  "prepareAdsMeasurementFoundation",
  "runAdsStackPipelineV1",
  "runAdsPilotSelector",
  "buildAdsSelectableSet",
  "emitAdsRenderDescriptor",
  "buildCandidateInventory",
  "buildAdsSelectionResult",
  "buildAdsDeliveryDecisionTrace",
  "evaluateAdsCandidateEligibility",
] as const;

const NON_AUTHORITATIVE_FLAT_EXPORTS = [
  "runAdsExecutionLayerV1",
  "runInternalDeliveryPilotV1",
  "prepareAdsMeasurementFromDeliveryV1",
  "evaluateAdsBilling",
  "calculateAdsCharge",
  "runAdsMeasurementEventFlow",
  "runAdsImpressionMeasurementPipeline",
] as const;

describe("Ads Platform export quarantine", () => {
  it("keeps prepareAdsMeasurementFoundation off the flat public barrel", () => {
    expect("prepareAdsMeasurementFoundation" in platform).toBe(false);
    expect(INDEX_SOURCE).not.toMatch(
      /export\s+\{\s*[^}]*prepareAdsMeasurementFoundation/
    );
    expect(INDEX_SOURCE).not.toMatch(
      /export\s+\*\s+from\s+["']\.\/measurementFoundation["']/
    );
  });

  it("exposes prepareAdsMeasurementFoundation only via adsPlatformCompatibility", () => {
    expect(typeof compatibility.prepareAdsMeasurementFoundation).toBe(
      "function"
    );
    expect(typeof platform.adsPlatformCompatibility.prepareAdsMeasurementFoundation).toBe(
      "function"
    );
    expect(platform.adsPlatformCompatibility.prepareAdsMeasurementFoundation).toBe(
      compatibility.prepareAdsMeasurementFoundation
    );
  });

  it("keeps measurement contract helpers flat-exported without delivery preparation", () => {
    expect(typeof platform.buildAdsMeasurementDedupeKey).toBe("function");
    expect(typeof platform.validateAdsMeasurementFoundationPackage).toBe(
      "function"
    );
    expect(platform.ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION).toBe("v1");
    expect("prepareAdsMeasurementFromDeliveryV1" in platform).toBe(false);
    expect(typeof compatibility.prepareAdsMeasurementFromDeliveryV1).toBe(
      "function"
    );
  });

  it("keeps foundation execution/pilot APIs only on the compatibility namespace", () => {
    expect("runAdsExecutionLayer" in platform).toBe(false);
    expect("runInternalDeliveryPilot" in platform).toBe(false);
    expect(typeof compatibility.runAdsExecutionLayer).toBe("function");
    expect(typeof compatibility.runInternalDeliveryPilot).toBe("function");
    expect(typeof platform.adsPlatformCompatibility.runAdsExecutionLayer).toBe(
      "function"
    );
    expect(
      typeof platform.adsPlatformCompatibility.runInternalDeliveryPilot
    ).toBe("function");
  });

  it("exposes runAdsCanonicalStackV1 as the sole authoritative public entrypoint", () => {
    expect(typeof platform.runAdsCanonicalStackV1).toBe("function");
    expect("runAdsStackPipelineV1" in platform).toBe(false);
    expect(typeof compatibility.runAdsStackPipelineV1).toBe("function");
    expect(INDEX_SOURCE).toMatch(/runAdsCanonicalStackV1/);
    expect(INDEX_SOURCE).toMatch(
      /Sole authoritative production decision entrypoint/
    );
  });

  it("quarantines delivery/measurement/billing stage APIs off the flat barrel", () => {
    for (const name of NON_AUTHORITATIVE_FLAT_EXPORTS) {
      expect(name in platform).toBe(false);
    }
    expect(typeof compatibility.runAdsExecutionLayerV1).toBe("function");
    expect(typeof compatibility.runInternalDeliveryPilotV1).toBe("function");
    expect(typeof compatibility.evaluateAdsBilling).toBe("function");
    expect(typeof compatibility.runAdsMeasurementEventFlow).toBe("function");
  });

  it("exposes legacy track APIs only through the compatibility namespace", () => {
    for (const name of LEGACY_FLAT_EXPORTS) {
      expect(name in platform).toBe(false);
    }
    expect(typeof compatibility.runAdsPilotSelector).toBe("function");
    expect(typeof compatibility.buildAdsSelectableSet).toBe("function");
    expect(typeof compatibility.emitAdsRenderDescriptor).toBe("function");
    expect(typeof compatibility.buildCandidateInventory).toBe("function");
    expect(typeof compatibility.buildAdsSelectionResult).toBe("function");
    expect(typeof compatibility.buildAdsDeliveryDecisionTrace).toBe("function");
    expect(typeof compatibility.evaluateAdsCandidateEligibility).toBe(
      "function"
    );
  });
});
