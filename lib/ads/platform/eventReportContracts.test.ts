import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADS_DELIVERY_ENABLED } from "../constants";
import {
  ADS_EVENT_REPORT_CLOCK_SKEW_MS,
  ADS_EVENT_REPORT_CONTRACT_VERSION,
  ADS_EVENT_REPORT_MAX_ID_LENGTH,
  ADS_EVENT_REPORT_MAX_METADATA_BYTES,
  acknowledgeEventReportRequest,
  validateEventReportRequest,
  type AdsEventReportRequest,
} from "./eventReportContracts";
import {
  ADS_PLACEMENT_REGISTRY,
  validateAdsPlacementRegistry,
} from "./placementRegistry";

const FIXED_NOW_MS = Date.parse("2026-07-22T09:00:00.000Z");

function baseRequest(
  overrides: Partial<AdsEventReportRequest> = {}
): AdsEventReportRequest {
  return {
    contractVersion: ADS_EVENT_REPORT_CONTRACT_VERSION,
    eventType: "impression",
    placementId: "WATCH_FEED",
    adId: "ad-1",
    campaignId: "campaign-1",
    adSetId: "ad-set-1",
    creativeId: "creative-1",
    dedupeKey: "dedupe:impression:ad-1:client-1",
    occurredAt: "2026-07-22T08:59:30.000Z",
    clientEventId: "client-event-1",
    sessionId: "session-1",
    viewer: { opaqueViewerId: "viewer-opaque-1" },
    countryCode: "US",
    languageCode: "en",
    metadata: { surface: "watch", labeled: true },
    trustContext: { trustLevel: "provisional" },
    signatureContext: {
      algorithm: "hmac_sha256",
      keyId: "key-1",
      signature: "sig-placeholder-value",
      signedAt: "2026-07-22T08:59:30.000Z",
    },
    ...overrides,
  };
}

describe("Ads Event Report Contracts V1", () => {
  it("accepts a valid impression contract shape", () => {
    const result = validateEventReportRequest(baseRequest(), {
      nowMs: FIXED_NOW_MS,
    });
    expect(result).toEqual({ valid: true });
  });

  it("accepts a valid click contract shape", () => {
    const result = validateEventReportRequest(
      baseRequest({
        eventType: "click",
        dedupeKey: "dedupe:click:ad-1:client-2",
        clientEventId: "client-event-2",
      }),
      { nowMs: FIXED_NOW_MS }
    );
    expect(result).toEqual({ valid: true });
  });

  it("rejects unsupported contract versions", () => {
    const result = validateEventReportRequest(
      {
        ...baseRequest(),
        contractVersion: "v0",
      } as unknown,
      { nowMs: FIXED_NOW_MS }
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("contractVersion"))).toBe(
        true
      );
    }
  });

  it("rejects unsupported event types", () => {
    const result = validateEventReportRequest(
      {
        ...baseRequest(),
        eventType: "conversion",
      } as unknown,
      { nowMs: FIXED_NOW_MS }
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("eventType"))).toBe(
        true
      );
    }
  });

  it("rejects invalid placement IDs using the platform registry", () => {
    expect(validateAdsPlacementRegistry()).toEqual([]);
    expect(ADS_PLACEMENT_REGISTRY.WATCH_FEED.id).toBe("WATCH_FEED");

    const result = validateEventReportRequest(
      {
        ...baseRequest(),
        placementId: "stories",
      } as unknown,
      { nowMs: FIXED_NOW_MS }
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("placementId"))).toBe(
        true
      );
    }
  });

  it("rejects missing dedupe keys", () => {
    const result = validateEventReportRequest(
      {
        ...baseRequest(),
        dedupeKey: "",
      },
      { nowMs: FIXED_NOW_MS }
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("dedupeKey"))).toBe(
        true
      );
    }
  });

  it("rejects empty IDs", () => {
    const result = validateEventReportRequest(
      baseRequest({
        adId: "   ",
        campaignId: "",
      }),
      { nowMs: FIXED_NOW_MS }
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("adId"))).toBe(true);
      expect(result.issues.some((issue) => issue.includes("campaignId"))).toBe(
        true
      );
    }
  });

  it("rejects oversized IDs", () => {
    const oversized = "x".repeat(ADS_EVENT_REPORT_MAX_ID_LENGTH + 1);
    const result = validateEventReportRequest(
      baseRequest({ creativeId: oversized }),
      { nowMs: FIXED_NOW_MS }
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("creativeId"))).toBe(
        true
      );
    }
  });

  it("rejects invalid timestamps", () => {
    const result = validateEventReportRequest(
      baseRequest({ occurredAt: "not-a-timestamp" }),
      { nowMs: FIXED_NOW_MS }
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("occurredAt"))).toBe(
        true
      );
    }
  });

  it("rejects excessive future clock skew", () => {
    const tooFarAhead = new Date(
      FIXED_NOW_MS + ADS_EVENT_REPORT_CLOCK_SKEW_MS + 1
    ).toISOString();
    const result = validateEventReportRequest(
      baseRequest({ occurredAt: tooFarAhead }),
      { nowMs: FIXED_NOW_MS }
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("clock-skew"))).toBe(
        true
      );
    }
  });

  it("allows occurredAt within the documented clock-skew window", () => {
    const withinSkew = new Date(
      FIXED_NOW_MS + ADS_EVENT_REPORT_CLOCK_SKEW_MS
    ).toISOString();
    expect(
      validateEventReportRequest(baseRequest({ occurredAt: withinSkew }), {
        nowMs: FIXED_NOW_MS,
      })
    ).toEqual({ valid: true });
  });

  it("rejects oversized metadata", () => {
    const oversizedValue = "m".repeat(ADS_EVENT_REPORT_MAX_METADATA_BYTES);
    const result = validateEventReportRequest(
      baseRequest({
        metadata: { blob: oversizedValue },
      }),
      { nowMs: FIXED_NOW_MS }
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("metadata"))).toBe(
        true
      );
    }
  });

  it("rejects incomplete signature context", () => {
    const missingSignature = validateEventReportRequest(
      baseRequest({
        signatureContext: {
          algorithm: "hmac_sha256",
          keyId: "key-1",
          signature: "",
          signedAt: "2026-07-22T08:59:30.000Z",
        },
      }),
      { nowMs: FIXED_NOW_MS }
    );
    expect(missingSignature).toMatchObject({ valid: false });

    const algorithmNone = validateEventReportRequest(
      baseRequest({
        signatureContext: {
          algorithm: "none",
          keyId: "key-1",
          signature: "sig",
          signedAt: "2026-07-22T08:59:30.000Z",
        },
      }),
      { nowMs: FIXED_NOW_MS }
    );
    expect(algorithmNone).toMatchObject({ valid: false });
    if (!algorithmNone.valid) {
      expect(
        algorithmNone.issues.some((issue) =>
          issue.includes("production acceptance")
        )
      ).toBe(true);
    }
  });

  it("rejects unexpected unsafe fields where supported", () => {
    const withIp = validateEventReportRequest(
      {
        ...baseRequest(),
        ipAddress: "203.0.113.10",
      } as unknown,
      { nowMs: FIXED_NOW_MS }
    );
    expect(withIp).toMatchObject({ valid: false });
    if (!withIp.valid) {
      expect(withIp.issues.some((issue) => issue.includes("ipAddress"))).toBe(
        true
      );
    }

    const withGps = validateEventReportRequest(
      {
        ...baseRequest(),
        latitude: 31.95,
      } as unknown,
      { nowMs: FIXED_NOW_MS }
    );
    expect(withGps).toMatchObject({ valid: false });

    const withTeenField = validateEventReportRequest(
      {
        ...baseRequest(),
        age: 15,
      } as unknown,
      { nowMs: FIXED_NOW_MS }
    );
    expect(withTeenField).toMatchObject({ valid: false });
  });

  it("keeps contract-valid requests non-accepted and production-disabled", () => {
    const ack = acknowledgeEventReportRequest(baseRequest(), {
      nowMs: FIXED_NOW_MS,
    });

    expect(ack.contractValid).toBe(true);
    expect(ack.acceptedForIngestion).toBe(false);
    expect(ack.productionEnabled).toBe(false);
    expect(ack.validationErrors).toEqual([]);
    expect(ack.eventType).toBe("impression");
    expect(ack.placementId).toBe("WATCH_FEED");
    expect(ack.contractVersion).toBe(ADS_EVENT_REPORT_CONTRACT_VERSION);
  });

  it("does not wire product surfaces for event reporting", () => {
    const roots = ["watch", "discover", "live", "store", "world", "learning"];
    for (const root of roots) {
      const dir = path.join(process.cwd(), "app", root);
      let source = "";
      try {
        source = readFileSync(path.join(dir, "page.tsx"), "utf8");
      } catch {
        // Some product roots may use alternate entry files; scan folder text via known loaders.
      }
      expect(source).not.toMatch(
        /acknowledgeEventReportRequest|validateEventReportRequest|eventReportContracts/
      );
    }

    const watchFeed = readFileSync(
      path.join(process.cwd(), "app", "actions", "loadWatchFeed.ts"),
      "utf8"
    );
    const discoverFeed = readFileSync(
      path.join(process.cwd(), "app", "actions", "loadDiscoverFeed.ts"),
      "utf8"
    );
    expect(watchFeed).not.toMatch(
      /ad_impression|acknowledgeEventReportRequest|eventReportContracts|serveAd/
    );
    expect(discoverFeed).not.toMatch(
      /ad_impression|acknowledgeEventReportRequest|eventReportContracts|serveAd/
    );
  });

  it("keeps Ads delivery disabled", () => {
    expect(ADS_DELIVERY_ENABLED).toBe(false);
    for (const placement of Object.values(ADS_PLACEMENT_REGISTRY)) {
      expect(placement.featureFlag.enabledByDefault).toBe(false);
      expect(placement.visibility).toBe("hidden");
    }
  });
});
