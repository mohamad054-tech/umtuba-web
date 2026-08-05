"use server";

/**
 * Seller Live Payout server actions (Slice S5).
 * Owner/manager only. No client money authority. No gate env mutation.
 */

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { getMembership } from "../../lib/store/sellerStore";
import { canManageStoreSettings } from "../../lib/store/permissions";
import {
  assertSellerLivePayoutProviderAllowed,
  listMyStorePayoutDestinations,
  orchestrateSellerLivePayoutSubmit,
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  upsertMyStorePayoutDestination,
  validateMaskedDestinationDisplayLabel,
} from "../../lib/store/sellerLivePayout";
import {
  assertNoSensitiveActionPayload,
  createLivePayoutServiceRoleClient,
  projectSafeDestination,
  projectSafeOrchestratorResult,
  rejectClientLivePayoutActionFields,
  type SellerLivePayoutActionFailure,
} from "../../lib/store/sellerLivePayout/actionSupport";
import { APP_ROUTES } from "../lib/nav";

function revalidateSellerPayoutSurfaces() {
  revalidatePath(APP_ROUTES.seller);
  revalidatePath(APP_ROUTES.sellerStore);
}

async function requireSellerOwnerOrManager(storeId: string): Promise<
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
  const role = await getMembership(supabase, storeId, user.id);
  if (!canManageStoreSettings(role)) {
    return {
      ok: false,
      message: "Only store owners or managers may manage live payouts.",
      code: "forbidden",
    };
  }
  return { ok: true, userId: user.id, supabase };
}

export type UpsertSellerPayoutDestinationActionInput = {
  storeId: string;
  currency: string;
  displayLabel: string;
  requestReview?: boolean;
  providerId?: string;
};

export async function upsertSellerPayoutDestinationAction(
  input: UpsertSellerPayoutDestinationActionInput
) {
  const bag = { ...(input as Record<string, unknown>) };
  const money = rejectClientLivePayoutActionFields(bag);
  if (!money.ok) return { ok: false as const, message: money.message };

  const auth = await requireSellerOwnerOrManager(input.storeId);
  if (!auth.ok) return auth;

  const label = validateMaskedDestinationDisplayLabel(input.displayLabel);
  if (!label.ok) {
    return { ok: false as const, message: label.message };
  }

  const providerId = input.providerId ?? SELLER_LIVE_PAYOUT_V1_PROVIDER_ID;
  try {
    assertSellerLivePayoutProviderAllowed(providerId);
  } catch {
    return {
      ok: false as const,
      message: "Selected payout provider is not allowed.",
      code: "provider_forbidden",
    };
  }

  const result = await upsertMyStorePayoutDestination(auth.supabase, {
    storeId: input.storeId,
    currency: input.currency,
    displayLabel: input.displayLabel,
    requestReview: Boolean(input.requestReview),
    providerId: SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  });
  if (!result.ok) {
    return { ok: false as const, message: result.message };
  }

  const safe = {
    ok: true as const,
    destination: projectSafeDestination(result.destination),
  };
  if (!assertNoSensitiveActionPayload(safe)) {
    return {
      ok: false as const,
      message: "Destination response is unsafe.",
    };
  }
  revalidateSellerPayoutSurfaces();
  return safe;
}

export async function listSellerPayoutDestinationsAction(storeId: string) {
  const money = rejectClientLivePayoutActionFields({ storeId });
  if (!money.ok) return { ok: false as const, message: money.message };

  const auth = await requireSellerOwnerOrManager(storeId);
  if (!auth.ok) return auth;

  const result = await listMyStorePayoutDestinations(auth.supabase, storeId);
  if (!result.ok) {
    return { ok: false as const, message: result.message };
  }
  const safe = {
    ok: true as const,
    destinations: result.destinations.map(projectSafeDestination),
  };
  if (!assertNoSensitiveActionPayload(safe)) {
    return {
      ok: false as const,
      message: "Destination list response is unsafe.",
    };
  }
  return safe;
}

export type RequestSellerLivePayoutActionInput = {
  storeId: string;
  paymentAttemptId: string;
  destinationId: string;
  orchestrationKey: string;
  /** Optional assertion only — never money authority. */
  expectedCurrency?: string;
};

/**
 * Seller live payout request — identifiers only.
 * Trusted amount/currency come from server-side capture context inside S4.
 */
export async function requestSellerLivePayoutAction(
  input: RequestSellerLivePayoutActionInput
) {
  const bag = { ...(input as Record<string, unknown>) };
  if (Object.prototype.hasOwnProperty.call(bag, "currency")) {
    return {
      ok: false as const,
      message:
        "Client must not supply currency as money authority to live payout requests.",
    };
  }
  const money = rejectClientLivePayoutActionFields(bag);
  if (!money.ok) return { ok: false as const, message: money.message };

  const auth = await requireSellerOwnerOrManager(input.storeId);
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

  // Pass identifiers only — never client money fields.
  const orchestrated = await orchestrateSellerLivePayoutSubmit(
    service.supabase,
    {
      storeId: input.storeId,
      paymentAttemptId: input.paymentAttemptId,
      destinationId: input.destinationId,
      orchestrationKey: input.orchestrationKey,
      expectedCurrency: input.expectedCurrency,
    }
  );

  const safe = projectSafeOrchestratorResult(orchestrated);
  if (!assertNoSensitiveActionPayload(safe)) {
    return {
      ok: false as const,
      message: "Payout response is unsafe.",
    };
  }
  if (safe.ok) {
    revalidateSellerPayoutSurfaces();
  }
  return safe;
}
