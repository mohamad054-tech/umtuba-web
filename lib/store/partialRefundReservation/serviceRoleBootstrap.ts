/**
 * Server-only service-role bootstrap for partial-refund reservation actions.
 * Never imported from client components. Never exposes the secret.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createPartialRefundLedgerRpcPort,
  ServiceRolePartialRefundLedgerRepository,
} from "../partialRefundLedger";
import { assertNotBrowser } from "../partialRefundLedger/rpcClient";

type AnyClient = SupabaseClient;

export type ServiceRoleBootstrapResult =
  | {
      ok: true;
      supabase: AnyClient;
      repository: ServiceRolePartialRefundLedgerRepository;
    }
  | { ok: false; code: "unsupported"; message: string };

/**
 * Create a privileged Supabase client + ledger repository from server env.
 * Fails closed when service role is unavailable.
 */
export function createPartialRefundReservationServiceRole(): ServiceRoleBootstrapResult {
  assertNotBrowser();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return {
      ok: false,
      code: "unsupported",
      message: "Partial-refund reservation is unavailable (server configuration).",
    };
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rpc = createPartialRefundLedgerRpcPort(async (fn, args) =>
    supabase.rpc(fn, args)
  );
  return {
    ok: true,
    supabase,
    repository: new ServiceRolePartialRefundLedgerRepository(rpc),
  };
}
