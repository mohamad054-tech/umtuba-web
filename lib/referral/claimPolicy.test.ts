import { describe, expect, it } from "vitest";
import {
  decideReferralCookieClearance,
  hasReferralClaimSignal,
  isRetryableReferralClaim,
  resolveClaimReferralCode,
  shouldClearReferralAttributionCookie,
} from "./claimPolicy";

describe("referral claim cookie clearance", () => {
  it("clears after successful claim", () => {
    expect(
      shouldClearReferralAttributionCookie({ ok: true, reason: "rewarded" })
    ).toBe(true);
    expect(decideReferralCookieClearance({ ok: true })).toBe("clear_local");
  });

  it("clears on final invalid outcomes", () => {
    for (const reason of [
      "already_converted",
      "skipped_self",
      "skipped_inactive",
      "skipped_rate_limit",
      "unknown_code",
      "invalid_code",
      "not_eligible_existing_account",
      "no_pending_attribution",
    ]) {
      expect(
        shouldClearReferralAttributionCookie({ ok: false, reason })
      ).toBe(true);
    }
  });

  it("keeps cookie on transient failures", () => {
    expect(
      shouldClearReferralAttributionCookie({ ok: false, reason: "rpc_error" })
    ).toBe(false);
    expect(
      shouldClearReferralAttributionCookie({ ok: false, reason: "claim_threw" })
    ).toBe(false);
    expect(isRetryableReferralClaim({ ok: false, reason: "rpc_error" })).toBe(
      true
    );
  });
});

describe("resolveClaimReferralCode", () => {
  it("prefers first-touch cookie over preferred/query code", () => {
    expect(
      resolveClaimReferralCode({
        cookieCode: "AAAAAA",
        preferredCode: "BBBBBB",
      })
    ).toBe("AAAAAA");
  });

  it("falls back to preferred when cookie missing", () => {
    expect(
      resolveClaimReferralCode({
        cookieCode: null,
        preferredCode: "cccccc",
      })
    ).toBe("CCCCCC");
  });
});

describe("hasReferralClaimSignal", () => {
  it("requires code or visitor", () => {
    expect(hasReferralClaimSignal({ code: null, visitorId: null })).toBe(false);
    expect(hasReferralClaimSignal({ code: "AAAAAA", visitorId: null })).toBe(
      true
    );
    expect(hasReferralClaimSignal({ code: null, visitorId: "abc12345" })).toBe(
      true
    );
  });
});
