import "server-only";

import { headers } from "next/headers";
import { createClient, getServerUser } from "../supabase/server";
import { claimMyReferralSignup } from "../supabase/referral";
import {
  clearReferralAttributionCookie,
  hashReferralSignal,
  readReferralAttributionCookie,
  readVisitorId,
} from "./cookies";
import {
  runReferralClaimCoordinatorWithDeps,
  type ReferralClaimCoordinatorDeps,
  type ReferralClaimCoordinatorResult,
  type ReferralClaimSource,
} from "./claimCoordinatorCore";

export type {
  ReferralClaimCoordinatorDeps,
  ReferralClaimCoordinatorResult,
  ReferralClaimSource,
};

function defaultLog(event: Record<string, unknown>): void {
  console.info("[referral-claim]", JSON.stringify(event));
}

async function defaultReadSignals(): Promise<{
  ipHash: string | null;
  userAgentHash: string | null;
}> {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    null;
  const ua = hdrs.get("user-agent");
  return {
    ipHash: hashReferralSignal(ip),
    userAgentHash: hashReferralSignal(ua),
  };
}

export async function createDefaultReferralClaimDeps(): Promise<ReferralClaimCoordinatorDeps> {
  const supabase = await createClient();
  return {
    getUser: async () => {
      const user = await getServerUser();
      return user ? { id: user.id } : null;
    },
    readCookieCode: readReferralAttributionCookie,
    readVisitor: readVisitorId,
    claim: (input) => claimMyReferralSignup(supabase, input),
    clearCookie: clearReferralAttributionCookie,
    readSignals: defaultReadSignals,
    log: defaultLog,
  };
}

/**
 * Single reliable claim path for signup / callback / login / first session.
 * Never accepts client-chosen points, recipient, reason, or dedupe key.
 */
export async function runReferralClaimCoordinator(
  options: {
    source?: ReferralClaimSource;
    preferredCode?: string | null;
    deps?: ReferralClaimCoordinatorDeps;
  } = {}
): Promise<ReferralClaimCoordinatorResult> {
  const deps = options.deps ?? (await createDefaultReferralClaimDeps());
  return runReferralClaimCoordinatorWithDeps(deps, {
    source: options.source,
    preferredCode: options.preferredCode,
  });
}
