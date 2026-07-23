import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_REPORTING_HANDLE_VERSION,
  freezeAdsReportingHandlePayload,
  type AdsReportingHandleBindings,
  type AdsReportingHandlePayload,
} from "./reportingHandle";
import {
  ADS_REPORTING_HANDLE_RESOLUTION_CONTRACT_VERSION,
  ADS_REPORTING_HANDLE_RESOLUTION_INPUT_ALLOWED_FIELDS,
  ADS_REPORTING_HANDLE_RESOLUTION_STAGES,
  resolveAdsReportingHandle,
  validateAdsReportingHandleResolutionResult,
} from "./reportingHandleResolution";

const SOURCE = readFileSync(
  path.join(__dirname, "reportingHandleResolution.ts"),
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
  overrides: Partial<AdsReportingHandlePayload> &
    Record<string, unknown> = {}
): AdsReportingHandlePayload {
  return freezeAdsReportingHandlePayload({
    version: ADS_REPORTING_HANDLE_VERSION,
    handleId: "handle-opaque-1",
    eventPermissions: ["impression", "qualified_view", "click"],
    bindings: baseBindings(),
    lifecycleState: "active",
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
    keyId: "key-placeholder-1",
    nonce: "nonce-placeholder-1",
    productionEnabled: false,
    ...overrides,
  } as AdsReportingHandlePayload);
}

describe("Ads Reporting Handle Resolution V1", () => {
  it("exposes contract version, stages, and allowed fields", () => {
    expect(ADS_REPORTING_HANDLE_RESOLUTION_CONTRACT_VERSION).toBe("v1");
    expect([...ADS_REPORTING_HANDLE_RESOLUTION_STAGES]).toEqual([
      "validate_reference",
      "lookup",
      "validate_payload",
      "authorize_event",
      "result",
    ]);
    expect([...ADS_REPORTING_HANDLE_RESOLUTION_INPUT_ALLOWED_FIELDS]).toEqual([
      "reportingHandle",
      "eventType",
      "currentTimestamp",
      "registry",
    ]);
  });

  it("resolves a valid impression handle from the registry", () => {
    const token = "arh_v1_opaque_token_imp_1";
    const payload = basePayload({
      eventPermissions: ["impression"],
    });
    const outcome = resolveAdsReportingHandle({
      reportingHandle: { version: ADS_REPORTING_HANDLE_VERSION, token },
      eventType: "impression",
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: [{ token, payload }],
    });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.handleResolved).toBe(true);
    expect(outcome.result.handleRejected).toBe(false);
    expect(outcome.result.resolutionStage).toBe("result");
    expect(outcome.result.token).toBe(token);
    expect(outcome.result.bindings).toEqual(payload.bindings);
    expect(outcome.result.eventType).toBe("impression");
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.resolutionEnabled).toBe(false);
    expect(validateAdsReportingHandleResolutionResult(outcome.result)).toEqual({
      valid: true,
    });
  });

  it("resolves qualified_view (viewability) and click permissions", () => {
    const token = "arh_v1_opaque_token_shared_1";
    const payload = basePayload();

    for (const eventType of ["qualified_view", "click"] as const) {
      const outcome = resolveAdsReportingHandle({
        reportingHandle: token,
        eventType,
        currentTimestamp: CURRENT_TIMESTAMP,
        registry: [{ token, payload }],
      });
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;
      expect(outcome.result.handleResolved).toBe(true);
      expect(outcome.result.eventType).toBe(eventType);
    }
  });

  it("rejects an unknown token at lookup", () => {
    const outcome = resolveAdsReportingHandle({
      reportingHandle: "arh_v1_unknown_token",
      eventType: "impression",
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: [
        {
          token: "arh_v1_other_token",
          payload: basePayload({ eventPermissions: ["impression"] }),
        },
      ],
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.handleRejected).toBe(true);
    expect(outcome.result.resolutionStage).toBe("lookup");
    expect(outcome.result.payload).toBeNull();
  });

  it("rejects expired / permission-mismatched handles at authorize_event", () => {
    const token = "arh_v1_opaque_token_auth_1";
    const expired = resolveAdsReportingHandle({
      reportingHandle: token,
      eventType: "impression",
      currentTimestamp: "2026-07-22T14:00:00.000Z",
      registry: [
        {
          token,
          payload: basePayload({
            eventPermissions: ["impression"],
            expiresAt: "2026-07-22T12:30:00.000Z",
          }),
        },
      ],
    });
    expect(expired.valid).toBe(true);
    if (!expired.valid) return;
    expect(expired.result.handleRejected).toBe(true);
    expect(expired.result.resolutionStage).toBe("authorize_event");

    const mismatch = resolveAdsReportingHandle({
      reportingHandle: token,
      eventType: "click",
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: [
        {
          token,
          payload: basePayload({ eventPermissions: ["impression"] }),
        },
      ],
    });
    expect(mismatch.valid).toBe(true);
    if (!mismatch.valid) return;
    expect(mismatch.result.handleRejected).toBe(true);
    expect(mismatch.result.resolutionStage).toBe("authorize_event");
  });

  it("rejects revoked, rotated, expired, and unresolved handles fail-closed", () => {
    const revokedToken = "arh_v1_opaque_token_revoked_1";
    const revoked = resolveAdsReportingHandle({
      reportingHandle: {
        version: ADS_REPORTING_HANDLE_VERSION,
        token: revokedToken,
      },
      eventType: "impression",
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: [
        {
          token: revokedToken,
          payload: basePayload({
            eventPermissions: ["impression"],
            lifecycleState: "revoked",
          }),
        },
      ],
    });
    expect(revoked.valid).toBe(true);
    if (!revoked.valid) return;
    expect(revoked.result.handleResolved).toBe(false);
    expect(revoked.result.handleRejected).toBe(true);
    expect(revoked.result.resolutionStage).toBe("authorize_event");
    expect(revoked.result.payload).toBeNull();
    expect(revoked.result.bindings).toBeNull();
    expect(revoked.result.productionEnabled).toBe(false);
    expect(revoked.result.resolutionEnabled).toBe(false);

    const rotatedToken = "arh_v1_opaque_token_rotated_1";
    const rotated = resolveAdsReportingHandle({
      reportingHandle: rotatedToken,
      eventType: "click",
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: [
        {
          token: rotatedToken,
          payload: basePayload({
            eventPermissions: ["click"],
            lifecycleState: "rotated",
          }),
        },
      ],
    });
    expect(rotated.valid).toBe(true);
    if (!rotated.valid) return;
    expect(rotated.result.handleRejected).toBe(true);
    expect(rotated.result.resolutionStage).toBe("authorize_event");
    expect(rotated.result.payload).toBeNull();
    expect(rotated.result.bindings).toBeNull();

    const expiredToken = "arh_v1_opaque_token_expired_hard_1";
    const expired = resolveAdsReportingHandle({
      reportingHandle: expiredToken,
      eventType: "qualified_view",
      currentTimestamp: "2026-07-22T14:00:00.000Z",
      registry: [
        {
          token: expiredToken,
          payload: basePayload({
            eventPermissions: ["qualified_view"],
            expiresAt: "2026-07-22T12:30:00.000Z",
          }),
        },
      ],
    });
    expect(expired.valid).toBe(true);
    if (!expired.valid) return;
    expect(expired.result.handleRejected).toBe(true);
    expect(expired.result.resolutionStage).toBe("authorize_event");
    expect(expired.result.payload).toBeNull();
    expect(expired.result.bindings).toBeNull();

    const unresolved = resolveAdsReportingHandle({
      reportingHandle: {
        version: ADS_REPORTING_HANDLE_VERSION,
        token: "arh_v1_unresolved_client_token",
      },
      eventType: "impression",
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: [
        {
          token: "arh_v1_different_registry_token",
          payload: basePayload({ eventPermissions: ["impression"] }),
        },
      ],
    });
    expect(unresolved.valid).toBe(true);
    if (!unresolved.valid) return;
    expect(unresolved.result.handleRejected).toBe(true);
    expect(unresolved.result.resolutionStage).toBe("lookup");
    expect(unresolved.result.token).toBe("arh_v1_unresolved_client_token");
    expect(unresolved.result.payload).toBeNull();
    expect(unresolved.result.bindings).toBeNull();
    // No client fallback: unresolved tokens never invent entity bindings.
    expect(unresolved.result.bindings).not.toEqual(
      expect.objectContaining({
        campaignRef: expect.any(String),
      })
    );
  });

  it("rejects malformed input and unknown fields", () => {
    expect(resolveAdsReportingHandle(null).valid).toBe(false);
    expect(resolveAdsReportingHandle({}).valid).toBe(false);
    expect(
      resolveAdsReportingHandle({
        reportingHandle: "arh_v1_token",
        eventType: "impression",
        currentTimestamp: CURRENT_TIMESTAMP,
        registry: [],
        decrypt: true,
      }).valid
    ).toBe(false);
  });

  it("is deterministic and immutable", () => {
    const token = "arh_v1_opaque_token_det_1";
    const input = {
      reportingHandle: { version: ADS_REPORTING_HANDLE_VERSION, token },
      eventType: "impression" as const,
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: [
        {
          token,
          payload: basePayload({ eventPermissions: ["impression"] }),
        },
      ],
    };
    const snapshot = structuredClone(input);
    const first = resolveAdsReportingHandle(input);
    const second = resolveAdsReportingHandle(input);
    expect(first.valid && second.valid).toBe(true);
    if (!first.valid || !second.valid) return;
    expect(first.result).toEqual(second.result);
    expect(Object.isFrozen(first.result)).toBe(true);
    expect(input).toEqual(snapshot);
  });

  it("has no storage, network, database, crypto, or product wiring", () => {
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
    expect(SOURCE).not.toMatch(
      /\bcreateCipher|\bcreateHmac|\bcreateSign|\bsubtle\b/i
    );
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/resolutionEnabled: false/);
    expect(SOURCE).toMatch(/resolveAdsReportingHandle/);
  });
});
