import {
  hasReferralClaimSignal,
  resolveClaimReferralCode,
  shouldClearReferralAttributionCookie,
  type ReferralClaimRpcResult,
} from "./claimPolicy";
import { normalizeReferralCode } from "./config";

export type ReferralClaimSource =
  | "signup"
  | "login"
  | "auth_callback"
  | "session"
  | "action";

export type ReferralClaimCoordinatorResult = {
  status:
    | "skipped_no_attribution"
    | "auth_required"
    | "claimed"
    | "final"
    | "retryable";
  reason?: string;
  pointsAwarded?: number;
  clearedLocalState: boolean;
  source: ReferralClaimSource;
};

export type ReferralClaimCoordinatorDeps = {
  getUser: () => Promise<{ id: string } | null>;
  readCookieCode: () => Promise<string | null>;
  readVisitor: () => Promise<string | null>;
  claim: (input: {
    code: string | null;
    anonymousVisitorId: string | null;
    ipHash: string | null;
    userAgentHash: string | null;
  }) => Promise<ReferralClaimRpcResult>;
  clearCookie: () => Promise<void>;
  readSignals: () => Promise<{
    ipHash: string | null;
    userAgentHash: string | null;
  }>;
  log: (event: Record<string, unknown>) => void;
};

/**
 * Pure coordinator body (injectable deps). Used by the server wrapper and tests.
 * Never accepts client-chosen points, recipient, reason, or dedupe key.
 */
export async function runReferralClaimCoordinatorWithDeps(
  deps: ReferralClaimCoordinatorDeps,
  options: {
    source?: ReferralClaimSource;
    preferredCode?: string | null;
  } = {}
): Promise<ReferralClaimCoordinatorResult> {
  const source = options.source ?? "action";

  const user = await deps.getUser();
  if (!user) {
    return {
      status: "auth_required",
      reason: "auth_required",
      clearedLocalState: false,
      source,
    };
  }

  const cookieCode = await deps.readCookieCode();
  const preferred = normalizeReferralCode(options.preferredCode ?? null);
  const code = normalizeReferralCode(
    resolveClaimReferralCode({
      cookieCode,
      preferredCode: preferred,
    })
  );
  const visitorId = await deps.readVisitor();

  if (!hasReferralClaimSignal({ code, visitorId })) {
    return {
      status: "skipped_no_attribution",
      reason: "no_pending_attribution",
      clearedLocalState: false,
      source,
    };
  }

  const signals = await deps.readSignals();

  let rpc: ReferralClaimRpcResult;
  try {
    rpc = await deps.claim({
      code,
      anonymousVisitorId: visitorId,
      ipHash: signals.ipHash,
      userAgentHash: signals.userAgentHash,
    });
  } catch (error) {
    deps.log({
      source,
      userIdPrefix: user.id.slice(0, 8),
      outcome: "retryable",
      reason: "claim_threw",
      errorName: error instanceof Error ? error.name : "Error",
    });
    return {
      status: "retryable",
      reason: "claim_threw",
      clearedLocalState: false,
      source,
    };
  }

  const clear = shouldClearReferralAttributionCookie(rpc);
  if (clear) {
    try {
      await deps.clearCookie();
    } catch (error) {
      deps.log({
        source,
        userIdPrefix: user.id.slice(0, 8),
        outcome: "cookie_clear_failed",
        reason: rpc.reason ?? (rpc.ok ? "rewarded" : "unknown"),
        errorName: error instanceof Error ? error.name : "Error",
      });
    }
  }

  const reason = rpc.reason ?? (rpc.ok ? "rewarded" : "unknown");
  deps.log({
    source,
    userIdPrefix: user.id.slice(0, 8),
    outcome: rpc.ok ? "claimed" : clear ? "final" : "retryable",
    reason,
    clearedLocalState: clear,
    pointsAwarded: rpc.pointsAwarded ?? 0,
    hadCookieCode: Boolean(cookieCode),
    hadVisitor: Boolean(visitorId),
  });

  if (rpc.ok) {
    return {
      status: "claimed",
      reason,
      pointsAwarded: rpc.pointsAwarded,
      clearedLocalState: clear,
      source,
    };
  }

  return {
    status: clear ? "final" : "retryable",
    reason,
    pointsAwarded: rpc.pointsAwarded,
    clearedLocalState: clear,
    source,
  };
}
