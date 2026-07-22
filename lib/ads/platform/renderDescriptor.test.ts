import { describe, expect, it } from "vitest";
import {
  ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
  ADS_RENDER_DESCRIPTOR_MAX_CACHE_AGE_SECONDS,
  ADS_RENDER_DESCRIPTOR_MAX_ID_LENGTH,
  buildAdsRenderDescriptor,
  freezeAdsRenderDescriptor,
  isAdsRenderDescriptorCreativeType,
  isAdsRenderDisclosureLabel,
  listAdsRenderDescriptorRequiredFields,
  listAdsRenderDisclosureLabels,
  looksLikeAdsRenderUrl,
  validateAdsRenderDescriptor,
  type AdsRenderDescriptor,
} from "./renderDescriptor";

const NOW_MS = Date.parse("2026-07-22T12:00:00.000Z");

function baseDescriptor(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    descriptorVersion: ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
    placementId: "WATCH_FEED",
    creativeReference: "creative-ref-1",
    creativeType: "video",
    mediaReference: "media-ref-1",
    thumbnailReference: "thumb-ref-1",
    clickDestinationReference: "destination-ref-1",
    disclosure: {
      label: "Sponsored",
      mustDisplay: true,
    },
    reportingHandles: {
      impressionHandle: "imp-handle-1",
      clickHandle: "clk-handle-1",
    },
    trackingReferences: {
      campaignId: "campaign-1",
      adSetId: "ad-set-1",
      adId: "ad-1",
      creativeId: "creative-1",
    },
    cacheHints: {
      cacheable: false,
      maxAgeSeconds: null,
      cacheKey: null,
    },
    expiresAt: "2026-07-22T13:00:00.000Z",
    productionEnabled: false,
    ...overrides,
  };
}

describe("Ads Render Descriptor Contracts V1", () => {
  it("accepts a valid descriptor", () => {
    const result = validateAdsRenderDescriptor(baseDescriptor(), {
      nowMs: NOW_MS,
    });
    expect(result).toEqual({ valid: true });
  });

  it("builds an immutable descriptor with productionEnabled false", () => {
    const outcome = buildAdsRenderDescriptor(baseDescriptor(), {
      nowMs: NOW_MS,
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.descriptor.productionEnabled).toBe(false);
    expect(outcome.descriptor.descriptorVersion).toBe(
      ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION
    );
    expect(Object.isFrozen(outcome.descriptor)).toBe(true);
    expect(Object.isFrozen(outcome.descriptor.disclosure)).toBe(true);
    expect(Object.isFrozen(outcome.descriptor.reportingHandles)).toBe(true);
    expect(Object.isFrozen(outcome.descriptor.trackingReferences)).toBe(true);
    expect(Object.isFrozen(outcome.descriptor.cacheHints)).toBe(true);
  });

  it("rejects invalid placements", () => {
    const result = validateAdsRenderDescriptor(
      baseDescriptor({ placementId: "NOT_A_PLACEMENT" }),
      { nowMs: NOW_MS }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("placementId"))
      ).toBe(true);
    }
  });

  it("rejects unsupported creative types", () => {
    const result = validateAdsRenderDescriptor(
      baseDescriptor({ creativeType: "story" }),
      { nowMs: NOW_MS }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("creativeType"))
      ).toBe(true);
    }
  });

  it("rejects creative types incompatible with the placement", () => {
    const result = validateAdsRenderDescriptor(
      baseDescriptor({
        placementId: "WATCH_FEED",
        creativeType: "text",
      }),
      { nowMs: NOW_MS }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) =>
          issue.includes("not supported by placement")
        )
      ).toBe(true);
    }
  });

  it("rejects duplicate impression and click handles", () => {
    const result = validateAdsRenderDescriptor(
      baseDescriptor({
        reportingHandles: {
          impressionHandle: "same-handle",
          clickHandle: "same-handle",
        },
      }),
      { nowMs: NOW_MS }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("duplicate handle"))
      ).toBe(true);
    }
  });

  it("rejects missing required fields", () => {
    const { mediaReference: _removed, ...incomplete } = baseDescriptor();
    const result = validateAdsRenderDescriptor(incomplete, { nowMs: NOW_MS });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("mediaReference"))
      ).toBe(true);
    }
  });

  it("rejects unknown top-level fields", () => {
    const result = validateAdsRenderDescriptor(
      baseDescriptor({ extraField: "nope" }),
      { nowMs: NOW_MS }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes('unknown field "extraField"'))
      ).toBe(true);
    }
  });

  it("rejects prohibited URL-bearing field names", () => {
    const result = validateAdsRenderDescriptor(
      baseDescriptor({ signedUrl: "https://example.com/asset" }),
      { nowMs: NOW_MS }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("signedUrl"))
      ).toBe(true);
    }
  });

  it("rejects URL values in opaque reference fields", () => {
    const result = validateAdsRenderDescriptor(
      baseDescriptor({
        mediaReference: "https://cdn.example.com/video.mp4",
        clickDestinationReference: "https://example.com/landing",
      }),
      { nowMs: NOW_MS }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("mediaReference"))
      ).toBe(true);
      expect(
        result.issues.some((issue) =>
          issue.includes("clickDestinationReference")
        )
      ).toBe(true);
    }
  });

  it("rejects invalid disclosure metadata", () => {
    const badLabel = validateAdsRenderDescriptor(
      baseDescriptor({
        disclosure: { label: "Promo", mustDisplay: true },
      }),
      { nowMs: NOW_MS }
    );
    expect(badLabel.valid).toBe(false);
    if (!badLabel.valid) {
      expect(
        badLabel.issues.some((issue) => issue.includes("disclosure.label"))
      ).toBe(true);
    }

    const notRequired = validateAdsRenderDescriptor(
      baseDescriptor({
        disclosure: { label: "Ad", mustDisplay: false },
      }),
      { nowMs: NOW_MS }
    );
    expect(notRequired.valid).toBe(false);
    if (!notRequired.valid) {
      expect(
        notRequired.issues.some((issue) =>
          issue.includes("disclosure.mustDisplay")
        )
      ).toBe(true);
    }
  });

  it("rejects invalid expiration timestamps", () => {
    const malformed = validateAdsRenderDescriptor(
      baseDescriptor({ expiresAt: "not-a-timestamp" }),
      { nowMs: NOW_MS }
    );
    expect(malformed.valid).toBe(false);
    if (!malformed.valid) {
      expect(
        malformed.issues.some((issue) => issue.includes("expiresAt"))
      ).toBe(true);
    }

    const expired = validateAdsRenderDescriptor(
      baseDescriptor({ expiresAt: "2026-07-22T11:00:00.000Z" }),
      { nowMs: NOW_MS }
    );
    expect(expired.valid).toBe(false);
    if (!expired.valid) {
      expect(
        expired.issues.some((issue) => issue.includes("expired"))
      ).toBe(true);
    }
  });

  it("rejects productionEnabled true", () => {
    const result = validateAdsRenderDescriptor(
      baseDescriptor({ productionEnabled: true }),
      { nowMs: NOW_MS }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("productionEnabled"))
      ).toBe(true);
    }
  });

  it("always forces productionEnabled false when building", () => {
    const outcome = buildAdsRenderDescriptor(
      baseDescriptor({ productionEnabled: true }),
      { nowMs: NOW_MS }
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.descriptor.productionEnabled).toBe(false);
  });

  it("keeps descriptors immutable after freeze", () => {
    const outcome = buildAdsRenderDescriptor(baseDescriptor(), {
      nowMs: NOW_MS,
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }

    const frozen = freezeAdsRenderDescriptor(outcome.descriptor);
    expect(() => {
      (frozen as { creativeReference: string }).creativeReference = "mutated";
    }).toThrow();
    expect(() => {
      (frozen.disclosure as { label: string }).label = "Ad";
    }).toThrow();
    expect(() => {
      (frozen.reportingHandles as { impressionHandle: string }).impressionHandle =
        "mutated";
    }).toThrow();
  });

  it("produces deterministic output for identical inputs", () => {
    const input = baseDescriptor({
      cacheHints: {
        cacheable: true,
        maxAgeSeconds: 60,
        cacheKey: "cache-key-1",
      },
    });

    const first = buildAdsRenderDescriptor(input, { nowMs: NOW_MS });
    const second = buildAdsRenderDescriptor(input, { nowMs: NOW_MS });
    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    if (!first.valid || !second.valid) {
      return;
    }
    expect(JSON.stringify(first.descriptor)).toBe(
      JSON.stringify(second.descriptor)
    );
    expect(first.descriptor).toEqual(second.descriptor);
  });

  it("accepts null thumbnailReference and cacheable cache hints", () => {
    const result = validateAdsRenderDescriptor(
      baseDescriptor({
        thumbnailReference: null,
        cacheHints: {
          cacheable: true,
          maxAgeSeconds: 120,
          cacheKey: "opaque-cache-key",
        },
      }),
      { nowMs: NOW_MS }
    );
    expect(result).toEqual({ valid: true });
  });

  it("rejects inconsistent cache hints", () => {
    const tooOld = validateAdsRenderDescriptor(
      baseDescriptor({
        cacheHints: {
          cacheable: true,
          maxAgeSeconds: ADS_RENDER_DESCRIPTOR_MAX_CACHE_AGE_SECONDS + 1,
          cacheKey: "cache-key",
        },
      }),
      { nowMs: NOW_MS }
    );
    expect(tooOld.valid).toBe(false);

    const notCacheableWithKey = validateAdsRenderDescriptor(
      baseDescriptor({
        cacheHints: {
          cacheable: false,
          maxAgeSeconds: 10,
          cacheKey: "should-be-null",
        },
      }),
      { nowMs: NOW_MS }
    );
    expect(notCacheableWithKey.valid).toBe(false);
  });

  it("rejects oversized opaque references", () => {
    const oversized = "x".repeat(ADS_RENDER_DESCRIPTOR_MAX_ID_LENGTH + 1);
    const result = validateAdsRenderDescriptor(
      baseDescriptor({ creativeReference: oversized }),
      { nowMs: NOW_MS }
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("creativeReference"))
      ).toBe(true);
    }
  });

  it("exposes helper APIs for labels, fields, and type guards", () => {
    expect(listAdsRenderDisclosureLabels()).toEqual(["Sponsored", "Ad"]);
    expect(listAdsRenderDescriptorRequiredFields()).toContain(
      "reportingHandles"
    );
    expect(listAdsRenderDescriptorRequiredFields()).toContain("expiresAt");
    expect(isAdsRenderDisclosureLabel("Sponsored")).toBe(true);
    expect(isAdsRenderDisclosureLabel("Promo")).toBe(false);
    expect(isAdsRenderDescriptorCreativeType("video")).toBe(true);
    expect(isAdsRenderDescriptorCreativeType("story")).toBe(false);
    expect(looksLikeAdsRenderUrl("https://example.com")).toBe(true);
    expect(looksLikeAdsRenderUrl("media-ref-opaque")).toBe(false);
  });

  it("rejects malformed non-object descriptors", () => {
    expect(validateAdsRenderDescriptor(null)).toEqual({
      valid: false,
      issues: ["Render descriptor must be an object."],
    });
    expect(buildAdsRenderDescriptor("nope").valid).toBe(false);
  });

  it("preserves reporting and tracking contract surfaces on a valid build", () => {
    const outcome = buildAdsRenderDescriptor(baseDescriptor(), {
      nowMs: NOW_MS,
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    const descriptor: AdsRenderDescriptor = outcome.descriptor;
    expect(descriptor.reportingHandles.impressionHandle).toBe("imp-handle-1");
    expect(descriptor.reportingHandles.clickHandle).toBe("clk-handle-1");
    expect(descriptor.trackingReferences).toEqual({
      campaignId: "campaign-1",
      adSetId: "ad-set-1",
      adId: "ad-1",
      creativeId: "creative-1",
    });
    expect(descriptor.disclosure).toEqual({
      label: "Sponsored",
      mustDisplay: true,
    });
  });
});
