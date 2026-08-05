"use server";

/**
 * Admin Live Payout server actions (Slice S5).
 * Platform-admin only. Routes booking through S4 orchestrator.
 * Never posts UEOS or calls payout foundation RPCs from this boundary.
 */

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { assertPlatformAdminDb } from "../../lib/store/adminAuth";
import {
  assertSellerLivePayoutProviderAllowed,
  orchestrateSellerLivePayoutResolveAttestation,
  parseSellerLivePayoutExecution,
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
} from "../../lib/store/sellerLivePayout";
import {
  assertNoSensitiveActionPayload,
  createLivePayoutServiceRoleClient,
  projectSafeExecution,
  projectSafeOrchestratorResult,
  rejectClientLivePayoutActionFields,
  type SellerLivePayoutActionFailure,
  type SafeLivePayoutExecutionView,
} from "../../lib/store/sellerLivePayout/actionSupport";
import { APP_ROUTES } from "../lib/nav";

const ADMIN_LIST_RPC = "admin_list_store_live_payout_executions";
const ADMIN_ATTEST_RPC = "admin_attest_store_live_payout_execution";

function revalidateAdminPayoutSurfaces() {
  revalidatePath(APP_ROUTES.adminStore);
  revalidatePath(APP_ROUTES.seller);
}

async function requirePlatformAdminAction(): Promise<
  | { ok: true; userId: string; supabase: Awaited<ReturnType<typeof createClient>> }
  | SellerLivePayoutActionFailure
> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "Sign in required.",
      requiresAuth: true,
      code: "unauthenticated",
    };
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    return {
      ok: false,
      message: "Platform admin access is required.",
      code: "forbidden",
    };
  }
  return { ok: true, userId: user.id, supabase };
}

export type AdminListLivePayoutExecutionsInput = {
  status?: string | null;
  storeId?: string | null;
  limit?: number | null;
};

export async function adminListLivePayoutExecutionsAction(
  input: AdminListLivePayoutExecutionsInput = {}
) {
  const bag = { ...(input as Record<string, unknown>) };
  const money = rejectClientLivePayoutActionFields(bag);
  if (!money.ok) return { ok: false as const, message: money.message };

  const auth = await requirePlatformAdminAction();
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabase.rpc(ADMIN_LIST_RPC, {
    p_status: input.status ?? null,
    p_store_id: input.storeId ?? null,
    p_limit: input.limit ?? 50,
  });
  if (error) {
    return {
      ok: false as const,
      message: "Unable to list live payout executions.",
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  const itemsRaw = Array.isArray(payload.executions) ? payload.executions : [];
  const executions: SafeLivePayoutExecutionView[] = [];
  for (const item of itemsRaw) {
    const parsed = parseSellerLivePayoutExecution(item);
    if (!parsed) {
      return {
        ok: false as const,
        message: "Execution list contains an unsafe item.",
      };
    }
    executions.push(projectSafeExecution(parsed));
  }

  const safe = {
    ok: true as const,
    executions,
    limit: typeof payload.limit === "number" ? payload.limit : executions.length,
  };
  if (!assertNoSensitiveActionPayload(safe)) {
    return { ok: false as const, message: "Execution list response is unsafe." };
  }
  return safe;
}

export type AdminAttestManualLivePayoutInput = {
  storeId: string;
  paymentAttemptId: string;
  executionId: string;
  orchestrationKey: string;
  decision: "succeeded" | "failed";
  attestationRef: string;
  note?: string | null;
};

/**
 * Persist admin attestation (no UEOS), then resolve via S4 orchestrator
 * (confirm or fail booking). Booking RPCs stay inside the orchestrator.
 */
export async function adminAttestManualLivePayoutAction(
  input: AdminAttestManualLivePayoutInput
) {
  const bag = { ...(input as Record<string, unknown>) };
  const money = rejectClientLivePayoutActionFields(bag);
  if (!money.ok) return { ok: false as const, message: money.message };

  if (input.decision !== "succeeded" && input.decision !== "failed") {
    return { ok: false as const, message: "Attestation decision is invalid." };
  }

  const auth = await requirePlatformAdminAction();
  if (!auth.ok) return auth;

  try {
    assertSellerLivePayoutProviderAllowed(SELLER_LIVE_PAYOUT_V1_PROVIDER_ID);
  } catch {
    return {
      ok: false as const,
      message: "Selected payout provider is not allowed.",
      code: "provider_forbidden",
    };
  }

  // S2 attestation RPC — durable ops record only (no UEOS / booking).
  const { error: attestError } = await auth.supabase.rpc(ADMIN_ATTEST_RPC, {
    p_execution_id: input.executionId,
    p_decision: input.decision,
    p_attestation_ref: input.attestationRef,
    p_note: input.note ?? null,
  });
  if (attestError) {
    return {
      ok: false as const,
      message: "Unable to record live payout attestation.",
    };
  }

  const service = createLivePayoutServiceRoleClient();
  if (!service.ok) {
    return { ok: false as const, message: service.message };
  }

  const orchestrated = await orchestrateSellerLivePayoutResolveAttestation(
    service.supabase,
    {
      storeId: input.storeId,
      paymentAttemptId: input.paymentAttemptId,
      orchestrationKey: input.orchestrationKey,
      executionId: input.executionId,
      decision: input.decision,
      attestationRef: input.attestationRef,
    }
  );

  const safe = projectSafeOrchestratorResult(orchestrated);
  if (!assertNoSensitiveActionPayload(safe)) {
    return { ok: false as const, message: "Attestation response is unsafe." };
  }
  if (safe.ok) {
    revalidateAdminPayoutSurfaces();
  }
  return safe;
}

export type AdminFailLivePayoutInput = {
  storeId: string;
  paymentAttemptId: string;
  executionId: string;
  orchestrationKey: string;
  attestationRef?: string;
  note?: string | null;
};

/**
 * Admin fail path — routes through S4 orchestrator resolve(failed).
 * Does not call payout foundation RPCs from this boundary.
 */
export async function adminFailLivePayoutAction(input: AdminFailLivePayoutInput) {
  const bag = { ...(input as Record<string, unknown>) };
  const money = rejectClientLivePayoutActionFields(bag);
  if (!money.ok) return { ok: false as const, message: money.message };

  const auth = await requirePlatformAdminAction();
  if (!auth.ok) return auth;

  try {
    assertSellerLivePayoutProviderAllowed(SELLER_LIVE_PAYOUT_V1_PROVIDER_ID);
  } catch {
    return {
      ok: false as const,
      message: "Selected payout provider is not allowed.",
      code: "provider_forbidden",
    };
  }

  const service = createLivePayoutServiceRoleClient();
  if (!service.ok) {
    return { ok: false as const, message: service.message };
  }

  const orchestrated = await orchestrateSellerLivePayoutResolveAttestation(
    service.supabase,
    {
      storeId: input.storeId,
      paymentAttemptId: input.paymentAttemptId,
      orchestrationKey: input.orchestrationKey,
      executionId: input.executionId,
      decision: "failed",
      attestationRef: input.attestationRef ?? "admin-fail",
    }
  );

  const safe = projectSafeOrchestratorResult(orchestrated);
  if (!assertNoSensitiveActionPayload(safe)) {
    return { ok: false as const, message: "Fail response is unsafe." };
  }
  if (safe.ok) {
    revalidateAdminPayoutSurfaces();
  }
  return safe;
}
