import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADS_DELIVERY_ENABLED } from "../constants";
import {
  ADS_PLACEMENT_REGISTRY,
  validateAdsPlacementRegistry,
} from "./placementRegistry";
import {
  ADS_REPORTING_HANDLE_CLOCK_SKEW_MS,
  ADS_REPORTING_HANDLE_EVENT_PERMISSIONS,
  ADS_REPORTING_HANDLE_LIFECYCLE_STATES,
  ADS_REPORTING_HANDLE_MAX_LIFETIME_MS,
  ADS_REPORTING_HANDLE_REPORTABLE_LIFECYCLE_STATES,
  ADS_REPORTING_HANDLE_ROTATION_OVERLAP_MS,
  ADS_REPORTING_HANDLE_VERSION,
  adsReportingHandleTokenLeaksEntityIds,
  buildAdsReportingHandleClientReference,
  buildAdsReportingHandlePayload,
  freezeAdsReportingHandlePayload,
  isAdsReportingHandleLifecycleReportable,
  listAdsReportingHandleEventPermissions,
  listAdsReportingHandleReportableLifecycleStates,
  validateAdsReportingHandleClientReference,
  validateAdsReportingHandleClientTokenBoundary,
  validateAdsReportingHandleForReporting,
  validateAdsReportingHandleOpaqueToken,
  validateAdsReportingHandlePayload,
  type AdsReportingHandleBindings,
  type AdsReportingHandlePayload,
} from "./reportingHandle";

const SOURCE = readFileSync(
  path.join(process.cwd(), "lib/ads/platform/reportingHandle.ts"),
  "utf8"
);

const CURRENT_TIMESTAMP = "2026-07-22T12:00:00.000Z";
const ISSUED_AT = "2026-07-22T11:30:00.000Z";
const EXPIRES_AT = "2026-07-22T12:30:00.000Z";

function baseBindings(
  overrides: Partial<AdsReportingHandleBindings> = {}
): AdsReportingHandleBindings {
  return {
    placementId: "WATCH_FEED",
    candidateRef: "candidate-ref-1",
    campaignRef: "campaign-ref-1",
    adSetRef: "ad-set-ref-1",
    creativeRef: "creative-ref-1",
    ...overrides,
  };
}

function basePayload(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    version: ADS_REPORTING_HANDLE_VERSION,
    handleId: "handle-opaque-1",
    eventPermissions: ["impression"],
    bindings: baseBindings(),
    lifecycleState: "active",
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
    keyId: "key-placeholder-1",
    nonce: "nonce-placeholder-1",
    productionEnabled: false,
    ...overrides,
  };
}

describe("Ads Reporting Handle Architecture V1", () => {
  it("accepts a valid qualified_view (viewability) permission", () => {
    const result = validateAdsReportingHandlePayload(
      basePayload({ eventPermissions: ["qualified_view"] })
    );
    expect(result).toEqual({ valid: true });

    const reportable = validateAdsReportingHandleForReporting(
      basePayload({ eventPermissions: ["qualified_view"] }),
      { currentTimestamp: CURRENT_TIMESTAMP, eventType: "qualified_view" }
    );
    expect(reportable).toEqual({ valid: true });
    expect([...ADS_REPORTING_HANDLE_EVENT_PERMISSIONS]).toEqual([
      "impression",
      "qualified_view",
      "click",
    ]);
  });

  it("accepts a valid impression-capable handle", () => {
    const result = validateAdsReportingHandlePayload(
      basePayload({ eventPermissions: ["impression"] })
    );
    expect(result).toEqual({ valid: true });

    const reportable = validateAdsReportingHandleForReporting(
      basePayload({ eventPermissions: ["impression"] }),
      { currentTimestamp: CURRENT_TIMESTAMP, eventType: "impression" }
    );
    expect(reportable).toEqual({ valid: true });
  });

  it("accepts a valid click-capable handle", () => {
    const result = validateAdsReportingHandlePayload(
      basePayload({ eventPermissions: ["click"] })
    );
    expect(result).toEqual({ valid: true });

    const reportable = validateAdsReportingHandleForReporting(
      basePayload({ eventPermissions: ["click"] }),
      { currentTimestamp: CURRENT_TIMESTAMP, eventType: "click" }
    );
    expect(reportable).toEqual({ valid: true });
  });

  it("accepts a both-event handle", () => {
    const payload = basePayload({
      eventPermissions: ["impression", "click"],
    });
    expect(validateAdsReportingHandlePayload(payload)).toEqual({ valid: true });
    expect(
      validateAdsReportingHandleForReporting(payload, {
        currentTimestamp: CURRENT_TIMESTAMP,
        eventType: "impression",
      })
    ).toEqual({ valid: true });
    expect(
      validateAdsReportingHandleForReporting(payload, {
        currentTimestamp: CURRENT_TIMESTAMP,
        eventType: "click",
      })
    ).toEqual({ valid: true });
  });

  it("rejects unsupported versions", () => {
    const result = validateAdsReportingHandlePayload(
      basePayload({ version: "v0" })
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("version"))).toBe(
        true
      );
    }
  });

  it("rejects missing bindings", () => {
    const { bindings: _bindings, ...withoutBindings } = basePayload();
    const result = validateAdsReportingHandlePayload(withoutBindings);
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("bindings"))).toBe(
        true
      );
    }

    const missingCandidate = validateAdsReportingHandlePayload(
      basePayload({
        bindings: {
          placementId: "WATCH_FEED",
          campaignRef: "campaign-ref-1",
          adSetRef: "ad-set-ref-1",
          creativeRef: "creative-ref-1",
        },
      })
    );
    expect(missingCandidate).toMatchObject({ valid: false });
    if (!missingCandidate.valid) {
      expect(
        missingCandidate.issues.some((issue) =>
          issue.includes("candidateRef")
        )
      ).toBe(true);
    }
  });

  it("rejects invalid placements", () => {
    expect(validateAdsPlacementRegistry()).toEqual([]);
    expect(ADS_PLACEMENT_REGISTRY.WATCH_FEED.id).toBe("WATCH_FEED");

    const result = validateAdsReportingHandlePayload(
      basePayload({
        bindings: baseBindings({ placementId: "stories" as never }),
      })
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("placementId"))
      ).toBe(true);
    }
  });

  it("rejects duplicate event permissions", () => {
    const result = validateAdsReportingHandlePayload(
      basePayload({ eventPermissions: ["impression", "impression"] })
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("duplicate"))).toBe(
        true
      );
    }
  });

  it("rejects unsupported event types", () => {
    const result = validateAdsReportingHandlePayload(
      basePayload({ eventPermissions: ["conversion"] })
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("supported event type"))
      ).toBe(true);
    }

    const permissionMismatch = validateAdsReportingHandleForReporting(
      basePayload({ eventPermissions: ["impression"] }),
      { currentTimestamp: CURRENT_TIMESTAMP, eventType: "click" }
    );
    expect(permissionMismatch).toMatchObject({ valid: false });
    if (!permissionMismatch.valid) {
      expect(
        permissionMismatch.issues.some((issue) =>
          issue.includes('does not permit event type "click"')
        )
      ).toBe(true);
    }
  });

  it("rejects expired handles for reporting", () => {
    const expiredByState = validateAdsReportingHandleForReporting(
      basePayload({ lifecycleState: "expired" }),
      { currentTimestamp: CURRENT_TIMESTAMP, eventType: "impression" }
    );
    expect(expiredByState).toMatchObject({ valid: false });
    if (!expiredByState.valid) {
      expect(
        expiredByState.issues.some((issue) =>
          issue.includes('lifecycleState "expired" is not reportable')
        )
      ).toBe(true);
    }

    const expiredByTime = validateAdsReportingHandleForReporting(
      basePayload({
        issuedAt: "2026-07-22T10:00:00.000Z",
        expiresAt: "2026-07-22T10:30:00.000Z",
        lifecycleState: "active",
      }),
      { currentTimestamp: CURRENT_TIMESTAMP, eventType: "impression" }
    );
    expect(expiredByTime).toMatchObject({ valid: false });
    if (!expiredByTime.valid) {
      expect(
        expiredByTime.issues.some((issue) => issue.includes("expired"))
      ).toBe(true);
    }
  });

  it("rejects revoked handles for reporting", () => {
    const result = validateAdsReportingHandleForReporting(
      basePayload({ lifecycleState: "revoked" }),
      { currentTimestamp: CURRENT_TIMESTAMP, eventType: "impression" }
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(
        result.issues.some((issue) =>
          issue.includes('lifecycleState "revoked" is not reportable')
        )
      ).toBe(true);
    }
  });

  it("defines rotated-state semantics as non-reportable with overlap placeholder", () => {
    expect(ADS_REPORTING_HANDLE_ROTATION_OVERLAP_MS).toBe(5 * 60 * 1000);
    expect(isAdsReportingHandleLifecycleReportable("rotated")).toBe(false);
    expect(ADS_REPORTING_HANDLE_REPORTABLE_LIFECYCLE_STATES).not.toContain(
      "rotated"
    );

    const result = validateAdsReportingHandleForReporting(
      basePayload({ lifecycleState: "rotated" }),
      { currentTimestamp: CURRENT_TIMESTAMP, eventType: "impression" }
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(
        result.issues.some((issue) =>
          issue.includes('lifecycleState "rotated" is not reportable')
        )
      ).toBe(true);
    }
  });

  it("rejects invalid issue/expiry ordering", () => {
    const result = validateAdsReportingHandlePayload(
      basePayload({
        issuedAt: "2026-07-22T12:30:00.000Z",
        expiresAt: "2026-07-22T12:00:00.000Z",
      })
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(
        result.issues.some((issue) =>
          issue.includes("expiresAt must be after issuedAt")
        )
      ).toBe(true);
    }
  });

  it("rejects excessive lifetime", () => {
    const issuedAt = "2026-07-22T10:00:00.000Z";
    const expiresAt = new Date(
      Date.parse(issuedAt) + ADS_REPORTING_HANDLE_MAX_LIFETIME_MS + 1
    ).toISOString();
    const result = validateAdsReportingHandlePayload(
      basePayload({ issuedAt, expiresAt })
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("lifetime exceeds max"))
      ).toBe(true);
    }
  });

  it("uses explicit currentTimestamp and has no system clock dependency", () => {
    expect(SOURCE).not.toMatch(/Date\.now|performance\.now|Math\.random/);

    const withinSkew = new Date(
      Date.parse(EXPIRES_AT) + ADS_REPORTING_HANDLE_CLOCK_SKEW_MS
    ).toISOString();
    expect(
      validateAdsReportingHandleForReporting(basePayload(), {
        currentTimestamp: withinSkew,
        eventType: "impression",
      })
    ).toEqual({ valid: true });

    const beyondSkew = new Date(
      Date.parse(EXPIRES_AT) + ADS_REPORTING_HANDLE_CLOCK_SKEW_MS + 1
    ).toISOString();
    const rejected = validateAdsReportingHandleForReporting(basePayload(), {
      currentTimestamp: beyondSkew,
      eventType: "impression",
    });
    expect(rejected).toMatchObject({ valid: false });

    const invalidClock = validateAdsReportingHandleForReporting(basePayload(), {
      currentTimestamp: "not-a-timestamp",
      eventType: "impression",
    });
    expect(invalidClock).toMatchObject({ valid: false });
    if (!invalidClock.valid) {
      expect(
        invalidClock.issues.some((issue) =>
          issue.includes("currentTimestamp")
        )
      ).toBe(true);
    }
  });

  it("produces deterministic immutable output", () => {
    const input = basePayload({
      eventPermissions: ["impression", "click"],
    });
    const first = buildAdsReportingHandlePayload(input);
    const second = buildAdsReportingHandlePayload(input);
    expect(first).toEqual(second);
    expect(first.valid).toBe(true);
    if (!first.valid || !second.valid) {
      return;
    }

    expect(Object.isFrozen(first.payload)).toBe(true);
    expect(Object.isFrozen(first.payload.bindings)).toBe(true);
    expect(Object.isFrozen(first.payload.eventPermissions)).toBe(true);
    expect(first.payload.productionEnabled).toBe(false);

    expect(() => {
      (first.payload as { handleId: string }).handleId = "mutated";
    }).toThrow();

    const frozen = freezeAdsReportingHandlePayload(
      first.payload as AdsReportingHandlePayload
    );
    expect(frozen).toEqual(first.payload);
  });

  it("keeps opaque client tokens from exposing entity ids", () => {
    const bindings = baseBindings();
    const safeToken = "arh_v1_opaque_token_9f3a";
    expect(adsReportingHandleTokenLeaksEntityIds(safeToken)).toBe(false);
    expect(
      validateAdsReportingHandleOpaqueToken(safeToken).valid
    ).toBe(true);
    expect(
      validateAdsReportingHandleClientTokenBoundary(safeToken, bindings)
    ).toEqual({ valid: true });

    const leakingToken = `arh_${bindings.campaignRef}_leak`;
    expect(
      validateAdsReportingHandleClientTokenBoundary(leakingToken, bindings)
    ).toMatchObject({ valid: false });

    const entityDump = validateAdsReportingHandleOpaqueToken(
      JSON.stringify({ campaignId: "campaign-1", adId: "ad-1" })
    );
    expect(entityDump).toMatchObject({ valid: false });

    const client = buildAdsReportingHandleClientReference(
      { version: ADS_REPORTING_HANDLE_VERSION, token: safeToken },
      bindings
    );
    expect(client.valid).toBe(true);
    if (client.valid) {
      expect(client.clientReference.token).toBe(safeToken);
      expect(client.clientReference.token).not.toContain(bindings.campaignRef);
      expect(client.clientReference.token).not.toContain(bindings.adSetRef);
      expect(client.clientReference.token).not.toContain(bindings.candidateRef);
      expect(client.clientReference.token).not.toContain(bindings.creativeRef);
      expect(Object.isFrozen(client.clientReference)).toBe(true);
    }

    expect(
      validateAdsReportingHandleClientReference({
        version: ADS_REPORTING_HANDLE_VERSION,
        token: safeToken,
        campaignId: "campaign-1",
      }).valid
    ).toBe(false);
  });

  it("forces productionEnabled to false and rejects non-false values", () => {
    expect(
      validateAdsReportingHandlePayload(
        basePayload({ productionEnabled: true })
      )
    ).toMatchObject({ valid: false });

    const built = buildAdsReportingHandlePayload(
      basePayload({ productionEnabled: true })
    );
    expect(built.valid).toBe(true);
    if (built.valid) {
      expect(built.payload.productionEnabled).toBe(false);
    }
  });

  it("rejects unknown fields, URL-like values, and unsafe metadata", () => {
    expect(
      validateAdsReportingHandlePayload(
        basePayload({ extraField: "nope" })
      )
    ).toMatchObject({ valid: false });

    expect(
      validateAdsReportingHandlePayload(
        basePayload({ handleId: "https://evil.example/handle" })
      )
    ).toMatchObject({ valid: false });

    expect(
      validateAdsReportingHandlePayload(
        basePayload({ metadata: { surface: "watch" } })
      )
    ).toMatchObject({ valid: false });

    expect(
      validateAdsReportingHandlePayload(
        basePayload({ advertiserAccountId: "adv-1" })
      )
    ).toMatchObject({ valid: false });

    expect(
      validateAdsReportingHandlePayload(
        basePayload({ lifecycleState: "pending" })
      )
    ).toMatchObject({ valid: false });
  });

  it("lists lifecycle and permission semantics", () => {
    expect(ADS_REPORTING_HANDLE_VERSION).toBe("v1");
    expect([...ADS_REPORTING_HANDLE_LIFECYCLE_STATES]).toEqual([
      "issued",
      "active",
      "expired",
      "revoked",
      "rotated",
    ]);
    expect([...listAdsReportingHandleReportableLifecycleStates()]).toEqual([
      "issued",
      "active",
    ]);
    expect([...listAdsReportingHandleEventPermissions()]).toEqual([
      ...ADS_REPORTING_HANDLE_EVENT_PERMISSIONS,
    ]);
    expect(isAdsReportingHandleLifecycleReportable("issued")).toBe(true);
    expect(isAdsReportingHandleLifecycleReportable("active")).toBe(true);
  });

  it("has no persistence, crypto, DB, network, or product imports", () => {
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\//);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*\/(watch|discover|live|store|world|messenger|games|learning|search|notifications)(\/|["'])/i
    );
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*supabase[^"']*["']|require\(["'][^"']*supabase|createClient\s*\(/i
    );
    expect(SOURCE).not.toMatch(/\bfetch\s*\(|\baxios\b/);
    expect(SOURCE).not.toMatch(
      /\bcreateCipher|\bcreateHmac|\bcreateSign|\bsubtle\b|\bcrypto\b|\bwebcrypto\b/i
    );
    expect(SOURCE).not.toMatch(
      /\.from\(|\.insert\(|\.upsert\(|saveHandle\s*\(|generateHandle\s*\(/i
    );
    expect(SOURCE).not.toMatch(/ADS_DELIVERY_ENABLED\s*=\s*true/);
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(ADS_DELIVERY_ENABLED).toBe(false);
    for (const placement of Object.values(ADS_PLACEMENT_REGISTRY)) {
      expect(placement.featureFlag.enabledByDefault).toBe(false);
      expect(placement.visibility).toBe("hidden");
    }
  });
});
