import { describe, expect, it } from "vitest";
import {
  isUgcReasonCode,
  mapUgcReportRpcError,
  normalizeReasonDetail,
  UGC_REASON_CODES,
} from "./ugcReport";
import { mapModerationRpcError, validateOperatorReason } from "./operatorActions";

describe("ugc report validation", () => {
  it("accepts the eight reason codes", () => {
    expect(UGC_REASON_CODES).toEqual([
      "spam",
      "harassment",
      "hate",
      "sexual",
      "violence",
      "illegal",
      "impersonation",
      "other",
    ]);
    expect(isUgcReasonCode("spam")).toBe(true);
    expect(isUgcReasonCode("phishing")).toBe(false);
  });

  it("trims optional detail and rejects overlong copy", () => {
    expect(normalizeReasonDetail("  hello  ")).toEqual({
      ok: true,
      detail: "hello",
    });
    expect(normalizeReasonDetail("   ")).toEqual({ ok: true, detail: null });
    expect(normalizeReasonDetail("x".repeat(1001)).ok).toBe(false);
  });

  it("maps report RPC errors to i18n keys", () => {
    expect(mapUgcReportRpcError("Authentication required")).toBe(
      "report.error.auth"
    );
    expect(mapUgcReportRpcError("Cannot report your own content")).toBe(
      "report.error.own"
    );
    expect(mapUgcReportRpcError("Already reported")).toBe("report.error.already");
    expect(mapUgcReportRpcError("boom")).toBe("report.error.generic");
  });

  it("requires an operator reason", () => {
    expect(validateOperatorReason("no").ok).toBe(false);
    expect(validateOperatorReason("Remove this spam post").ok).toBe(true);
    expect(mapModerationRpcError("Cannot moderate your own account")).toBe(
      "admin.moderation.error.own"
    );
    expect(mapModerationRpcError("Cannot moderate a platform admin")).toBe(
      "admin.moderation.error.adminTarget"
    );
    expect(mapModerationRpcError("Platform admin required")).toBe(
      "admin.moderation.error.forbidden"
    );
  });
});
