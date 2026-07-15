import { describe, expect, it, vi } from "vitest";
import {
  runReferralClaimCoordinatorWithDeps,
  type ReferralClaimCoordinatorDeps,
} from "./claimCoordinatorCore";

function makeDeps(
  overrides: Partial<ReferralClaimCoordinatorDeps> = {}
): ReferralClaimCoordinatorDeps {
  return {
    getUser: async () => ({ id: "11111111-1111-1111-1111-111111111111" }),
    readCookieCode: async () => "INVITE1",
    readVisitor: async () => "visitorabcdefgh",
    claim: async () => ({ ok: true, reason: "rewarded", pointsAwarded: 20 }),
    clearCookie: async () => {},
    readSignals: async () => ({ ipHash: "iphash", userAgentHash: "uahash" }),
    log: () => {},
    ...overrides,
  };
}

describe("runReferralClaimCoordinator", () => {
  it("immediate signup claim succeeds and clears local state", async () => {
    const clearCookie = vi.fn(async () => {});
    const claim = vi.fn(async () => ({
      ok: true,
      reason: "rewarded",
      pointsAwarded: 20,
    }));

    const result = await runReferralClaimCoordinatorWithDeps(
      makeDeps({ clearCookie, claim }),
      { source: "signup" }
    );

    expect(result.status).toBe("claimed");
    expect(result.pointsAwarded).toBe(20);
    expect(result.clearedLocalState).toBe(true);
    expect(clearCookie).toHaveBeenCalledOnce();
    expect(claim).toHaveBeenCalledWith({
      code: "INVITE1",
      anonymousVisitorId: "visitorabcdefgh",
      ipHash: "iphash",
      userAgentHash: "uahash",
    });
    // Claim input must not accept client-chosen reward fields.
    const payload = JSON.stringify(claim.mock.calls[0]);
    expect(payload).not.toMatch(/"points"/);
    expect(payload).not.toMatch(/dedupe/i);
    expect(payload).not.toMatch(/recipient/i);
  });

  it("email-confirmed-later claim succeeds on first authenticated session", async () => {
    const result = await runReferralClaimCoordinatorWithDeps(makeDeps(), {
      source: "auth_callback",
    });
    expect(result.status).toBe("claimed");
    expect(result.source).toBe("auth_callback");
  });

  it("login-later claim succeeds", async () => {
    const result = await runReferralClaimCoordinatorWithDeps(makeDeps(), {
      source: "login",
    });
    expect(result.status).toBe("claimed");
  });

  it("repeated attempts do not double-award and clear on already_converted", async () => {
    const clearCookie = vi.fn(async () => {});
    const claim = vi.fn(async () => ({
      ok: false,
      reason: "already_converted",
    }));

    const result = await runReferralClaimCoordinatorWithDeps(
      makeDeps({ clearCookie, claim }),
      { source: "session" }
    );

    expect(result.status).toBe("final");
    expect(result.reason).toBe("already_converted");
    expect(result.clearedLocalState).toBe(true);
    expect(clearCookie).toHaveBeenCalledOnce();
  });

  it("existing account invite does not claim signup reward", async () => {
    const clearCookie = vi.fn(async () => {});
    const result = await runReferralClaimCoordinatorWithDeps(
      makeDeps({
        clearCookie,
        claim: async () => ({
          ok: false,
          reason: "not_eligible_existing_account",
        }),
      }),
      { source: "login" }
    );
    expect(result.status).toBe("final");
    expect(result.clearedLocalState).toBe(true);
  });

  it("self-referral is rejected as final", async () => {
    const result = await runReferralClaimCoordinatorWithDeps(
      makeDeps({
        claim: async () => ({ ok: false, reason: "skipped_self" }),
      })
    );
    expect(result.status).toBe("final");
    expect(result.clearedLocalState).toBe(true);
  });

  it("invalid code is handled safely", async () => {
    const result = await runReferralClaimCoordinatorWithDeps(
      makeDeps({
        readCookieCode: async () => "BAD!!!",
        claim: async () => ({ ok: false, reason: "invalid_code" }),
      }),
      { preferredCode: "!!!" }
    );
    expect(result.status).toBe("final");
    expect(result.reason).toBe("invalid_code");
  });

  it("missing cookie/state does nothing", async () => {
    const claim = vi.fn();
    const result = await runReferralClaimCoordinatorWithDeps(
      makeDeps({
        readCookieCode: async () => null,
        readVisitor: async () => null,
        claim,
      })
    );
    expect(result.status).toBe("skipped_no_attribution");
    expect(claim).not.toHaveBeenCalled();
    expect(result.clearedLocalState).toBe(false);
  });

  it("visitor-only attribution still attempts claim after cookie loss", async () => {
    const claim = vi.fn(async () => ({
      ok: true,
      reason: "rewarded",
      pointsAwarded: 20,
    }));
    const result = await runReferralClaimCoordinatorWithDeps(
      makeDeps({
        readCookieCode: async () => null,
        readVisitor: async () => "visitoronly123",
        claim,
      }),
      { source: "login" }
    );
    expect(claim).toHaveBeenCalledWith(
      expect.objectContaining({
        code: null,
        anonymousVisitorId: "visitoronly123",
      })
    );
    expect(result.status).toBe("claimed");
  });

  it("transient failure remains retryable and keeps cookie", async () => {
    const clearCookie = vi.fn(async () => {});
    const result = await runReferralClaimCoordinatorWithDeps(
      makeDeps({
        clearCookie,
        claim: async () => ({ ok: false, reason: "rpc_error" }),
      })
    );
    expect(result.status).toBe("retryable");
    expect(result.clearedLocalState).toBe(false);
    expect(clearCookie).not.toHaveBeenCalled();
  });

  it("thrown claim stays retryable", async () => {
    const clearCookie = vi.fn(async () => {});
    const result = await runReferralClaimCoordinatorWithDeps(
      makeDeps({
        clearCookie,
        claim: async () => {
          throw new Error("network");
        },
      })
    );
    expect(result.status).toBe("retryable");
    expect(clearCookie).not.toHaveBeenCalled();
  });

  it("auth required when no session", async () => {
    const result = await runReferralClaimCoordinatorWithDeps(
      makeDeps({ getUser: async () => null })
    );
    expect(result.status).toBe("auth_required");
  });

  it("prefers cookie code over preferredCode (single inviter)", async () => {
    const claim = vi.fn(async () => ({ ok: true, reason: "rewarded" }));
    await runReferralClaimCoordinatorWithDeps(
      makeDeps({
        readCookieCode: async () => "FIRST1A",
        claim,
      }),
      { preferredCode: "SECOND1" }
    );
    expect(claim).toHaveBeenCalledWith(
      expect.objectContaining({ code: "FIRST1A" })
    );
  });
});
