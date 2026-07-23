import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as platform from "./index";
import * as compatibility from "./compatibility";

const INDEX_SOURCE = readFileSync(path.join(__dirname, "index.ts"), "utf8");

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

  it("keeps canonical V1 measurement APIs flat-exported", () => {
    expect(typeof platform.prepareAdsMeasurementFromDeliveryV1).toBe(
      "function"
    );
    expect(typeof platform.buildAdsMeasurementDedupeKey).toBe("function");
    expect(typeof platform.validateAdsMeasurementFoundationPackage).toBe(
      "function"
    );
    expect(platform.ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION).toBe("v1");
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

  it("exposes runAdsStackPipelineV1 as the canonical public entrypoint", () => {
    expect(typeof platform.runAdsStackPipelineV1).toBe("function");
    expect(INDEX_SOURCE).toMatch(/runAdsStackPipelineV1/);
    expect(INDEX_SOURCE).toMatch(
      /Preferred canonical Ads V1 orchestration entry/
    );
  });
});
